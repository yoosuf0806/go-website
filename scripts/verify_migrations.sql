-- verify_migrations.sql
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL Editor and Run. It reports, per
-- migration change, whether the DATABASE actually has it (PASS/FAIL) — this
-- reads the real schema, NOT the PostgREST cache, so it tells you the truth
-- even when the app still says "column not found in the schema cache".
--
-- If every row says PASS but the app still errors on `discount_type`, it's a
-- STALE POSTGREST CACHE, not a missing migration — scroll to the bottom and run
-- the one-line reload.
-- ----------------------------------------------------------------------------

with checks(sort, area, check_name, ok) as (
  values
    -- ── 034: slab products ──────────────────────────────────────────────
    (1, '034', 'products.is_slab_product column exists',
      exists(select 1 from information_schema.columns
             where table_schema='public' and table_name='products' and column_name='is_slab_product')),
    (2, '034', 'products.flavors column exists',
      exists(select 1 from information_schema.columns
             where table_schema='public' and table_name='products' and column_name='flavors')),
    (3, '034', 'order_items.package_id is NULLABLE',
      (select is_nullable = 'YES' from information_schema.columns
             where table_schema='public' and table_name='order_items' and column_name='package_id')),
    (4, '034', 'slab-12 / slab-15 packages retired (is_active = false)',
      not exists(select 1 from packages where id in ('slab-12','slab-15') and is_active)),
    -- ── 035: percentage vouchers ────────────────────────────────────────
    (5, '035', 'gift_vouchers.discount_type column exists',
      exists(select 1 from information_schema.columns
             where table_schema='public' and table_name='gift_vouchers' and column_name='discount_type')),
    (6, '035', 'validate_gift_voucher() returns discount_type',
      coalesce((select bool_or(pg_get_functiondef(p.oid) ilike '%discount_type%')
                from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                where n.nspname='public' and p.proname='validate_gift_voucher'), false)),
    -- ── 036: ambiguous-id fix ───────────────────────────────────────────
    (7, '036', 'create_order() qualifies products.id (ambiguous-id fix applied)',
      coalesce((select bool_or(pg_get_functiondef(p.oid) ilike '%products.id, products.price_per_piece%')
                from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                where n.nspname='public' and p.proname='create_order'), false)),
    (8, '036', 'create_order() applies percentage vouchers',
      coalesce((select bool_or(pg_get_functiondef(p.oid) ilike '%discount_type%')
                from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                where n.nspname='public' and p.proname='create_order'), false))
)
select
  area              as migration,
  check_name        as "check",
  case when ok then 'PASS' else 'FAIL — migration not applied' end as status
from checks
order by sort;

-- ── If everything above is PASS but the app still can't see the column ──────
-- PostgREST caches the schema; a fresh column is invisible to the REST API
-- until it reloads. Run this once, then retry adding the voucher:
--
--   notify pgrst, 'reload schema';
--
-- (Left commented so this file is read-only by default — uncomment to run it.)
