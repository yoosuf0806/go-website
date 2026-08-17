-- 034_slab_products.sql
--
-- Brownie Slabs become their own standalone products instead of a package
-- (size) option on normal brownies.
--
--   1. products.is_slab_product  — marks a standalone slab product. It is
--      priced PER PRODUCT via `flavors`, not per piece, and the storefront
--      shows a "Choose your flavour" selector instead of a package picker.
--   2. products.flavors          — a JSONB array of { name, price } the admin
--      defines per slab product; the customer picks one and its flat price is
--      the line price.
--   3. order_items.package_id     — now NULLable: a slab line has no package.
--      The chosen flavour is stored in package_label; piece_count is 0.
--   4. The old slab packages (slab-12 / slab-15) are retired (is_active =
--      false). They stay as rows so historical order_items still resolve, but
--      they no longer appear as selectable packages or in the price RPC. The
--      per-product slab flags (is_slab_available / is_slab_15_available) are
--      left in place for historical data but are no longer set by the admin UI.
--   5. create_order() is rewritten to price slab lines from the product's
--      flavours (flat price, 0 pieces) while a cart containing any slab pays at
--      least the base delivery tier. Regular lines are unchanged.
--
-- Idempotent: safe to re-run.

-- ── 1–2. Product columns ─────────────────────────────────────────────────────
alter table products
  add column if not exists is_slab_product boolean not null default false;
alter table products
  add column if not exists flavors jsonb not null default '[]'::jsonb;

comment on column products.is_slab_product is
  'Standalone Brownie Slab product — priced per product via `flavors`, flavour selector on the PDP.';
comment on column products.flavors is
  'Slab flavours: JSONB array of { "name": text, "price": number }. Empty for non-slab products.';

-- ── 3. order_items.package_id nullable (slab lines have no package) ──────────
alter table order_items
  alter column package_id drop not null;

-- ── 4. Retire the old slab packages ─────────────────────────────────────────
update packages set is_active = false where id in ('slab-12', 'slab-15');

-- ── 5. create_order(): price integrity with slab support ────────────────────
-- Same 20-arg signature as migration 027 (the storefront call is unchanged).
-- Client money fields are a CLAIM: we recompute the authoritative figures from
-- trusted product / package / addon / flavour / delivery-tier / voucher rows,
-- store those, and reject if the client's grand total disagrees.
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
  p_slip_url text default null
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
  v_item jsonb;
  v_prod_id uuid;
  v_pp numeric;
  v_is_slab boolean;
  v_flavors jsonb;
  v_flavor_price numeric;
  v_label text;
  v_pc int;
  v_addons_sum numeric;
  v_box int;
  v_calc_subtotal numeric := 0;
  v_calc_pieces int := 0;
  v_has_slab boolean := false;
  v_delivery_fee numeric := 0;
  v_base_fee numeric := 0;
  v_discount numeric := 0;
  v_calc_total numeric;
  v_payment_status text := case
    when p_payment_method = 'bank_transfer' then 'awaiting_verification'
    else 'unpaid'
  end;
begin
  -- Validate + lock the voucher first (its amount is the trusted discount).
  if v_code is not null then
    select * into v_voucher from gift_vouchers where code = v_code for update;
    if not found or not v_voucher.is_active then
      raise exception 'VOUCHER_INVALID';
    end if;
    if v_voucher.used_at is not null then
      raise exception 'VOUCHER_USED';
    end if;
    v_discount := coalesce(v_voucher.amount, 0);
  end if;

  -- Pass 1: recompute subtotal + piece count from trusted catalogue rows.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select price_per_piece, coalesce(is_slab_product, false), coalesce(flavors, '[]'::jsonb)
      into v_pp, v_is_slab, v_flavors
      from products
      where products.id = nullif(v_item->>'product_id', '')::uuid and is_visible = true;
    if not found then
      raise exception 'PRICE_MISMATCH';
    end if;

    -- Addon prices come from the addons table, never the client payload.
    select coalesce(sum(a.price), 0) into v_addons_sum
      from jsonb_array_elements(coalesce(v_item->'addons', '[]'::jsonb)) as ai
      join addons a on a.id = ai->>'id' and a.is_enabled = true;

    v_box := coalesce((v_item->>'box_qty')::int, 1);
    if v_box < 1 then
      raise exception 'PRICE_MISMATCH';
    end if;

    if v_is_slab then
      -- Slab: flat price from the chosen flavour (label carries the name).
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
      -- Normal: per-piece price × the package's piece count.
      select piece_count into v_pc
        from packages
        where packages.id = v_item->>'package_id' and is_active = true;
      if v_pc is null then
        raise exception 'PRICE_MISMATCH';
      end if;
      v_calc_subtotal := v_calc_subtotal + (v_pp * v_pc + v_addons_sum) * v_box;
      v_calc_pieces := v_calc_pieces + v_pc * v_box;
    end if;
  end loop;

  -- Reject an empty cart (no pieces AND no slabs).
  if v_calc_pieces <= 0 and not v_has_slab then
    raise exception 'PRICE_MISMATCH';
  end if;

  -- Delivery fee: the tier matching the combined piece count …
  select coalesce(fee, 0) into v_delivery_fee
    from delivery_tiers
    where v_calc_pieces >= min_pieces
      and (max_pieces is null or v_calc_pieces <= max_pieces)
    order by min_pieces desc
    limit 1;
  v_delivery_fee := coalesce(v_delivery_fee, 0);

  -- … but a cart with any slab pays at least the base (1-piece) tier.
  if v_has_slab then
    select coalesce(fee, 0) into v_base_fee
      from delivery_tiers
      where 1 >= min_pieces and (max_pieces is null or 1 <= max_pieces)
      order by min_pieces desc
      limit 1;
    v_base_fee := coalesce(v_base_fee, 0);
    if v_base_fee > v_delivery_fee then
      v_delivery_fee := v_base_fee;
    end if;
  end if;

  v_calc_total := greatest(0, v_calc_subtotal + v_delivery_fee - v_discount);

  -- Reject tampered (or stale-snapshot) client totals.
  if abs(coalesce(p_total, 0) - v_calc_total) > 0.01 then
    raise exception 'PRICE_MISMATCH';
  end if;

  -- Store the SERVER-computed figures, not the client's.
  insert into orders (
    customer_name, phone, email, alt_phone, address, delivery_date, note,
    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id,
    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone,
    payment_method, payment_status, payment_ref, slip_url
  )
  values (
    p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
    p_address, p_delivery_date, p_note,
    v_calc_subtotal, v_delivery_fee, v_calc_total, v_calc_pieces, 'pending', 'web', null,
    v_code, v_discount,
    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, ''),
    p_payment_method, v_payment_status, nullif(p_payment_ref, ''), nullif(p_slip_url, '')
  )
  returning orders.id, orders.order_no into v_id, v_order_no;

  if v_code is not null then
    update gift_vouchers
      set used_at = now(), used_by_order_id = v_id
      where code = v_code;
  end if;

  -- Pass 2: insert order_items with server-recomputed money. Slab lines store a
  -- NULL package_id, the flavour name in package_label, 0 pieces and the flat
  -- flavour price; normal lines store the package + per-piece price.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, price_per_piece, coalesce(is_slab_product, false), coalesce(flavors, '[]'::jsonb)
      into v_prod_id, v_pp, v_is_slab, v_flavors
      from products
      where products.id = nullif(v_item->>'product_id', '')::uuid and is_visible = true;

    select coalesce(sum(a.price), 0) into v_addons_sum
      from jsonb_array_elements(coalesce(v_item->'addons', '[]'::jsonb)) as ai
      join addons a on a.id = ai->>'id' and a.is_enabled = true;

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
      select piece_count into v_pc
        from packages
        where packages.id = v_item->>'package_id' and is_active = true;
      insert into order_items (
        order_id, product_id, product_name, package_id, package_label,
        piece_count, box_qty, unit_price, addons, line_total
      )
      values (
        v_id, v_prod_id, v_item->>'product_name', v_item->>'package_id', v_item->>'package_label',
        v_pc, v_box, v_pp, coalesce(v_item->'addons', '[]'::jsonb),
        (v_pp * v_pc + v_addons_sum) * v_box
      );
    end if;
  end loop;

  return query select v_id, v_order_no;
end;
$$;

grant execute on function create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
  text, numeric, boolean, text, text, text, text, text
) to anon, authenticated;
