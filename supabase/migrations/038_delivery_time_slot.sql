-- 038_delivery_time_slot.sql
--
-- Delivery time slots. Until now an order carried only a delivery DATE, so the
-- kitchen/admin/ops schedule views had no time to sort or group by. Customers
-- now pick a slot at checkout alongside the date.
--
-- Slots are stored as stable codes, not display text, so the wording can be
-- reworded in the UI without a data migration and so they sort chronologically:
--   '10-11' -> 10:00 - 11:00 AM
--   '16-18' -> 4:00 - 6:00 PM
-- Nullable: every order placed BEFORE this migration has no slot, and admin
-- created / inquiry-converted orders may legitimately have none.
--
-- create_order() gains a trailing p_delivery_slot parameter. It has to be the
-- LAST parameter because it carries a default -- Postgres requires defaulted
-- parameters to follow non-defaulted ones. Adding a parameter changes the
-- function's signature, which `create or replace` cannot do (it would create a
-- second overload and make PostgREST calls ambiguous), so the old 20-argument
-- version is dropped first.
--
-- Idempotent: safe to re-run.

-- Stable codes; the check keeps typos out while still allowing NULL.
alter table orders add column if not exists delivery_slot text;

alter table orders drop constraint if exists orders_delivery_slot_check;
alter table orders add constraint orders_delivery_slot_check
  check (delivery_slot is null or delivery_slot in ('10-11', '16-18'));

-- Schedule views read "everything due on/after a date, ordered by slot".
create index if not exists orders_delivery_schedule_idx
  on orders (delivery_date, delivery_slot);

-- Drop the previous 20-argument signature before recreating with 21.
drop function if exists create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
  text, numeric, boolean, text, text, text, text, text
);

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
  -- New in 038: customer-chosen delivery time slot ('10-11' | '16-18').
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
      v_calc_subtotal := v_calc_subtotal + (v_pp * v_pc + v_addons_sum) * v_box;
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

  if v_code is not null then
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
  text, numeric, boolean, text, text, text, text, text, text
) to anon, authenticated;

-- ── lookup_order(): expose the slot to the customer tracking page ───────────
-- "Track your order" reads through this SECURITY DEFINER function (anon has no
-- SELECT on orders), so the slot has to be added to its payload or the page
-- can never show the delivery time. Same signature, so a plain replace works.
create or replace function lookup_order(p_order_no int, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_items jsonb;
begin
  select * into v_order
  from orders
  where order_no = p_order_no and phone = p_phone;
  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_name', oi.product_name,
        'package_label', oi.package_label,
        'piece_count', oi.piece_count,
        'box_qty', oi.box_qty
      )
      order by oi.id
    ),
    '[]'::jsonb
  )
  into v_items
  from order_items oi
  where oi.order_id = v_order.id;

  return jsonb_build_object(
    'order_no', v_order.order_no,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'customer_name', v_order.customer_name,
    'phone', v_order.phone,
    'address', v_order.address,
    'delivery_date', v_order.delivery_date,
    'delivery_slot', v_order.delivery_slot,
    'is_gift', v_order.is_gift,
    'recipient_name', v_order.recipient_name,
    'recipient_phone', v_order.recipient_phone,
    'items', v_items
  );
end;
$$;

grant execute on function lookup_order(int, text) to anon, authenticated;
