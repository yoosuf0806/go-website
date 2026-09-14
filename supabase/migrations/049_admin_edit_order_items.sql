-- 049_admin_edit_order_items.sql
--
-- Admin manual line-item editing for an order.
--
-- The storefront's create_order() re-derives every figure from the catalogue
-- and refuses a client total that disagrees (PRICE_MISMATCH) — that authority
-- stays exactly where it is for customer checkout. This RPC is a DIFFERENT,
-- admin-only path: it lets the admin OVERRIDE an existing order's lines by hand
-- — change each line's quantity and unit price to ANY number, rename a line,
-- add lines, remove lines — and then recomputes the order's subtotal, total and
-- piece count from those hand-entered figures. This is deliberate: an admin
-- adjusting a confirmed order (a negotiated B2B price, a correction, a freebie)
-- is trusted, whereas an anonymous browser is not.
--
-- Money model for a manually-edited line (kept deliberately simple so the admin
-- UI is unambiguous):
--     line_total   = round(unit_price * box_qty, 2)      -- unit_price is per box
--     total_pieces = sum(piece_count * box_qty)          -- across all lines
--     subtotal     = sum(line_total)
--     total        = max(0, subtotal + delivery_fee - voucher_discount)
-- The existing voucher_discount on the order is preserved; delivery_fee is
-- whatever the admin passes (they can leave it unchanged or override it).
--
-- Existing lines are matched by id and updated in place (so their addons,
-- product_id and package_id snapshots are preserved); lines dropped from the
-- payload are deleted; lines with no id are inserted as new manual lines
-- (product_id/package_id NULL, no addons).
--
-- Security: SECURITY DEFINER, but the FIRST thing it does is assert is_admin()
-- (migration 027). A kitchen or finance user calling it gets NOT_AUTHORIZED —
-- the admin/kitchen split stays enforced in the database, not just the UI.
--
-- Idempotent: safe to re-run (create or replace + explicit grants).

create or replace function admin_update_order_items(
  p_order_id uuid,
  p_items jsonb,
  p_delivery_fee numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_keep uuid[] := array[]::uuid[];
  v_item_id uuid;
  v_box int;
  v_unit numeric;
  v_pieces int;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total_pieces int := 0;
  v_delivery numeric;
  v_discount numeric;
begin
  if not is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (select 1 from orders where id = p_order_id) then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'NO_ITEMS';
  end if;

  -- Collect the ids of existing lines the admin is keeping, so anything else
  -- on this order can be deleted.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := nullif(v_item->>'id', '')::uuid;
    if v_item_id is not null then
      v_keep := array_append(v_keep, v_item_id);
    end if;
  end loop;

  delete from order_items
    where order_id = p_order_id
      and not (id = any (v_keep));

  -- Upsert each line and accumulate the recomputed totals.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := nullif(v_item->>'id', '')::uuid;
    v_box := greatest(1, coalesce((v_item->>'box_qty')::int, 1));
    v_unit := greatest(0, coalesce((v_item->>'unit_price')::numeric, 0));
    v_pieces := greatest(0, coalesce((v_item->>'piece_count')::int, 0));
    v_line_total := round(v_unit * v_box, 2);

    v_subtotal := v_subtotal + v_line_total;
    v_total_pieces := v_total_pieces + v_pieces * v_box;

    if v_item_id is not null and exists (
      select 1 from order_items where id = v_item_id and order_id = p_order_id
    ) then
      update order_items
        set product_name = coalesce(nullif(v_item->>'product_name', ''), product_name),
            package_label = coalesce(v_item->>'package_label', package_label),
            piece_count = v_pieces,
            box_qty = v_box,
            unit_price = v_unit,
            line_total = v_line_total
        where id = v_item_id and order_id = p_order_id;
    else
      insert into order_items (
        order_id, product_id, product_name, package_id, package_label,
        piece_count, box_qty, unit_price, addons, line_total
      )
      values (
        p_order_id, null,
        coalesce(nullif(v_item->>'product_name', ''), 'Item'),
        null, coalesce(v_item->>'package_label', ''),
        v_pieces, v_box, v_unit, '[]'::jsonb, v_line_total
      );
    end if;
  end loop;

  v_delivery := greatest(0, coalesce(p_delivery_fee, 0));
  select coalesce(voucher_discount, 0) into v_discount from orders where id = p_order_id;

  update orders
    set subtotal = v_subtotal,
        delivery_fee = v_delivery,
        total = greatest(0, v_subtotal + v_delivery - v_discount),
        total_pieces = v_total_pieces
    where id = p_order_id;
end;
$$;

revoke execute on function admin_update_order_items(uuid, jsonb, numeric) from public;
grant execute on function admin_update_order_items(uuid, jsonb, numeric) to authenticated;
