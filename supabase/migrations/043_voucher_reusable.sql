-- 043_voucher_reusable.sql
-- Per-voucher "reusable" flag: turns a gift_vouchers row into an unlimited-use
-- promo/discount code instead of a single-use gift voucher.
--
--   • is_reusable = false (default) — the existing behaviour: the code can be
--     redeemed once; create_order() stamps used_at and validate_gift_voucher()
--     reports 'used' afterwards.
--   • is_reusable = true            — the code never records used_at and can be
--     redeemed any number of times (subject to is_active and the optional
--     valid_from/valid_until window from migration 042).
--
-- validate_gift_voucher() and create_order() only skip the used-once checks;
-- everything else (active flag, validity window, percent/fixed maths, price
-- re-derivation) is unchanged.
--
-- create_order() keeps the EXACT 21-argument signature from
-- 042_voucher_validity_window.sql (…, p_slip_url, p_delivery_slot); the whole
-- body is reproduced verbatim with only the two used-once guards made
-- conditional, so `create or replace` replaces it in place rather than adding
-- an ambiguous overload.
--
-- Idempotent: safe to re-run.

alter table gift_vouchers
  add column if not exists is_reusable boolean not null default false;

comment on column gift_vouchers.is_reusable is
  'When true the code is an unlimited-use promo code: never stamps used_at and can be redeemed repeatedly. When false it is a single-use gift voucher.';

-- ── validate_gift_voucher(): only report 'used' for single-use codes ─────────
drop function if exists validate_gift_voucher(text);
create or replace function validate_gift_voucher(p_code text)
returns table (status text, amount numeric, discount_type text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v gift_vouchers%rowtype;
  v_now timestamptz := now();
begin
  select * into v from gift_vouchers where code = upper(trim(p_code));

  if not found or not v.is_active then
    return query select 'invalid'::text, null::numeric, null::text;
    return;
  end if;

  -- Single-use codes that have already been redeemed are 'used'. Reusable
  -- promo codes skip this check entirely.
  if not v.is_reusable and v.used_at is not null then
    return query select 'used'::text, null::numeric, null::text;
    return;
  end if;

  -- Outside the validity window → 'expired' (covers not-yet-active and past-deadline).
  if (v.valid_from  is not null and v_now <  v.valid_from) or
     (v.valid_until is not null and v_now >= v.valid_until) then
    return query select 'expired'::text, null::numeric, null::text;
    return;
  end if;

  return query select 'ok'::text, v.amount, v.discount_type;
end;
$$;

grant execute on function validate_gift_voucher(text) to anon, authenticated;

-- ── create_order(): don't block or stamp reusable codes ──────────────────────
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
    select products.price_per_piece, coalesce(products.is_slab_product, false), coalesce(products.flavors, '[]'::jsonb)
      into v_pp, v_is_slab, v_flavors
      from products
      where products.id = nullif(v_item->>'product_id', '')::uuid and products.is_visible = true;
    if not found then
      raise exception 'PRICE_MISMATCH';
    end if;

    select coalesce(sum(a.price), 0) into v_addons_sum
      from jsonb_array_elements(coalesce(v_item->'addons', '[]'::jsonb)) as ai
      join addons a on a.id = ai->>'id' and a.is_enabled = true;

    v_box := coalesce((v_item->>'box_qty')::int, 1);
    if v_box < 1 then
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

  if v_has_slab then
    select coalesce(dt.fee, 0) into v_base_fee
      from delivery_tiers dt
      where 1 >= dt.min_pieces and (dt.max_pieces is null or 1 <= dt.max_pieces)
      order by dt.min_pieces desc
      limit 1;
    v_base_fee := coalesce(v_base_fee, 0);
    if v_base_fee > v_delivery_fee then
      v_delivery_fee := v_base_fee;
    end if;
  end if;

  if v_code is not null then
    if coalesce(v_voucher.discount_type, 'fixed') = 'percent' then
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
    select products.id, products.price_per_piece, coalesce(products.is_slab_product, false), coalesce(products.flavors, '[]'::jsonb)
      into v_prod_id, v_pp, v_is_slab, v_flavors
      from products
      where products.id = nullif(v_item->>'product_id', '')::uuid and products.is_visible = true;

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
