-- 033_product_package_availability.sql
-- Per-product-per-package AVAILABILITY.
--
-- Until now the storefront always offered the three standard boxes (9/12/15 pcs)
-- for every product; only the slab sizes had per-product toggles
-- (is_slab_available / is_slab_15_available). That meant a slab-only product
-- like "Mini Brownie Slab" still showed the 9/12/15 boxes it never sells.
--
-- This table lets the admin hide any individual package for a product. It
-- mirrors product_package_stock exactly:
--   * No row for a product×package  = that package IS available (the common
--     case, keeping the table small).
--   * A row with is_available=false = that package is hidden for that product.
-- Slab packages remain additionally gated by the product slab flags, so a slab
-- only appears when its flag is on AND it isn't hidden here.

create table if not exists product_package_availability (
  product_id uuid not null references products(id) on delete cascade,
  package_id text not null references packages(id) on delete cascade,
  is_available boolean not null default true,
  primary key (product_id, package_id)
);

comment on table product_package_availability is
  'Per product×package availability overrides. No row = available. A row exists only when admin has hidden that package for the product (is_available=false).';

alter table product_package_availability enable row level security;

drop policy if exists "public read product package availability" on product_package_availability;
create policy "public read product package availability" on product_package_availability
  for select using (true);

drop policy if exists "admin all product package availability" on product_package_availability;
create policy "admin all product package availability" on product_package_availability
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
