-- ============================================================================
-- APPLY_PENDING.sql — run this ONCE in Supabase → SQL Editor.
-- Concatenation of migrations 020, 021, 022, 024, 025, 026, 027 in order.
-- Every statement is idempotent (IF NOT EXISTS / on conflict / or replace),
-- so it is safe even if some were already applied.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- 020_profiles_rls_self_read.sql
-- ─────────────────────────────────────────────────────────────────────────
-- 020_profiles_rls_self_read.sql
-- Fix: kitchen accounts were being redirected to /admin because useRole()'s
-- `select role from profiles where id = auth.uid()` came back empty under RLS
-- (migration 018 didn't grant authenticated users read access to their OWN
-- profile row), and the client silently falls back to 'admin' when the read
-- fails. Add the missing self-read policy — idempotent so it's safe even if
-- 018 already added something equivalent.
alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select
  using (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────────────────
-- 021_gift_vouchers.sql
-- ─────────────────────────────────────────────────────────────────────────
-- 021_gift_vouchers.sql
-- Admin-defined gift vouchers, redeemable once at storefront checkout for a
-- flat discount off the order total.
--
--   • gift_vouchers        — admin CRUD (authenticated), no direct anon access.
--   • validate_gift_voucher — anon-callable SECURITY DEFINER RPC used by the
--     checkout "Apply" button. Read-only: it reports whether a code is valid,
--     already used, or unknown, WITHOUT marking it used (that only happens
--     atomically inside create_order() — see migration 022 — so two
--     concurrent checkouts can't both redeem the same code).

create table gift_vouchers (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  amount numeric(10,2) not null check (amount > 0),
  is_active boolean not null default true,
  used_at timestamptz,
  used_by_order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table gift_vouchers enable row level security;

-- Admin (any authenticated user, matching this project's v1 "any authenticated
-- user is an admin" model) has full CRUD. No anon policy — anon only ever
-- interacts through the RPC below.
create policy "gift_vouchers_admin_all" on gift_vouchers
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create or replace function validate_gift_voucher(p_code text)
returns table (status text, amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v gift_vouchers%rowtype;
begin
  select * into v from gift_vouchers where code = upper(trim(p_code));

  if not found or not v.is_active then
    return query select 'invalid'::text, null::numeric;
    return;
  end if;

  if v.used_at is not null then
    return query select 'used'::text, null::numeric;
    return;
  end if;

  return query select 'ok'::text, v.amount;
end;
$$;

grant execute on function validate_gift_voucher(text) to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 022_order_voucher_redeem.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- 024_gift_recipient.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- 025_kitchen_profiles.sql
-- ─────────────────────────────────────────────────────────────────────────
-- 025_kitchen_profiles.sql
--
-- Root cause of "the kitchen portal isn't working": ProtectedRoute /
-- useRole() (frontend, already deployed) reads `profiles.role` to decide
-- whether a logged-in user is 'admin' or 'kitchen'. Migration 020 patched a
-- missing self-read RLS policy on that assumption `profiles` already
-- existed — but the table itself was never actually created by a committed
-- migration. On a database where it was never created by hand either,
-- `select role from profiles where id = auth.uid()` fails outright,
-- useRole() silently falls back to 'admin', and kitchen accounts get
-- redirected into the full Admin dashboard instead of the Kitchen Board.
--
-- This migration creates the table for real. Idempotent — safe to run even
-- if `profiles` (or migration 020's policy) already exists.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'kitchen')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Each signed-in user may read their own role (what useRole() queries).
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select
  using (auth.uid() = id);

-- Admin (any authenticated user, matching this project's v1 "any
-- authenticated user is an admin" model) can manage all profile rows — e.g.
-- to promote a teammate's account to 'kitchen' without touching SQL.
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- No profiles row is required for admin accounts — useRole() already
-- defaults to 'admin' when a row is missing. Only kitchen accounts need one:
--
--   insert into profiles (id, role)
--   select id, 'kitchen' from auth.users where email = 'kitchen@example.com';


-- ─────────────────────────────────────────────────────────────────────────
-- 026_payment_method.sql
-- ─────────────────────────────────────────────────────────────────────────
-- 026_payment_method.sql
--
-- Adds a payment step to checkout. Two methods at launch: bank transfer
-- (customer transfers manually, enters a reference, uploads a slip) and card
-- (PayHere — wired in a later PR). Payment state is modelled on a SEPARATE
-- axis from fulfilment `status`: an order can be `awaiting_verification` on
-- payment while still `pending` on fulfilment. This deliberately does NOT
-- touch the `order_status` enum, so the kitchen portal's "existing enum
-- values only" rule stays intact.
--
--   payment_method : 'bank_transfer' | 'card'   (null for legacy/whatsapp orders)
--   payment_status : 'unpaid' | 'awaiting_verification' | 'paid' | 'failed'
--   payment_ref    : customer-entered bank transfer reference number
--   slip_url       : object path in the private `bank-slips` bucket
--
-- All nullable / defaulted; existing orders are unaffected.

alter table orders
  add column if not exists payment_method text
    check (payment_method in ('bank_transfer', 'card')),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'awaiting_verification', 'paid', 'failed')),
  add column if not exists payment_ref text,
  add column if not exists slip_url text;

-- Editable bank-transfer details shown to customers on the Payment step.
-- Lives in site_settings so the account can change without a code deploy.
-- Seeded with the current business account; admin can edit later.
insert into site_settings (key, value)
values (
  'bank_transfer',
  '{"bank_name": "Nations Trust Bank", "account_name": "M N AHAMED", "account_no": "200520120714", "branch": "Mt Lavinia", "enabled": true}'::jsonb
)
on conflict (key) do nothing;

-- Allow the public storefront read of this new settings key (matches the
-- existing public-readable settings allow-list pattern).
drop policy if exists "site_settings_public_read" on site_settings;
create policy "site_settings_public_read" on site_settings
  for select
  using (key in ('banner', 'features', 'business', 'bank_transfer'));

-- ── Private bucket for bank slips ──────────────────────────────────────────
-- Slips are customer financial documents — NOT public like product-images.
-- Anon may upload (insert) so guests can attach a slip at checkout; only
-- authenticated admins may read them back (via signed URLs in Admin › Orders).
insert into storage.buckets (id, name, public)
values ('bank-slips', 'bank-slips', false)
on conflict (id) do nothing;

drop policy if exists "bank_slips_anon_insert" on storage.objects;
create policy "bank_slips_anon_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'bank-slips');

drop policy if exists "bank_slips_admin_read" on storage.objects;
create policy "bank_slips_admin_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'bank-slips');

-- ── Extend create_order with the payment fields ────────────────────────────
-- Drop the migration-024 signature, then recreate with three new trailing
-- params (defaulted, so callers that don't pass them still work).
drop function if exists create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
  text, numeric, boolean, text, text
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
  -- Bank transfers land as awaiting_verification (admin checks the slip);
  -- card orders are marked paid by the PayHere callback in a later PR, so
  -- they start unpaid here; anything else (legacy) stays unpaid.
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

  insert into orders (
    customer_name, phone, email, alt_phone, address, delivery_date, note,
    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id,
    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone,
    payment_method, payment_status, payment_ref, slip_url
  )
  values (
    p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
    p_address, p_delivery_date, p_note,
    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null,
    v_code, coalesce(p_voucher_discount, 0),
    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, ''),
    p_payment_method, v_payment_status, nullif(p_payment_ref, ''), nullif(p_slip_url, '')
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
  text, numeric, boolean, text, text, text, text, text
) to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 027_rbac_and_price_integrity.sql
-- ─────────────────────────────────────────────────────────────────────────
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
      where id = nullif(v_item->>'product_id', '')::uuid and is_visible = true;
    if v_pp is null then
      raise exception 'PRICE_MISMATCH';
    end if;

    select piece_count into v_pc
      from packages
      where id = v_item->>'package_id' and is_active = true;
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


-- ─────────────────────────────────────────────────────────────────────────
-- AFTER the above: give your kitchen account the 'kitchen' role.
-- Replace the email with the one you created in Supabase → Authentication.
-- ─────────────────────────────────────────────────────────────────────────
-- insert into profiles (id, role)
-- select id, 'kitchen' from auth.users where email = 'kitchen@goldenoven.lk'
-- on conflict (id) do update set role = 'kitchen';
