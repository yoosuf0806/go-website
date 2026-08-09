-- 027_rbac_and_price_integrity.sql
--
-- Security hardening before public launch. Three concerns:
--
--   A. Role separation. Migration 025 introduced a second, lower-trust role
--      (kitchen), but every admin RLS policy still gated on
--      `auth.role() = 'authenticated'` — which is TRUE for kitchen accounts
--      too. A kitchen login could therefore read/modify anything (products,
--      prices, addons, delivery tiers, gift vouchers, site settings) and even
--      promote itself to admin via the profiles table, straight from the
--      Supabase API — the admin/kitchen split lived only in the React UI.
--
--      This migration adds is_admin() and re-gates every write policy on it.
--      Kitchen keeps READ access to orders / order_items (they need customer +
--      order data to bake and deliver) but can no longer write to the
--      catalogue, pricing, voucher, settings or profile tables. Kitchen status
--      changes now go through advance_order_status(), a SECURITY DEFINER RPC
--      restricted to the board's transitions.
--
--   B. Price integrity. create_order() previously trusted the subtotal, delivery
--      fee, line totals and grand total sent by the browser. A tampered request
--      could place a real (bank-transfer / card) order for any amount. The RPC
--      now RECOMPUTES every figure from trusted product / package / addon /
--      delivery-tier / voucher rows, STORES those server-computed values, and
--      rejects the order (PRICE_MISMATCH) if the client's total doesn't match.
--
--   C. Payment confirmation. mark_order_paid() is the only path that sets
--      payment_status = 'paid'. It is executable by the service_role only, so
--      the browser can never mark itself paid — the PayHere notify handler
--      (api/payhere-notify.ts) calls it after verifying the gateway's signature.
--
-- Idempotent: safe to re-run.

-- ── A0. Role helper ─────────────────────────────────────────────────────────
-- SECURITY DEFINER so it reads profiles without tripping RLS (and without
-- recursing into the profiles policies, which themselves call is_admin()).
-- "No profile row" == admin, preserving the project's existing admin accounts
-- that were created before the profiles table existed (kitchen accounts ALWAYS
-- have a row with role='kitchen'). Public sign-ups must stay disabled in
-- Supabase Auth for this default to remain safe.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from profiles where id = auth.uid()) = 'admin',
    auth.uid() is not null
  );
$$;

revoke execute on function is_admin() from public;
grant execute on function is_admin() to anon, authenticated;

-- ── A1. Re-gate every admin write policy on is_admin() ──────────────────────
-- Catalogue / config tables: admins only. Public read policies (defined in
-- earlier migrations) are left untouched.

drop policy if exists "admin all categories" on categories;
create policy "admin all categories" on categories
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all products" on products;
create policy "admin all products" on products
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all packages" on packages;
create policy "admin all packages" on packages
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all addons" on addons;
create policy "admin all addons" on addons
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all delivery tiers" on delivery_tiers;
create policy "admin all delivery tiers" on delivery_tiers
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all settings" on site_settings;
create policy "admin all settings" on site_settings
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all reviews" on reviews;
create policy "admin all reviews" on reviews
  for all using (is_admin()) with check (is_admin());

-- product_package_stock (migration 013)
drop policy if exists "admin all product package stock" on product_package_stock;
create policy "admin all product package stock" on product_package_stock
  for all using (is_admin()) with check (is_admin());

-- gift_vouchers (migration 021)
drop policy if exists "gift_vouchers_admin_all" on gift_vouchers;
create policy "gift_vouchers_admin_all" on gift_vouchers
  for all using (is_admin()) with check (is_admin());

-- profiles (migration 025): only admins may create / edit / delete role rows,
-- so a kitchen account can't promote itself. Self-read stays (profiles_select_own).
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles
  for all using (is_admin()) with check (is_admin());

-- ── A2. Orders / order_items: admin writes, kitchen (and admin) reads ────────
-- Kitchen needs to SEE customer + order data to bake and deliver, so both roles
-- may SELECT. Writes are admin-only; kitchen advances status via the RPC below.

drop policy if exists "admin manage orders" on orders;
create policy "admin manage orders" on orders
  for all using (is_admin()) with check (is_admin());
drop policy if exists "staff read orders" on orders;
create policy "staff read orders" on orders
  for select to authenticated using (true);

drop policy if exists "admin manage order items" on order_items;
create policy "admin manage order items" on order_items
  for all using (is_admin()) with check (is_admin());
drop policy if exists "staff read order items" on order_items;
create policy "staff read order items" on order_items
  for select to authenticated using (true);

-- inquiries: admin-only management (public INSERT policy from 011 stays).
drop policy if exists "admin manage inquiries" on inquiries;
create policy "admin manage inquiries" on inquiries
  for all using (is_admin()) with check (is_admin());

-- ── A3. Kitchen status advance RPC ──────────────────────────────────────────
-- Kitchen has no direct UPDATE on orders. This SECURITY DEFINER function is the
-- only status write it can make, and only to the board's forward transitions.
create or replace function advance_order_status(p_id uuid, p_to order_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  -- Only the transitions the Kitchen Board exposes (KITCHEN_NEXT in
  -- src/lib/kitchenOrders.ts). Everything else remains admin-only.
  if p_to not in ('baking', 'ready', 'completed') then
    raise exception 'INVALID_KITCHEN_STATUS';
  end if;
  update orders set status = p_to, updated_at = now() where id = p_id;
end;
$$;

revoke execute on function advance_order_status(uuid, order_status) from public, anon;
grant execute on function advance_order_status(uuid, order_status) to authenticated;

-- ── B. Price-integrity: recompute create_order() from trusted rows ──────────
-- Same 20-arg signature as migration 026, so the storefront call is unchanged.
-- The client-supplied money fields (p_subtotal, p_delivery_fee, p_total,
-- p_total_pieces, p_voucher_discount) are treated as a CLAIM: we recompute the
-- authoritative figures from the DB, store those, and reject if the client's
-- grand total disagrees (a tampered request — or a browser running a stale
-- catalogue snapshot after a price change; refreshing fixes the latter).
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
  v_pp numeric;
  v_pc int;
  v_addons_sum numeric;
  v_box int;
  v_calc_subtotal numeric := 0;
  v_calc_pieces int := 0;
  v_delivery_fee numeric := 0;
  v_discount numeric := 0;
  v_calc_total numeric;
  v_payment_status text := case
    when p_payment_method = 'bank_transfer' then 'awaiting_verification'
    else 'unpaid'
  end;
begin
  -- Validate + lock the voucher first (its amount is the trusted discount).
  if v_code is not null then
    select * into v_voucher from gift_vouchers where code = v_code for update;
    if not found or not v_voucher.is_active then
      raise exception 'VOUCHER_INVALID';
    end if;
    if v_voucher.used_at is not null then
      raise exception 'VOUCHER_USED';
    end if;
    v_discount := coalesce(v_voucher.amount, 0);
  end if;

  -- Recompute subtotal + piece count from trusted catalogue rows.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select price_per_piece into v_pp
      from products
      where products.id = nullif(v_item->>'product_id', '')::uuid and is_visible = true;
    if v_pp is null then
      raise exception 'PRICE_MISMATCH';
    end if;

    select piece_count into v_pc
      from packages
      where packages.id = v_item->>'package_id' and is_active = true;
    if v_pc is null then
      raise exception 'PRICE_MISMATCH';
    end if;

    -- Addon prices come from the addons table, never the client payload.
    select coalesce(sum(a.price), 0) into v_addons_sum
      from jsonb_array_elements(coalesce(v_item->'addons', '[]'::jsonb)) as ai
      join addons a on a.id = ai->>'id' and a.is_enabled = true;

    v_box := coalesce((v_item->>'box_qty')::int, 1);
    if v_box < 1 then
      raise exception 'PRICE_MISMATCH';
    end if;

    v_calc_subtotal := v_calc_subtotal + (v_pp * v_pc + v_addons_sum) * v_box;
    v_calc_pieces := v_calc_pieces + v_pc * v_box;
  end loop;

  if v_calc_pieces <= 0 then
    raise exception 'PRICE_MISMATCH';
  end if;

  -- Delivery fee: the single tier matching the combined piece count.
  select coalesce(fee, 0) into v_delivery_fee
    from delivery_tiers
    where v_calc_pieces >= min_pieces
      and (max_pieces is null or v_calc_pieces <= max_pieces)
    order by min_pieces desc
    limit 1;
  v_delivery_fee := coalesce(v_delivery_fee, 0);

  v_calc_total := greatest(0, v_calc_subtotal + v_delivery_fee - v_discount);

  -- Reject tampered (or stale-snapshot) client totals.
  if abs(coalesce(p_total, 0) - v_calc_total) > 0.01 then
    raise exception 'PRICE_MISMATCH';
  end if;

  -- Store the SERVER-computed figures, not the client's.
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

  -- Item rows: unit_price / piece_count / line_total all recomputed from the DB;
  -- only the display snapshots (names) and addon detail come from the payload.
  insert into order_items (
    order_id, product_id, product_name, package_id, package_label,
    piece_count, box_qty, unit_price, addons, line_total
  )
  select
    v_id,
    pr.id,
    item->>'product_name',
    pk.id,
    item->>'package_label',
    pk.piece_count,
    greatest(1, coalesce((item->>'box_qty')::int, 1)),
    pr.price_per_piece,
    coalesce(item->'addons', '[]'::jsonb),
    (
      pr.price_per_piece * pk.piece_count
      + coalesce((
          select sum(a.price)
          from jsonb_array_elements(coalesce(item->'addons', '[]'::jsonb)) as ai
          join addons a on a.id = ai->>'id' and a.is_enabled = true
        ), 0)
    ) * greatest(1, coalesce((item->>'box_qty')::int, 1))
  from jsonb_array_elements(p_items) as item
  join products pr on pr.id = nullif(item->>'product_id', '')::uuid
  join packages pk on pk.id = item->>'package_id';

  return query select v_id, v_order_no;
end;
$$;

grant execute on function create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
  text, numeric, boolean, text, text, text, text, text
) to anon, authenticated;

-- ── C. Server-only payment confirmation ─────────────────────────────────────
-- The ONLY path that marks an order paid. Verifies the amount before flipping
-- payment_status, and is callable by the service_role only — never anon /
-- authenticated — so the browser can't self-confirm a payment. The PayHere
-- notify handler (api/payhere-notify.ts) calls this after checking the
-- gateway's md5 signature.
create or replace function mark_order_paid(
  p_order_id uuid,
  p_payment_ref text,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
begin
  select total into v_total from orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if abs(v_total - p_amount) > 0.01 then
    raise exception 'AMOUNT_MISMATCH';
  end if;
  update orders
    set payment_status = 'paid',
        payment_ref = coalesce(p_payment_ref, payment_ref),
        updated_at = now()
    where id = p_order_id;
end;
$$;

revoke execute on function mark_order_paid(uuid, text, numeric) from public, anon, authenticated;
grant execute on function mark_order_paid(uuid, text, numeric) to service_role;

-- ── D. Tighten the public bank-slips bucket ─────────────────────────────────
-- Anon may upload a slip at checkout, but cap size and restrict to image/PDF so
-- it can't be used as an open file host.
update storage.buckets
  set file_size_limit = 5242880,   -- 5 MB
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  where id = 'bank-slips';
