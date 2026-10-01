-- 054_bulk_pricing.sql
-- Per-product WEDDING / CORPORATE bulk prices (per piece).
--
-- Bulk requests arrive as inquiries (category 'wedding' | 'corporate'); the admin
-- converts one into an order (convertInquiryToOrder — a direct admin insert, NOT
-- create_order, so these prices are applied client-side with no PRICE_MISMATCH
-- re-derivation). These two columns let the admin pre-define, per product, the
-- per-piece rate to use for a wedding order vs a corporate order, so the convert
-- screen auto-fills the right price instead of the admin retyping it each time.
--
--   * NULL (the default) = no special bulk rate; the product's standard
--     price_per_piece is used.
--   * A value X          = that per-piece rate is used for orders of that
--     category.
--
-- Admin-only: these are NOT shown on the storefront. get_catalog() (the public
-- catalogue payload) is redefined below to STRIP both columns, so they never
-- leave the database to anon visitors. The admin reads them via the authenticated
-- products select (fetchProducts), not via get_catalog.
--
-- Idempotent: safe to re-run.

alter table products
  add column if not exists wedding_price_per_piece numeric
    check (wedding_price_per_piece is null or wedding_price_per_piece >= 0);
alter table products
  add column if not exists corporate_price_per_piece numeric
    check (corporate_price_per_piece is null or corporate_price_per_piece >= 0);

comment on column products.wedding_price_per_piece is
  'Per-piece bulk rate used when converting a wedding inquiry to an order. NULL = use price_per_piece. Admin-only; stripped from get_catalog().';
comment on column products.corporate_price_per_piece is
  'Per-piece bulk rate used when converting a corporate inquiry to an order. NULL = use price_per_piece. Admin-only; stripped from get_catalog().';

-- ── get_catalog(): keep the new bulk-price columns OUT of the public payload ──
-- to_jsonb(p) would otherwise emit every products column. Strip the two bulk
-- rates so they stay admin-only. Same signature, so a plain replace is fine.
create or replace function get_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'products', coalesce(
      (select jsonb_agg(
         (to_jsonb(p) - 'wedding_price_per_piece' - 'corporate_price_per_piece')
         order by p.sort_order)
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
