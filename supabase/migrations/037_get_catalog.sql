-- 037_get_catalog.sql
--
-- Egress / request-count reduction.
--
-- The storefront reads the whole catalogue live from Supabase (CatalogProvider →
-- fetchLiveCatalog). That was NINE-to-TEN separate REST calls on every page
-- load — products, packages, addons, categories, delivery_tiers, reviews,
-- site_settings, product_package_stock, product_package_availability — which on
-- a small Free-plan project is the bulk of the API traffic and egress.
--
-- get_catalog() returns the entire catalogue as ONE JSON payload, so the
-- storefront makes a single request instead of ten. It also trims what leaves
-- the database (only visible products/categories, active packages, featured
-- reviews) so the payload is smaller too. Read-only + anon-callable; SECURITY
-- DEFINER so it can read past RLS while only ever emitting public rows.
--
-- Idempotent: safe to re-run.

create or replace function get_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'products', coalesce(
      (select jsonb_agg(to_jsonb(p) order by p.sort_order)
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
      (select jsonb_agg(to_jsonb(pa)) from product_package_availability pa), '[]'::jsonb)
  );
$$;

revoke execute on function get_catalog() from public;
grant execute on function get_catalog() to anon, authenticated;
