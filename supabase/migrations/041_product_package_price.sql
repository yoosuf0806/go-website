-- 041_product_package_price.sql
-- Per-product-per-package WHOLE-PACK price.
--
-- Until now every non-slab line was priced per piece: line = products.price_per_piece
-- × packages.piece_count. This table lets the admin instead set a fixed price for
-- a specific product×package ("whole pack price"), e.g. the 12-piece box of
-- "Assorted" is a flat LKR 5500 regardless of the per-piece rate.
--
-- It mirrors product_package_stock / product_package_availability exactly:
--   * No row for a product×package  = that combo is priced PER PIECE (the common
--     case, keeping the table small).
--   * A row with price = X          = that combo costs a flat X for the pack
--     (plus any add-ons, × box_qty). Delivery is unchanged — still derived from
--     the pack's piece_count, so a whole-pack line pays the same delivery tier a
--     per-piece line of the same size would.
--
-- Idempotent: safe to re-run.

create table if not exists product_package_price (
  product_id uuid not null references products(id) on delete cascade,
  package_id text not null references packages(id) on delete cascade,
  price numeric not null check (price >= 0),
  primary key (product_id, package_id)
);

comment on table product_package_price is
  'Per product×package whole-pack price overrides. No row = priced per piece (price_per_piece × piece_count). A row exists only when admin has set a flat pack price for that product×package.';

alter table product_package_price enable row level security;

drop policy if exists "public read product package price" on product_package_price;
create policy "public read product package price" on product_package_price
  for select using (true);

drop policy if exists "admin all product package price" on product_package_price;
create policy "admin all product package price" on product_package_price
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── get_catalog(): expose the whole-pack price overrides to the storefront ────
-- Add the new table to the single JSON bundle the storefront reads. Same
-- signature, so a plain replace is fine.
create or replace function get_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'products', coalesce(
      (select jsonb_agg(to_jsonb(p) order by p.sort_order)
         from products p where p.is_visible), '[]'::jsonb),
    'packages', coalesce(
      (select jsonb_agg(to_jsonb(pk) order by pk.sort_order)
         from packages pk where pk.is_active), '[]'::jsonb),
    'addons', coalesce(
      (select jsonb_agg(to_jsonb(a)) from addons a), '[]'::jsonb),
    'categories', coalesce(
      (select jsonb_agg(to_jsonb(c) order by c.sort_order)
         from categories c where c.is_visible), '[]'::jsonb),
    'delivery_tiers', coalesce(
      (select jsonb_agg(to_jsonb(t) order by t.sort_order)
         from delivery_tiers t), '[]'::jsonb),
    'reviews', coalesce(
      (select jsonb_agg(to_jsonb(r)) from reviews r where r.is_featured), '[]'::jsonb),
    'site_settings', coalesce(
      (select jsonb_agg(to_jsonb(s)) from site_settings s), '[]'::jsonb),
    'product_package_stock', coalesce(
      (select jsonb_agg(to_jsonb(ps)) from product_package_stock ps), '[]'::jsonb),
    'product_package_availability', coalesce(
      (select jsonb_agg(to_jsonb(pa)) from product_package_availability pa), '[]'::jsonb),
    'product_package_price', coalesce(
      (select jsonb_agg(to_jsonb(pp)) from product_package_price pp), '[]'::jsonb)
  );
$$;

revoke execute on function get_catalog() from public;
grant execute on function get_catalog() to anon, authenticated;

-- ── create_order(): honour whole-pack prices in the trusted re-derivation ─────
-- The RPC re-derives every figure from catalogue rows and raises PRICE_MISMATCH
-- if the client's total disagrees, so the whole-pack price MUST be applied here
-- too or every whole-pack order would be rejected. The signature is unchanged
-- from 038, so `create or replace` is sufficient (no drop/re-grant needed).
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
