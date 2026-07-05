-- 011_hardening.sql
-- Post-review hardening (PR #1):
--   1. create_order() RPC — atomic order + items insert that returns order_no.
--      The storefront runs as anon, which (correctly) has NO public SELECT on
--      orders, so `insert ... returning order_no` cannot read the number back.
--      A SECURITY DEFINER function both returns order_no AND makes the two
--      inserts atomic (no orphaned order if the items insert fails).
--   2. Tighten anon writes: orders are now created ONLY through the RPC, so the
--      direct public INSERT policies on orders/order_items are removed. The
--      public inquiries INSERT is constrained to new, unlinked rows.
--   3. Add the missing FK orders.inquiry_id -> inquiries(id).

-- ── 1. Atomic order-create RPC ──────────────────────────────────────────────
create or replace function create_order(
  p_customer_name text,
  p_phone text,
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
    customer_name, phone, address, delivery_date, note,
    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id
  )
  values (
    p_customer_name, p_phone, p_address, p_delivery_date, p_note,
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
  text, text, text, date, text, numeric, numeric, numeric, int, jsonb
) to anon, authenticated;

-- ── 2. Tighten anon writes ──────────────────────────────────────────────────
-- Orders are created only through create_order() now, so anon needs no direct
-- INSERT on the tables. (Admins keep full access via the existing ALL policy.)
drop policy if exists "public create order" on orders;
drop policy if exists "public create order items" on order_items;

-- Inquiries are still inserted directly by the storefront, but constrain anon
-- inserts to genuinely new, unlinked rows.
drop policy if exists "public create inquiry" on inquiries;
create policy "public create inquiry" on inquiries
  for insert
  with check (status = 'new' and converted_order_id is null);

-- ── 3. Enforce the order -> inquiry link ────────────────────────────────────
alter table orders
  add constraint orders_inquiry_id_fkey
  foreign key (inquiry_id) references inquiries(id) on delete set null;
