-- 035_voucher_percent.sql
--
-- Gift vouchers can now be a PERCENTAGE of the order total, not only a flat LKR
-- amount. A new gift_vouchers.discount_type column selects the mode:
--   • 'fixed'   — amount is a flat LKR discount (existing behaviour).
--   • 'percent' — amount is a percentage (e.g. 10 = 10% off subtotal+delivery).
--
-- The `amount` column carries the value in both cases (LKR for fixed, the
-- percentage for percent). validate_gift_voucher() and create_order() are
-- updated to report / apply the type. As always, create_order() recomputes the
-- discount server-side from the trusted voucher row (never the client payload).
--
-- Idempotent: safe to re-run.

alter table gift_vouchers
  add column if not exists discount_type text not null default 'fixed'
    check (discount_type in ('fixed', 'percent'));

comment on column gift_vouchers.discount_type is
  'fixed = amount is a flat LKR discount; percent = amount is a percentage of (subtotal + delivery).';

-- ── validate_gift_voucher(): also report the discount type ──────────────────
drop function if exists validate_gift_voucher(text);
create or replace function validate_gift_voucher(p_code text)
returns table (status text, amount numeric, discount_type text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v gift_vouchers%rowtype;
begin
  select * into v from gift_vouchers where code = upper(trim(p_code));

  if not found or not v.is_active then
    return query select 'invalid'::text, null::numeric, null::text;
    return;
  end if;

  if v.used_at is not null then
    return query select 'used'::text, null::numeric, null::text;
    return;
  end if;

  return query select 'ok'::text, v.amount, v.discount_type;
end;
$$;

grant execute on function validate_gift_voucher(text) to anon, authenticated;

-- ── create_order(): apply a fixed OR percentage voucher (slab-aware, from 034) ─
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
  -- Validate + lock the voucher first; the discount is computed after the
  -- subtotal/delivery are known (a percentage voucher needs them).
  if v_code is not null then
    select * into v_voucher from gift_vouchers where code = v_code for update;
    if not found or not v_voucher.is_active then
      raise exception 'VOUCHER_INVALID';
    end if;
    if v_voucher.used_at is not null then
      raise exception 'VOUCHER_USED';
    end if;
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

  if v_calc_pieces <= 0 and not v_has_slab then
    raise exception 'PRICE_MISMATCH';
  end if;

  -- Delivery fee: piece tier, but any slab forces at least the base (1pc) tier.
  select coalesce(fee, 0) into v_delivery_fee
    from delivery_tiers
    where v_calc_pieces >= min_pieces
      and (max_pieces is null or v_calc_pieces <= max_pieces)
    order by min_pieces desc
    limit 1;
  v_delivery_fee := coalesce(v_delivery_fee, 0);

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

  -- Voucher discount: fixed LKR, or a percentage of (subtotal + delivery).
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

  -- Pass 2: insert order_items with server-recomputed money.
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
