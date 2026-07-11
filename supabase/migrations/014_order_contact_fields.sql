-- 014_order_contact_fields.sql
-- Checkout now collects the customer's email (required) and an optional
-- alternative contact number, alongside the existing phone. Both are stored on
-- the order so the baker/admin has them on the order slip and in the admin
-- Orders view, not just in the one-off WhatsApp message.
--
--   • orders.email      — required at the app layer (nullable in DB so historical
--                         rows and inquiry-conversions without an email still fit)
--   • orders.alt_phone  — optional secondary contact number
--
-- The create_order() RPC gains two params. Postgres overloads by argument
-- signature, so adding params would create a SECOND create_order() rather than
-- replacing the old one — we DROP the old signature first, then recreate with
-- the new one, so there's exactly one create_order().

alter table orders
  add column if not exists email text,
  add column if not exists alt_phone text;

comment on column orders.email is 'Customer email captured at checkout (required at the app layer; nullable here for legacy/inquiry-converted rows).';
comment on column orders.alt_phone is 'Optional secondary contact number captured at checkout.';

-- Replace the RPC with the two extra params. Drop the old 10-arg signature
-- explicitly (create or replace can't change the argument list).
drop function if exists create_order(
  text, text, text, date, text, numeric, numeric, numeric, int, jsonb
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
  p_items jsonb
)
returns table (id uuid, order_no int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_order_no int;
begin
  insert into orders (
    customer_name, phone, email, alt_phone, address, delivery_date, note,
    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id
  )
  values (
    p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
    p_address, p_delivery_date, p_note,
    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null
  )
  returning orders.id, orders.order_no into v_id, v_order_no;

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
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb
) to anon, authenticated;
