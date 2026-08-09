-- Public order tracking ("Track your order", customer-facing).
-- Anon has NO SELECT on orders (RLS, migration 010/027), so tracking can't read
-- the table directly. This SECURITY DEFINER function returns only the safe,
-- customer-entered fields for ONE order — and ONLY when the delivery contact
-- number matches, so an order number alone can't reveal anyone's details.
-- Returns null when the number/phone pair doesn't match. Phone is compared in
-- E.164 form (the client normalises before calling; create_order stores it
-- normalised too), so formats can't cause a false miss.

-- Drop the earlier single-arg version if it was applied before this change.
drop function if exists lookup_order(int);

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
    'is_gift', v_order.is_gift,
    'recipient_name', v_order.recipient_name,
    'recipient_phone', v_order.recipient_phone,
    'items', v_items
  );
end;
$$;

grant execute on function lookup_order(int, text) to anon, authenticated;
