-- 050_build_your_own_box.sql
--
-- "Make your own box" — a 15-piece box the customer fills with any mix of
-- flavours. Price = Σ (flavour price_per_piece × count) across the box.
--
-- Two schema additions:
--   1. products.is_build_your_own — an admin-selected subset of products that
--      may be picked as flavours in the builder. Independent of every other
--      flag; a product can be a build-your-own flavour and still be sold
--      normally. Managed from the admin product form.
--   2. order_items.box_items — the durable composition of a build-your-own box
--      line: a JSON array of {product_id, name, count, price_per_piece}. NULL
--      for every normal / slab line. Lets admin + kitchen see exactly what went
--      into the box ("5× Cashew, 6× Naked, 4× Blondie") long after checkout,
--      even if a flavour is later renamed or removed.
--
-- create_order() is extended (body only — the 21-arg signature is unchanged, so
-- `create or replace` replaces it in place and never adds an ambiguous overload,
-- per the RPC-signature rule in CLAUDE.md) to price and store a box line. A box
-- item in p_items looks like:
--     { "box": true, "product_name": "Make Your Own Box (15 pcs)",
--       "box_qty": 1, "addons": [...],
--       "box_items": [ { "product_id": "…", "count": 5 }, … ] }
-- The server re-derives the box price from the catalogue (only is_build_your_own
-- + is_visible products count) and REQUIRES the piece total to be exactly 15,
-- raising PRICE_MISMATCH otherwise — so, like every other line, the price and
-- the composition rule are enforced server-side, never trusted from the client.
--
-- Idempotent: safe to re-run.

alter table products
  add column if not exists is_build_your_own boolean not null default false;

comment on column products.is_build_your_own is
  'When true this product can be chosen as a flavour in the "Make your own box" '
  '(15pc) builder. Admin-managed; independent of every other product flag.';

alter table order_items
  add column if not exists box_items jsonb;

comment on column order_items.box_items is
  'Composition of a "Make your own box" line: JSON array of '
  '{product_id, name, count, price_per_piece}. NULL for normal and slab lines.';

-- ── create_order(): add the build-your-own box branch ───────────────────────
create or replace function create_order(
  p_customer_name text,
  p_phone text,
  p_email text,
  p_alt_phone text,
  p_address text,
  p_delivery_date date,
  p_note text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_total_pieces int,
  p_items jsonb,
  p_voucher_code text default null,
  p_voucher_discount numeric default 0,
  p_is_gift boolean default false,
  p_recipient_name text default null,
  p_recipient_phone text default null,
  p_payment_method text default null,
  p_payment_ref text default null,
  p_slip_url text default null,
  p_delivery_slot text default null
)
returns table (id uuid, order_no int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_order_no int;
  v_code text := nullif(upper(trim(coalesce(p_voucher_code, ''))), '');
  v_voucher gift_vouchers%rowtype;
  v_now timestamptz := now();
  v_item jsonb;
  v_prod_id uuid;
  v_pp numeric;
  v_is_slab boolean;
  v_flavors jsonb;
  v_flavor_price numeric;
  v_label text;
  v_pc int;
  v_pack_price numeric;   -- whole-pack override (product_package_price); null = per piece
  v_line_base numeric;    -- the product portion of a line before add-ons
  v_addons_sum numeric;
  v_box int;
  v_calc_subtotal numeric := 0;
  v_calc_pieces int := 0;
  v_has_slab boolean := false;
  v_delivery_fee numeric := 0;
  v_base_fee numeric := 0;
  v_discount numeric := 0;
  v_calc_total numeric;
  v_is_box boolean;
  v_box_price numeric;    -- Σ flavour price_per_piece × count for a box line
  v_box_pieces int;       -- Σ counts in a box (must be exactly 15)
  v_box_items jsonb;      -- resolved composition stored on the order item
  v_box_label text;       -- generated "5× Cashew, 6× Naked" summary
  v_payment_status text := case
    when p_payment_method = 'bank_transfer' then 'awaiting_verification'
    else 'unpaid'
  end;
begin
  if v_code is not null then
    select * into v_voucher from gift_vouchers where code = v_code for update;
    if not found or not v_voucher.is_active then
      raise exception 'VOUCHER_INVALID';
    end if;
    -- Single-use codes can only be redeemed once; reusable promo codes skip this.
    if not v_voucher.is_reusable and v_voucher.used_at is not null then
      raise exception 'VOUCHER_USED';
    end if;
    -- Validity window (same logic as validate_gift_voucher).
    if (v_voucher.valid_from  is not null and v_now <  v_voucher.valid_from) or
       (v_voucher.valid_until is not null and v_now >= v_voucher.valid_until) then
      raise exception 'VOUCHER_EXPIRED';
    end if;
  end if;

  -- Pass 1: recompute subtotal + piece count from trusted catalogue rows.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_addons_sum := 0;
    select coalesce(sum(a.price), 0) into v_addons_sum
      from jsonb_array_elements(coalesce(v_item->'addons', '[]'::jsonb)) as ai
      join addons a on a.id = ai->>'id' and a.is_enabled = true;

    v_box := coalesce((v_item->>'box_qty')::int, 1);
    if v_box < 1 then
      raise exception 'PRICE_MISMATCH';
    end if;

    v_is_box := coalesce((v_item->>'box')::boolean, false);
    if v_is_box then
      -- Build-your-own box: price from is_build_your_own flavours only; the box
      -- must total exactly 15 pieces or the request is rejected.
      select coalesce(sum(p.price_per_piece * c.count), 0), coalesce(sum(c.count), 0)
        into v_box_price, v_box_pieces
        from jsonb_to_recordset(coalesce(v_item->'box_items', '[]'::jsonb))
          as c(product_id uuid, count int)
        join products p on p.id = c.product_id
          and p.is_visible = true
          and coalesce(p.is_build_your_own, false) = true;
      if coalesce(v_box_pieces, 0) <> 15 then
        raise exception 'PRICE_MISMATCH';
      end if;
      v_calc_subtotal := v_calc_subtotal + (v_box_price + v_addons_sum) * v_box;
      v_calc_pieces := v_calc_pieces + v_box_pieces * v_box;
      continue;
    end if;

    select products.price_per_piece, coalesce(products.is_slab_product, false), coalesce(products.flavors, '[]'::jsonb)
      into v_pp, v_is_slab, v_flavors
      from products
      where products.id = nullif(v_item->>'product_id', '')::uuid and products.is_visible = true;
    if not found then
      raise exception 'PRICE_MISMATCH';
    end if;

    if v_is_slab then
      v_label := v_item->>'package_label';
      select (f->>'price')::numeric into v_flavor_price
        from jsonb_array_elements(v_flavors) as f
        where f->>'name' = v_label
        limit 1;
      if v_flavor_price is null then
        raise exception 'PRICE_MISMATCH';
      end if;
      v_calc_subtotal := v_calc_subtotal + (v_flavor_price + v_addons_sum) * v_box;
      v_has_slab := true;
    else
      select packages.piece_count into v_pc
        from packages
        where packages.id = v_item->>'package_id' and packages.is_active = true;
      if v_pc is null then
        raise exception 'PRICE_MISMATCH';
      end if;
      -- Whole-pack override, if any: a flat price for this product×package
      -- instead of price_per_piece × piece_count. No row = per piece.
      select ppp.price into v_pack_price
        from product_package_price ppp
        where ppp.product_id = nullif(v_item->>'product_id', '')::uuid
          and ppp.package_id = v_item->>'package_id';
      v_line_base := coalesce(v_pack_price, v_pp * v_pc);
      v_calc_subtotal := v_calc_subtotal + (v_line_base + v_addons_sum) * v_box;
      v_calc_pieces := v_calc_pieces + v_pc * v_box;
    end if;
  end loop;

  if v_calc_pieces <= 0 and not v_has_slab then
    raise exception 'PRICE_MISMATCH';
  end if;

  select coalesce(dt.fee, 0) into v_delivery_fee
    from delivery_tiers dt
    where v_calc_pieces >= dt.min_pieces
      and (dt.max_pieces is null or v_calc_pieces <= dt.max_pieces)
    order by dt.min_pieces desc
    limit 1;
  v_delivery_fee := coalesce(v_delivery_fee, 0);

  -- A cart with any slab always pays at least the base delivery tier.
  if v_has_slab then
    select coalesce(dt.fee, 0) into v_base_fee
      from delivery_tiers dt
      where 1 >= dt.min_pieces
        and (dt.max_pieces is null or 1 <= dt.max_pieces)
      order by dt.min_pieces desc
      limit 1;
    if v_base_fee > v_delivery_fee then
      v_delivery_fee := v_base_fee;
    end if;
  end if;

  if v_code is not null then
    if v_voucher.discount_type = 'percent' then
      v_discount := round((v_calc_subtotal + v_delivery_fee) * coalesce(v_voucher.amount, 0) / 100);
    else
      v_discount := coalesce(v_voucher.amount, 0);
    end if;
  end if;

  v_calc_total := greatest(0, v_calc_subtotal + v_delivery_fee - v_discount);

  if abs(coalesce(p_total, 0) - v_calc_total) > 0.01 then
    raise exception 'PRICE_MISMATCH';
  end if;

  insert into orders (
    customer_name, phone, email, alt_phone, address, delivery_date, delivery_slot, note,
    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id,
    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone,
    payment_method, payment_status, payment_ref, slip_url
  )
  values (
    p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
    p_address, p_delivery_date, nullif(p_delivery_slot, ''), p_note,
    v_calc_subtotal, v_delivery_fee, v_calc_total, v_calc_pieces, 'pending', 'web', null,
    v_code, v_discount,
    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, ''),
    p_payment_method, v_payment_status, nullif(p_payment_ref, ''), nullif(p_slip_url, '')
  )
  returning orders.id, orders.order_no into v_id, v_order_no;

  -- Only single-use codes are stamped consumed; reusable promo codes stay open.
  if v_code is not null and not v_voucher.is_reusable then
    update gift_vouchers
      set used_at = now(), used_by_order_id = v_id
      where code = v_code;
  end if;

  -- Pass 2: insert order_items with server-recomputed money. `products.*` is
  -- qualified so bare `id` never collides with the RETURNS TABLE `id` column.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_addons_sum := 0;
    select coalesce(sum(a.price), 0) into v_addons_sum
      from jsonb_array_elements(coalesce(v_item->'addons', '[]'::jsonb)) as ai
      join addons a on a.id = ai->>'id' and a.is_enabled = true;

    v_box := greatest(1, coalesce((v_item->>'box_qty')::int, 1));
    v_is_box := coalesce((v_item->>'box')::boolean, false);

    if v_is_box then
      -- Recompute the box price + resolve the composition (names + prices) for
      -- durable admin/kitchen display.
      select coalesce(sum(p.price_per_piece * c.count), 0),
             coalesce(sum(c.count), 0),
             jsonb_agg(jsonb_build_object(
               'product_id', p.id, 'name', p.name,
               'count', c.count, 'price_per_piece', p.price_per_piece
             ) order by p.name),
             string_agg(c.count::text || '× ' || p.name, ', ' order by p.name)
        into v_box_price, v_box_pieces, v_box_items, v_box_label
        from jsonb_to_recordset(coalesce(v_item->'box_items', '[]'::jsonb))
          as c(product_id uuid, count int)
        join products p on p.id = c.product_id
          and p.is_visible = true
          and coalesce(p.is_build_your_own, false) = true;

      insert into order_items (
        order_id, product_id, product_name, package_id, package_label,
        piece_count, box_qty, unit_price, addons, line_total, box_items
      )
      values (
        v_id, null,
        coalesce(nullif(v_item->>'product_name', ''), 'Make Your Own Box (15 pcs)'),
        null, coalesce(v_box_label, ''),
        v_box_pieces, v_box, v_box_price, coalesce(v_item->'addons', '[]'::jsonb),
        (v_box_price + v_addons_sum) * v_box, v_box_items
      );
      continue;
    end if;

    select products.id, products.price_per_piece, coalesce(products.is_slab_product, false), coalesce(products.flavors, '[]'::jsonb)
      into v_prod_id, v_pp, v_is_slab, v_flavors
      from products
      where products.id = nullif(v_item->>'product_id', '')::uuid and products.is_visible = true;

    v_box := greatest(1, coalesce((v_item->>'box_qty')::int, 1));

    if v_is_slab then
      v_label := v_item->>'package_label';
      select (f->>'price')::numeric into v_flavor_price
        from jsonb_array_elements(v_flavors) as f
        where f->>'name' = v_label
        limit 1;
      insert into order_items (
        order_id, product_id, product_name, package_id, package_label,
        piece_count, box_qty, unit_price, addons, line_total
      )
      values (
        v_id, v_prod_id, v_item->>'product_name', null, v_label,
        0, v_box, v_flavor_price, coalesce(v_item->'addons', '[]'::jsonb),
        (v_flavor_price + v_addons_sum) * v_box
      );
    else
      select packages.piece_count into v_pc
        from packages
        where packages.id = v_item->>'package_id' and packages.is_active = true;
      -- Whole-pack override for this product×package, if set.
      select ppp.price into v_pack_price
        from product_package_price ppp
        where ppp.product_id = v_prod_id and ppp.package_id = v_item->>'package_id';
      v_line_base := coalesce(v_pack_price, v_pp * v_pc);
      -- unit_price stores the pack price when whole-pack, else the per-piece
      -- rate. Displays read line_total (not unit_price × piece_count), so this
      -- stays consistent either way.
      insert into order_items (
        order_id, product_id, product_name, package_id, package_label,
        piece_count, box_qty, unit_price, addons, line_total
      )
      values (
        v_id, v_prod_id, v_item->>'product_name', v_item->>'package_id', v_item->>'package_label',
        v_pc, v_box, coalesce(v_pack_price, v_pp), coalesce(v_item->'addons', '[]'::jsonb),
        (v_line_base + v_addons_sum) * v_box
      );
    end if;
  end loop;

  return query select v_id, v_order_no;
end;
$$;

grant execute on function create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
  text, numeric, boolean, text, text, text, text, text, text
) to anon, authenticated;
