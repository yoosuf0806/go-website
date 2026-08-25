-- 039_slab_letter_max_chars.sql
--
-- Per-slab letter-topper limit.
--
-- Package-based products already carry their own allowance in
-- packages.letter_max_chars (migration 013: 12pc box → 4, 15pc box → 5,
-- slab packages → 7). Standalone slab products (products.is_slab_product,
-- migration 034) have no package to read that from, so the storefront fell
-- back to a single hard-coded constant — SLAB_TOPPER_MAX = 7 in
-- ProductConfigurator.tsx — which applied to EVERY slab regardless of size.
--
-- That is wrong once there is more than one slab: the Mini Brownie Slab is
-- physically smaller than the Party Brownie Slab and only fits ~4 letters per
-- line, but both advertised "7 letters each".
--
-- This moves the allowance into the row, so it is per-product and editable
-- from the admin product form instead of requiring a code change.
--
-- Default is 7 — the previous hard-coded value — so every existing slab keeps
-- its current behaviour and only the Mini slab changes.
--
-- Idempotent: safe to re-run.

alter table products
  add column if not exists slab_letter_max_chars int not null default 7;

alter table products drop constraint if exists products_slab_letter_max_chars_check;
alter table products add constraint products_slab_letter_max_chars_check
  check (slab_letter_max_chars between 0 and 20);

comment on column products.slab_letter_max_chars is
  'Letter-topper characters allowed PER LINE on a standalone slab product '
  '(is_slab_product = true). The number of lines is fixed at 3 (TOPPER_LINES). '
  'Ignored for package-based products, which read packages.letter_max_chars. '
  '0 disables the topper for this slab.';

-- The Mini slab holds fewer letters than the Party slab. Matched on slug first
-- (stable), falling back to the name, and scoped to slab products so a
-- similarly-named box product can never be caught by accident. A no-op on any
-- database where the Mini slab doesn't exist or was renamed — in that case set
-- it from the admin product form instead.
update products
   set slab_letter_max_chars = 4
 where coalesce(is_slab_product, false) = true
   and (slug = 'mini-brownie-slab' or name ilike '%mini%slab%');
