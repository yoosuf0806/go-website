-- 013_slab_stock_letters.sql
-- Three additions (PR #2):
--   1. A second slab size — 15pc slab (`slab-15`) alongside the existing 12pc
--      slab (`slab-12`). Admin gets two independent per-size toggles on the
--      product (is_slab_available for 12pc, is_slab_15_available for 15pc).
--   2. Letter topper becomes a FREE built-in option (no longer the paid
--      `letter_topper` addon) with a per-PACKAGE character limit, so a 9pc box
--      has none, boxes get 4–5 chars/line, slabs get 7. Limits live on
--      `packages.letter_max_chars` (0 = topper not offered for that package),
--      not on the addon config, since the limit now varies by package size
--      rather than being a single global constant.
--   3. Per-product-per-package stock — `product_package_stock` lets the admin
--      mark a specific product×package combo out of stock (e.g. 9pc Cashew in
--      stock, 12pc Cashew out) independent of the product-level `in_stock`
--      flag. No row = in stock (the common case); a row with in_stock=false =
--      that combo is sold out.

-- ── 1. Second slab size ──────────────────────────────────────────────────────
insert into packages (id, label, piece_count, is_slab, is_active, sort_order)
values ('slab-15', 'Brownie Slab (15 pcs)', 15, true, true, 5)
on conflict (id) do nothing;

alter table products
  add column if not exists is_slab_15_available boolean not null default false;

comment on column products.is_slab_available is
  'Can be ordered as the 12pc Brownie Slab (slab-12). Independent of is_slab_15_available.';
comment on column products.is_slab_15_available is
  'Can be ordered as the 15pc Brownie Slab (slab-15). Independent of is_slab_available.';

-- ── 2. Free, per-package letter topper ───────────────────────────────────────
-- Replaces the old global `letter_topper` addon config (lines/max_chars_per_line
-- fixed at 3/5 for every slab). The limit now depends on which package is
-- selected: 0 means "no topper for this package" (box-9); non-zero is the max
-- characters per line for that package's 3 topper lines.
alter table packages
  add column if not exists letter_max_chars int not null default 0;

update packages set letter_max_chars = 0 where id = 'box-9';
update packages set letter_max_chars = 4 where id = 'box-12';
update packages set letter_max_chars = 5 where id = 'box-15';
update packages set letter_max_chars = 7 where id = 'slab-12';
update packages set letter_max_chars = 7 where id = 'slab-15';

comment on column packages.letter_max_chars is
  'Max characters per topper line (3 lines, spec unchanged) for this package. 0 = no topper offered.';

-- The topper is now free and built-in rather than a priced addon: zero its
-- price and disable the old addon row so nothing double-charges or shows a
-- stale "+ Rs. 350" checkbox. Left in place (not dropped) so historical orders
-- that stored a `letter_topper` addon line keep rendering correctly.
update addons set price = 0, is_enabled = false where id = 'letter_topper';

-- ── 3. Per-product-per-package stock ─────────────────────────────────────────
create table if not exists product_package_stock (
  product_id uuid not null references products(id) on delete cascade,
  package_id text not null references packages(id) on delete cascade,
  in_stock boolean not null default false,
  primary key (product_id, package_id)
);

comment on table product_package_stock is
  'Per product×package sold-out overrides. No row = in stock. A row exists only when admin has explicitly marked that combo (almost always to mark it OUT of stock — in_stock=false); the table is not meant to hold one row per combo.';

alter table product_package_stock enable row level security;

drop policy if exists "public read product package stock" on product_package_stock;
create policy "public read product package stock" on product_package_stock
  for select using (true);

drop policy if exists "admin all product package stock" on product_package_stock;
create policy "admin all product package stock" on product_package_stock
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
