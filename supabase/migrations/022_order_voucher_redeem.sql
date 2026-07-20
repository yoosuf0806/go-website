-- 022_order_voucher_redeem.sql
-- Redeem a gift voucher atomically as part of order creation, so a race
-- between two checkouts using the same code can't both succeed (the client
-- already validated the code via validate_gift_voucher() for UX, but that
-- read is not itself a lock — the actual redemption + the order insert must
-- happen in one transaction). `select ... for update` locks the voucher row
-- for the duration of this call, so a concurrent redemption blocks until this
-- one commits (and then correctly sees it as already used).
--
-- orders gains voucher_code/voucher_discount for the record; the discount is
-- already reflected in p_total by the caller (single source of pricing math
-- stays in src/lib/pricing.ts) — this function only redeems + records it.

alter table orders
  add column if not exists voucher_code text,
  add column if not exists voucher_discount numeric(10,2) not null default 0;

drop function if exists create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb
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
  p_voucher_discount numeric default 0
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

  insert into orders (
    customer_name, phone, email, alt_phone, address, delivery_date, note,
    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id,
    voucher_code, voucher_discount
  )
  values (
    p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
    p_address, p_delivery_date, p_note,
    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null,
    v_code, coalesce(p_voucher_discount, 0)
  )
  returning orders.id, orders.order_no into v_id, v_order_no;

  if v_code is not null then
    update gift_vouchers
      set used_at = now(), used_by_order_id = v_id
      where code = v_code;
  end if;

  insert into order_items (
    order_id, product_id, product_name, package_id, package_label,
    piece_count, box_qty, unit_price, addons, line_total
  )
  select
    v_id,
    nullif(item->>'product_id', '')::uuid,
    item->>'product_name',
    item->>'package_id',
    item->>'package_label',
    (item->>'piece_count')::int,
    (item->>'box_qty')::int,
    (item->>'unit_price')::numeric,
    coalesce(item->'addons', '[]'::jsonb),
    (item->>'line_total')::numeric
  from jsonb_array_elements(p_items) as item;

  return query select v_id, v_order_no;
end;
$$;

grant execute on function create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb, text, numeric
) to anon, authenticated;
