-- 002_products.sql
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  is_visible boolean not null default true,
  sort_order int not null default 0
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price_per_piece numeric(10,2) not null check (price_per_piece >= 0),
  image_url text,
  is_visible boolean not null default true,
  in_stock boolean not null default true,             -- "sold out today" switch (bake-to-order)
  stock_qty int,                                       -- optional daily capacity; NULL = unlimited
  is_slab_available boolean not null default false,   -- can be ordered as Brownie Slab
  allows_letter_topper boolean not null default false, -- admin toggle; slab-only add-on
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- Availability model (bake-to-order): `in_stock=false` hides the buy button / shows "Sold out".
-- `stock_qty` is OPTIONAL daily capacity — leave NULL to ignore. When set, the storefront shows
-- limited availability and the admin can decrement it manually; it is NOT auto-decremented in v1.
-- Both fields are included in the build-time snapshot.
