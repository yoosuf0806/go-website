-- ============================================================================
-- Golden Oven — one-shot Supabase setup (schema + RLS + RPC, idempotent).
--
-- Paste this whole file into the Supabase SQL Editor and Run. It is the merged
-- FINAL state of migrations 001–011, safe to run on an empty project and safe
-- to re-run (uses IF NOT EXISTS / drop-and-recreate). After this succeeds the
-- storefront's build-time snapshot will read live data.
--
-- Part A (required): extensions, tables, config rows, RLS, create_order RPC.
-- Part B (optional): demo categories/products/reviews — delete that section if
--                    you'd rather add your own products via the admin panel.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums (guarded so re-runs don't error) ──────────────────────────────────
do $$ begin
  create type order_status as enum
    ('pending','confirmed','baking','ready','out_for_delivery','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inquiry_status as enum ('new','contacted','quoted','converted','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inquiry_category as enum ('corporate','wedding');
exception when duplicate_object then null; end $$;

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  is_visible boolean not null default true,
  sort_order int not null default 0
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price_per_piece numeric(10,2) not null check (price_per_piece >= 0),
  image_url text,
  is_visible boolean not null default true,
  in_stock boolean not null default true,
  stock_qty int,
  is_slab_available boolean not null default false,
  allows_letter_topper boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists packages (
  id text primary key,
  label text not null,
  piece_count int not null check (piece_count > 0),
  is_slab boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists addons (
  id text primary key,
  label text not null,
  price numeric(10,2) not null default 0,
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb
);

create table if not exists delivery_tiers (
  id uuid primary key default uuid_generate_v4(),
  min_pieces int not null,
  max_pieces int,
  fee numeric(10,2) not null,
  warn_admin boolean not null default false,
  sort_order int not null default 0
);

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_no serial unique,
  status order_status not null default 'pending',
  customer_name text not null,
  phone text not null,
  address text,
  delivery_date date,
  note text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  total_pieces int not null,
  source text not null default 'web',
  inquiry_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  package_id text not null references packages(id),
  package_label text not null,
  piece_count int not null,
  box_qty int not null default 1 check (box_qty >= 1),
  unit_price numeric(10,2) not null,
  unit_cost numeric(10,2),
  addons jsonb not null default '[]'::jsonb,
  line_total numeric(10,2) not null
);

create table if not exists inquiries (
  id uuid primary key default uuid_generate_v4(),
  category inquiry_category not null,
  status inquiry_status not null default 'new',
  name text not null,
  phone text not null,
  email text,
  event_date date,
  guest_count int,
  message text,
  converted_order_id uuid references orders(id),
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  author text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  source text not null default 'google',
  is_featured boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  key text primary key,
  value jsonb not null
);

-- ── inquiry_id FK (guarded) ─────────────────────────────────────────────────
do $$ begin
  alter table orders
    add constraint orders_inquiry_id_fkey
    foreign key (inquiry_id) references inquiries(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- ── Config / locked rows (idempotent) ───────────────────────────────────────
insert into packages (id, label, piece_count, is_slab, sort_order) values
  ('box-9',  '9 Pieces',              9,  false, 1),
  ('box-12', '12 Pieces',             12, false, 2),
  ('box-15', '15 Pieces',             15, false, 3),
  ('slab-12','Brownie Slab (12 pcs)', 12, true,  4)
on conflict (id) do nothing;

insert into addons (id, label, price, is_enabled, config) values
  ('letter_topper', 'Letter Topper', 350, true, '{"lines": 3, "max_chars_per_line": 5, "slab_only": true}'::jsonb),
  ('gift_message',  'Gift Message',  100, true, '{"max_chars": 100}'::jsonb),
  ('gift_ribbon',   'Gift Ribbon',   150, true, '{"colors": ["Red", "Gold", "Pink", "White"]}'::jsonb)
on conflict (id) do nothing;

insert into delivery_tiers (min_pieces, max_pieces, fee, warn_admin, sort_order)
select 1, null, 580.00, false, 1
where not exists (select 1 from delivery_tiers);

insert into site_settings (key, value) values
  ('banner',   '{"enabled": false, "text": "", "starts_at": null, "ends_at": null}'::jsonb),
  ('features', '{"corporate_section": true, "wedding_section": true, "reviews_section": true}'::jsonb),
  ('business', '{"whatsapp_number": "", "google_business_url": ""}'::jsonb)
on conflict (key) do nothing;

-- ============================================================================
-- Row Level Security (final state — merged 010 + 011)
-- ============================================================================
alter table categories     enable row level security;
alter table products       enable row level security;
alter table packages       enable row level security;
alter table addons         enable row level security;
alter table delivery_tiers enable row level security;
alter table site_settings  enable row level security;
alter table reviews        enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;
alter table inquiries      enable row level security;

-- Public reads of visible/active catalogue rows.
drop policy if exists "public read visible categories" on categories;
create policy "public read visible categories" on categories for select using (is_visible = true);
drop policy if exists "admin all categories" on categories;
create policy "admin all categories" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read visible products" on products;
create policy "public read visible products" on products for select using (is_visible = true);
drop policy if exists "admin all products" on products;
create policy "admin all products" on products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read active packages" on packages;
create policy "public read active packages" on packages for select using (is_active = true);
drop policy if exists "admin all packages" on packages;
create policy "admin all packages" on packages for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read enabled addons" on addons;
create policy "public read enabled addons" on addons for select using (is_enabled = true);
drop policy if exists "admin all addons" on addons;
create policy "admin all addons" on addons for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read delivery tiers" on delivery_tiers;
create policy "public read delivery tiers" on delivery_tiers for select using (true);
drop policy if exists "admin all delivery tiers" on delivery_tiers;
create policy "admin all delivery tiers" on delivery_tiers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read public settings" on site_settings;
create policy "public read public settings" on site_settings for select
  using (key in ('banner', 'features', 'business'));
drop policy if exists "admin all settings" on site_settings;
create policy "admin all settings" on site_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read featured reviews" on reviews;
create policy "public read featured reviews" on reviews for select
  using (is_featured = true and is_hidden = false);
drop policy if exists "admin all reviews" on reviews;
create policy "admin all reviews" on reviews for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Orders / order_items: NO direct public writes — created only via create_order().
drop policy if exists "public create order" on orders;
drop policy if exists "public create order items" on order_items;
drop policy if exists "admin manage orders" on orders;
create policy "admin manage orders" on orders for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin manage order items" on order_items;
create policy "admin manage order items" on order_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Inquiries: public may INSERT new, unlinked rows only; admin full access.
drop policy if exists "public create inquiry" on inquiries;
create policy "public create inquiry" on inquiries for insert
  with check (status = 'new' and converted_order_id is null);
drop policy if exists "admin manage inquiries" on inquiries;
create policy "admin manage inquiries" on inquiries for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ── Atomic order-create RPC (anon checkout) ─────────────────────────────────
create or replace function create_order(
  p_customer_name text, p_phone text, p_address text, p_delivery_date date, p_note text,
  p_subtotal numeric, p_delivery_fee numeric, p_total numeric, p_total_pieces int, p_items jsonb
)
returns table (id uuid, order_no int)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_order_no int;
begin
  insert into orders (
    customer_name, phone, address, delivery_date, note,
    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id
  ) values (
    p_customer_name, p_phone, p_address, p_delivery_date, p_note,
    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null
  ) returning orders.id, orders.order_no into v_id, v_order_no;

  insert into order_items (
    order_id, product_id, product_name, package_id, package_label,
    piece_count, box_qty, unit_price, addons, line_total
  )
  select v_id,
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
end; $$;

grant execute on function create_order(
  text, text, text, date, text, numeric, numeric, numeric, int, jsonb
) to anon, authenticated;

-- ============================================================================
-- Part B (OPTIONAL) — demo catalogue. Delete this block to start empty and add
-- your own products via the admin panel instead.
-- ============================================================================
insert into categories (id, name, slug, is_visible, sort_order) values
  ('11111111-1111-4111-8111-111111111111', 'Classic Brownies', 'classic', true, 1),
  ('22222222-2222-4222-8222-222222222222', 'Premium Brownies', 'premium', true, 2)
on conflict (id) do nothing;

insert into products
  (id, category_id, name, slug, description, price_per_piece, image_url,
   is_visible, in_stock, stock_qty, is_slab_available, allows_letter_topper, sort_order)
values
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   'Naked Brownie', 'naked-brownie', 'Our signature fudgy classic — rich, dense, and unadorned.',
   150, null, true, true, null, true, true, 1),
  ('a2222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
   'Walnut Fudge', 'walnut-fudge', 'Classic brownie loaded with toasted walnuts.',
   170, null, true, true, null, false, false, 2),
  ('a3333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222',
   'Cashew Brownie', 'cashew-brownie', 'Buttery Sri Lankan cashews over a dark-chocolate base.',
   190, null, true, true, 40, true, true, 3),
  ('a4444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222',
   'Triple Chocolate', 'triple-chocolate', 'Dark, milk, and white chocolate in every bite.',
   210, null, true, true, null, true, true, 4),
  ('a5555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222',
   'Salted Caramel', 'salted-caramel', 'Molten salted-caramel swirl on a fudge brownie.',
   200, null, true, false, null, true, true, 5)
on conflict (id) do nothing;

insert into reviews (id, author, rating, body, source, is_featured, is_hidden) values
  ('c1111111-1111-4111-8111-111111111111', 'Nadeesha P.', 5,
   'The fudgiest brownies in Colombo. The slab with the letter topper made my daughter''s birthday!',
   'google', true, false),
  ('c2222222-2222-4222-8222-222222222222', 'Roshan M.', 5,
   'Ordered a corporate box of 15 — delivered on time and everyone raved. Highly recommend.',
   'google', true, false),
  ('c3333333-3333-4333-8333-333333333333', 'Ayesha F.', 4,
   'Cashew brownie is divine. Will order again for our next event.',
   'google', true, false)
on conflict (id) do nothing;
