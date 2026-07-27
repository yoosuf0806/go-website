-- 024_gift_recipient.sql
-- "Is this a gift?" toggle on checkout (spec: new Recipient Information card,
-- shown only when the order is a gift). Recipient name/phone are separate from
-- the orderer's own contact fields — the person paying isn't necessarily the
-- person receiving. All three are nullable/optional; existing orders are
-- unaffected (is_gift defaults false).

alter table orders
  add column if not exists is_gift boolean not null default false,
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text;

drop function if exists create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb, text, numeric
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
  p_recipient_phone text default null
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
    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone
  )
  values (
    p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
    p_address, p_delivery_date, p_note,
    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null,
    v_code, coalesce(p_voucher_discount, 0),
    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, '')
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
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
  text, numeric, boolean, text, text
) to anon, authenticated;
