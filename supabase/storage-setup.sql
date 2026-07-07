-- ============================================================================
-- Golden Oven — Storage setup (run once in the Supabase SQL Editor).
-- Creates the public `product-images` bucket used by admin product media
-- uploads (lib/adminProducts.ts uploadProductMedia — images AND short videos,
-- for the product gallery carousel), plus RLS policies:
--   • public read  — so stored media URLs load on the storefront
--   • authenticated write — so signed-in admins can upload/replace/delete
-- Idempotent: safe to run more than once.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true,
  52428800, -- 50 MB cap per file (comfortably covers a short product video)
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "admin write product-images" on storage.objects;
create policy "admin write product-images"
  on storage.objects for all
  using (bucket_id = 'product-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
