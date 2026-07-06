-- ============================================================================
-- Golden Oven — Storage setup (run once in the Supabase SQL Editor).
-- Creates the public `product-images` bucket used by admin product image
-- uploads (lib/adminProducts.ts uploadProductImage), plus RLS policies:
--   • public read  — so stored image URLs load on the storefront
--   • authenticated write — so signed-in admins can upload/replace/delete
-- Idempotent: safe to run more than once.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "admin write product-images" on storage.objects;
create policy "admin write product-images"
  on storage.objects for all
  using (bucket_id = 'product-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
