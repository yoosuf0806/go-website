-- 010_rls_policies.sql
-- Row Level Security for every table (spec §5).
-- Admins are Supabase Auth users (no public sign-up; created via dashboard).
-- Any authenticated user is an admin in v1 (sign-ups disabled in Auth settings).
--
--   anon (public):  read visible/active catalogue rows; INSERT-only for orders/inquiries.
--   authenticated:  full CRUD everywhere.

-- ── categories ────────────────────────────────────────────────────────────────
alter table categories enable row level security;
create policy "public read visible categories" on categories
  for select using (is_visible = true);
create policy "admin all categories" on categories
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── products ──────────────────────────────────────────────────────────────────
alter table products enable row level security;
create policy "public read visible products" on products
  for select using (is_visible = true);
create policy "admin all products" on products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── packages ──────────────────────────────────────────────────────────────────
alter table packages enable row level security;
create policy "public read active packages" on packages
  for select using (is_active = true);
create policy "admin all packages" on packages
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── addons ────────────────────────────────────────────────────────────────────
alter table addons enable row level security;
create policy "public read enabled addons" on addons
  for select using (is_enabled = true);
create policy "admin all addons" on addons
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── delivery_tiers ────────────────────────────────────────────────────────────
alter table delivery_tiers enable row level security;
create policy "public read delivery tiers" on delivery_tiers
  for select using (true);
create policy "admin all delivery tiers" on delivery_tiers
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── site_settings ─────────────────────────────────────────────────────────────
-- Public may read only the banner / features / business keys.
alter table site_settings enable row level security;
create policy "public read public settings" on site_settings
  for select using (key in ('banner', 'features', 'business'));
create policy "admin all settings" on site_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── reviews ───────────────────────────────────────────────────────────────────
alter table reviews enable row level security;
create policy "public read featured reviews" on reviews
  for select using (is_featured = true and is_hidden = false);
create policy "admin all reviews" on reviews
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── orders / order_items ──────────────────────────────────────────────────────
-- Public may INSERT (checkout) but never SELECT. Admin has full access.
alter table orders enable row level security;
create policy "public create order" on orders
  for insert with check (true);
create policy "admin manage orders" on orders
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table order_items enable row level security;
create policy "public create order items" on order_items
  for insert with check (true);
create policy "admin manage order items" on order_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── inquiries ─────────────────────────────────────────────────────────────────
alter table inquiries enable row level security;
create policy "public create inquiry" on inquiries
  for insert with check (true);
create policy "admin manage inquiries" on inquiries
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Storage: create a public-read, authenticated-write bucket `product-images`
-- via the Supabase dashboard or the storage API (bucket policies live outside
-- these table migrations). Spec §5.
