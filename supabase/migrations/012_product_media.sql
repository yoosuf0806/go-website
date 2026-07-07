diff --git a/scripts/seed-data.ts b/scripts/seed-data.ts
index 64042d3..8cfb9d3 100644
--- a/scripts/seed-data.ts
+++ b/scripts/seed-data.ts
@@ -15,6 +15,11 @@ export interface RawCategory {
   sort_order: number
 }
 
+export interface RawMedia {
+  url: string
+  type: 'image' | 'video'
+}
+
 export interface RawProduct {
   id: string
   category_id: string | null
@@ -23,6 +28,8 @@ export interface RawProduct {
   description: string | null
   price_per_piece: number
   image_url: string | null
+  /** Ordered gallery; media[0] is the cover (mirrors image_url in the DB). */
+  media: RawMedia[]
   is_visible: boolean
   in_stock: boolean
   stock_qty: number | null
@@ -102,6 +109,7 @@ export const seedData: SeedData = {
       description: 'Our signature fudgy classic — rich, dense, and unadorned.',
       price_per_piece: 150,
       image_url: null,
+      media: [],
       is_visible: true,
       in_stock: true,
       stock_qty: null,
@@ -117,6 +125,7 @@ export const seedData: SeedData = {
       description: 'Classic brownie loaded with toasted walnuts.',
       price_per_piece: 170,
       image_url: null,
+      media: [],
       is_visible: true,
       in_stock: true,
       stock_qty: null,
@@ -132,6 +141,7 @@ export const seedData: SeedData = {
       description: 'Buttery Sri Lankan cashews over a dark-chocolate base.',
       price_per_piece: 190,
       image_url: null,
+      media: [],
       is_visible: true,
       in_stock: true,
       stock_qty: 40,
@@ -147,6 +157,7 @@ export const seedData: SeedData = {
       description: 'Dark, milk, and white chocolate in every bite.',
       price_per_piece: 210,
       image_url: null,
+      media: [],
       is_visible: true,
       in_stock: true,
       stock_qty: null,
@@ -162,6 +173,7 @@ export const seedData: SeedData = {
       description: 'Molten salted-caramel swirl on a fudge brownie.',
       price_per_piece: 200,
       image_url: null,
+      media: [],
       is_visible: true,
       in_stock: false,
       stock_qty: null,
diff --git a/scripts/snapshot.ts b/scripts/snapshot.ts
index 61329d2..226cb75 100644
--- a/scripts/snapshot.ts
+++ b/scripts/snapshot.ts
@@ -63,7 +63,10 @@ function mapProducts(rows: RawProduct[]): Catalog['products'] {
       slug: r.slug,
       description: r.description,
       pricePerPiece: Number(r.price_per_piece),
-      imageUrl: r.image_url,
+      // imageUrl is derived (media[0], falling back to the legacy column) so
+      // tiles/SEO/JSON-LD keep working unchanged for anything reading it.
+      imageUrl: r.media?.[0]?.url ?? r.image_url,
+      media: r.media ?? [],
       inStock: r.in_stock,
       stockQty: r.stock_qty,
       isSlabAvailable: r.is_slab_available,
diff --git a/src/components/admin/ProductFormModal.tsx b/src/components/admin/ProductFormModal.tsx
index ede9cec..817ca0c 100644
--- a/src/components/admin/ProductFormModal.tsx
+++ b/src/components/admin/ProductFormModal.tsx
@@ -1,9 +1,10 @@
 import { useState } from 'react'
 import {
-  uploadProductImage,
+  uploadProductMedia,
   type AdminCategory,
   type AdminProduct,
   type ProductInput,
+  type ProductMedia,
 } from '../../lib/adminProducts'
 
 interface ProductFormModalProps {
@@ -29,6 +30,7 @@ function initialInput(product: AdminProduct | null, categories: AdminCategory[])
     description: '',
     price_per_piece: 0,
     image_url: null,
+    media: [],
     is_visible: true,
     in_stock: true,
     stock_qty: null,
@@ -57,19 +59,42 @@ export default function ProductFormModal({
     setForm((f) => ({ ...f, [key]: value }))
   }
 
-  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
-    const file = e.target.files?.[0]
-    if (!file) return
+  // Uploads every selected file (images and/or videos), appending each to the
+  // gallery as it completes so the grid fills in progressively rather than
+  // blocking on the slowest upload. One failure doesn't drop the others.
+  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
+    const files = Array.from(e.target.files ?? [])
+    e.target.value = '' // allow re-selecting the same file(s) later
+    if (files.length === 0) return
     setUploadError(null)
     setUploading(true)
-    try {
-      const url = await uploadProductImage(file)
-      set('image_url', url)
-    } catch (err) {
-      setUploadError(err instanceof Error ? err.message : 'Upload failed')
-    } finally {
-      setUploading(false)
+    const failures: string[] = []
+    for (const file of files) {
+      try {
+        const item = await uploadProductMedia(file)
+        setForm((f) => ({ ...f, media: [...f.media, item] }))
+      } catch (err) {
+        failures.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`)
+      }
     }
+    setUploading(false)
+    if (failures.length > 0) setUploadError(failures.join('; '))
+  }
+
+  function removeMedia(index: number) {
+    setForm((f) => ({ ...f, media: f.media.filter((_, i) => i !== index) }))
+  }
+
+  // Moves an item earlier/later in the gallery order; index 0 is the cover
+  // image shown on tiles, SEO, and JSON-LD.
+  function moveMedia(index: number, direction: -1 | 1) {
+    setForm((f) => {
+      const next = [...f.media]
+      const target = index + direction
+      if (target < 0 || target >= next.length) return f
+      ;[next[index], next[target]] = [next[target], next[index]]
+      return { ...f, media: next }
+    })
   }
 
   function handleSubmit(e: React.FormEvent) {
@@ -78,6 +103,9 @@ export default function ProductFormModal({
     const cleaned: ProductInput = {
       ...form,
       allows_letter_topper: form.is_slab_available ? form.allows_letter_topper : false,
+      // image_url is derived from the gallery cover so legacy readers
+      // (SEO/JSON-LD/ProductTile) that only look at image_url keep working.
+      image_url: form.media[0]?.url ?? null,
     }
     onSubmit(cleaned)
   }
@@ -169,16 +197,75 @@ export default function ProductFormModal({
           </div>
 
           <div className="text-sm">
-            <span className="block text-neutral-600">Image</span>
-            <input type="file" accept="image/*" onChange={handleImage} className="mt-1 text-sm" />
+            <span className="block text-neutral-600">
+              Photos &amp; videos
+              <span className="ml-1 font-normal text-neutral-400">
+                — shown as a carousel; first item is the cover
+              </span>
+            </span>
+            <input
+              type="file"
+              accept="image/*,video/*"
+              multiple
+              onChange={handleMediaSelect}
+              className="mt-1 text-sm"
+            />
             {uploading && <p className="mt-1 text-xs text-neutral-500">Uploading…</p>}
             {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
-            {form.image_url && (
-              <img
-                src={form.image_url}
-                alt=""
-                className="mt-2 h-20 w-20 rounded object-cover"
-              />
+
+            {form.media.length > 0 && (
+              <ul className="mt-3 grid grid-cols-4 gap-2">
+                {form.media.map((item: ProductMedia, i: number) => (
+                  <li key={`${item.url}-${i}`} className="group relative">
+                    {item.type === 'video' ? (
+                      <video
+                        src={item.url}
+                        muted
+                        className="h-20 w-20 rounded object-cover"
+                      />
+                    ) : (
+                      <img
+                        src={item.url}
+                        alt=""
+                        className="h-20 w-20 rounded object-cover"
+                      />
+                    )}
+                    {i === 0 && (
+                      <span className="absolute left-1 top-1 rounded bg-navy/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
+                        Cover
+                      </span>
+                    )}
+                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
+                      <button
+                        type="button"
+                        onClick={() => moveMedia(i, -1)}
+                        disabled={i === 0}
+                        aria-label="Move earlier"
+                        className="text-xs text-white disabled:opacity-30"
+                      >
+                        ◀
+                      </button>
+                      <button
+                        type="button"
+                        onClick={() => removeMedia(i)}
+                        aria-label="Remove"
+                        className="text-xs text-white"
+                      >
+                        ✕
+                      </button>
+                      <button
+                        type="button"
+                        onClick={() => moveMedia(i, 1)}
+                        disabled={i === form.media.length - 1}
+                        aria-label="Move later"
+                        className="text-xs text-white disabled:opacity-30"
+                      >
+                        ▶
+                      </button>
+                    </div>
+                  </li>
+                ))}
+              </ul>
             )}
           </div>
 
diff --git a/src/components/storefront/ProductGallery.tsx b/src/components/storefront/ProductGallery.tsx
new file mode 100644
index 0000000..d72c51c
--- /dev/null
+++ b/src/components/storefront/ProductGallery.tsx
@@ -0,0 +1,101 @@
+import { useState } from 'react'
+import type { CatalogMedia } from '../../types/catalog'
+import BrownieImage from './BrownieImage'
+
+interface ProductGalleryProps {
+  media: CatalogMedia[]
+  /** Legacy single-image fallback for snapshots taken before the media field existed. */
+  fallbackImageUrl: string | null
+  alt: string
+  className?: string
+}
+
+// Product page gallery: images and short videos in one carousel (arrows +
+// dots, matching Slideshow's styling; swipe on touch devices via native
+// horizontal scroll snap). Falls back to the single legacy image, then to
+// BrownieImage's placeholder, for products with no gallery yet.
+export default function ProductGallery({
+  media,
+  fallbackImageUrl,
+  alt,
+  className = '',
+}: ProductGalleryProps) {
+  const items: CatalogMedia[] =
+    media.length > 0
+      ? media
+      : fallbackImageUrl
+        ? [{ url: fallbackImageUrl, type: 'image' }]
+        : []
+  const [index, setIndex] = useState(0)
+
+  if (items.length === 0) {
+    return <BrownieImage src={null} alt={alt} className={className} />
+  }
+
+  const move = (dir: number) => setIndex((i) => (i + dir + items.length) % items.length)
+
+  return (
+    <div className={`relative overflow-hidden rounded-[20px] bg-warmgray ${className}`}>
+      <div
+        className="flex h-full transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
+        style={{ transform: `translateX(-${index * 100}%)` }}
+      >
+        {items.map((item, i) => (
+          <div key={`${item.url}-${i}`} className="h-full min-w-full">
+            {item.type === 'video' ? (
+              <video
+                src={item.url}
+                className="h-full w-full object-cover"
+                controls
+                muted
+                playsInline
+                loop
+              />
+            ) : (
+              <img
+                src={item.url}
+                alt={`${alt}${items.length > 1 ? ` — photo ${i + 1}` : ''}`}
+                loading={i === 0 ? 'eager' : 'lazy'}
+                className="h-full w-full object-cover"
+              />
+            )}
+          </div>
+        ))}
+      </div>
+
+      {items.length > 1 && (
+        <>
+          <button
+            type="button"
+            onClick={() => move(-1)}
+            aria-label="Previous photo"
+            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-lg text-navy hover:bg-white"
+          >
+            ‹
+          </button>
+          <button
+            type="button"
+            onClick={() => move(1)}
+            aria-label="Next photo"
+            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-lg text-navy hover:bg-white"
+          >
+            ›
+          </button>
+          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
+            {items.map((item, i) => (
+              <button
+                key={`${item.url}-dot-${i}`}
+                type="button"
+                onClick={() => setIndex(i)}
+                aria-label={`Go to photo ${i + 1}`}
+                className={`h-1.5 rounded-full transition-all ${
+                  i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
+                }`}
+              />
+            ))}
+          </div>
+        </>
+      )}
+    </div>
+  )
+}
diff --git a/src/lib/adminProducts.ts b/src/lib/adminProducts.ts
index 577e1bc..101d93e 100644
--- a/src/lib/adminProducts.ts
+++ b/src/lib/adminProducts.ts
@@ -10,6 +10,12 @@ export interface AdminCategory {
   sort_order: number
 }
 
+/** One item in a product's gallery — media[0] is the "cover" shown on tiles. */
+export interface ProductMedia {
+  url: string
+  type: 'image' | 'video'
+}
+
 export interface AdminProduct {
   id: string
   category_id: string | null
@@ -17,7 +23,10 @@ export interface AdminProduct {
   slug: string
   description: string | null
   price_per_piece: number
+  /** Derived = media[0]?.url, kept in sync on save; don't hand-edit. */
   image_url: string | null
+  /** Ordered image/video gallery, shown as a carousel on the storefront. */
+  media: ProductMedia[]
   is_visible: boolean
   in_stock: boolean
   stock_qty: number | null
@@ -70,9 +79,14 @@ export async function updateCategory(
   if (error) throw new Error(error.message)
 }
 
-/** Upload an image to the public product-images bucket, return its public URL. */
-export async function uploadProductImage(file: File): Promise<string> {
-  const ext = file.name.split('.').pop() ?? 'jpg'
+/**
+ * Upload a single image or video file to the public product-images bucket
+ * and return its gallery entry ({ url, type }). Used for the product gallery
+ * (multiple images/videos per product, shown as a carousel on the storefront).
+ */
+export async function uploadProductMedia(file: File): Promise<ProductMedia> {
+  const isVideo = file.type.startsWith('video/')
+  const ext = file.name.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg')
   const path = `${crypto.randomUUID()}.${ext}`
   const { error } = await supabase.storage.from('product-images').upload(path, file, {
     cacheControl: '3600',
@@ -80,5 +94,5 @@ export async function uploadProductImage(file: File): Promise<string> {
   })
   if (error) throw new Error(error.message)
   const { data } = supabase.storage.from('product-images').getPublicUrl(path)
-  return data.publicUrl
+  return { url: data.publicUrl, type: isVideo ? 'video' : 'image' }
 }
diff --git a/src/pages/ProductDetail.tsx b/src/pages/ProductDetail.tsx
index 3cc3b8b..6e73775 100644
--- a/src/pages/ProductDetail.tsx
+++ b/src/pages/ProductDetail.tsx
@@ -1,7 +1,7 @@
 import { Link, useParams } from 'react-router-dom'
 import { products, packages, addons, getProductBySlug, content } from '../data/catalog'
 import { formatLKR } from '../lib/format'
-import BrownieImage from '../components/storefront/BrownieImage'
+import ProductGallery from '../components/storefront/ProductGallery'
 import ProductConfigurator from '../components/storefront/ProductConfigurator'
 import ProductTile from '../components/storefront/ProductTile'
 import Accordion from '../components/storefront/Accordion'
@@ -86,10 +86,11 @@ export default function ProductDetail() {
       <div className="mt-6 grid grid-cols-1 gap-12 md:grid-cols-2">
         {/* Gallery */}
         <div className="md:sticky md:top-28 md:self-start">
-          <BrownieImage
-            src={product.imageUrl}
+          <ProductGallery
+            media={product.media}
+            fallbackImageUrl={product.imageUrl}
             alt={product.name}
-            className="aspect-square w-full rounded-[20px] bg-warmgray"
+            className="aspect-square w-full"
           />
         </div>
 
diff --git a/src/types/catalog.ts b/src/types/catalog.ts
index bf88356..688f4de 100644
--- a/src/types/catalog.ts
+++ b/src/types/catalog.ts
@@ -16,6 +16,12 @@ export interface CatalogCategory {
   sortOrder: number
 }
 
+/** One item in a product's gallery — media[0] is the "cover" shown on tiles. */
+export interface CatalogMedia {
+  url: string
+  type: 'image' | 'video'
+}
+
 export interface CatalogProduct {
   id: string
   categoryId: string | null
@@ -23,7 +29,10 @@ export interface CatalogProduct {
   slug: string
   description: string | null
   pricePerPiece: number
+  /** Derived convenience field = media[0]?.url. Kept for tiles/SEO/JSON-LD. */
   imageUrl: string | null
+  /** Ordered image/video gallery, shown as a carousel on the product page. */
+  media: CatalogMedia[]
   inStock: boolean
   stockQty: number | null
   isSlabAvailable: boolean
diff --git a/supabase/migrations/012_product_media.sql b/supabase/migrations/012_product_media.sql
new file mode 100644
index 0000000..587d9e3
--- /dev/null
+++ b/supabase/migrations/012_product_media.sql
@@ -0,0 +1,20 @@
+-- 012_product_media.sql
+-- Adds multi-image/video gallery support to products.
+--
+-- `media` is an ordered JSON array of { "url": text, "type": "image" | "video" }.
+-- media[0] is the "cover" item — the admin form keeps the legacy `image_url`
+-- column mirrored to media[0].url so existing consumers (JSON-LD, sitemap OG
+-- image, ProductTile thumbnail) keep working untouched. New code should read
+-- `media`; `image_url` is a derived convenience column, not hand-edited.
+alter table products
+  add column if not exists media jsonb not null default '[]'::jsonb;
+
+-- Backfill: any product that already has a single image_url gets it as its
+-- one-item gallery, so existing catalogue photos don't disappear.
+update products
+set media = jsonb_build_array(jsonb_build_object('url', image_url, 'type', 'image'))
+where image_url is not null
+  and media = '[]'::jsonb;
+
+comment on column products.media is
+  'Ordered gallery: [{"url": "...", "type": "image"|"video"}, ...]. media[0] is the cover, mirrored into image_url.';
diff --git a/supabase/setup.sql b/supabase/setup.sql
index ffe1085..81808a3 100644
--- a/supabase/setup.sql
+++ b/supabase/setup.sql
@@ -45,6 +45,7 @@ create table if not exists products (
   description text,
   price_per_piece numeric(10,2) not null check (price_per_piece >= 0),
   image_url text,
+  media jsonb not null default '[]'::jsonb, -- ordered [{url, type: 'image'|'video'}]; [0] mirrors image_url
   is_visible boolean not null default true,
   in_stock boolean not null default true,
   stock_qty int,
diff --git a/supabase/storage-setup.sql b/supabase/storage-setup.sql
index 225d022..ec317c3 100644
--- a/supabase/storage-setup.sql
+++ b/supabase/storage-setup.sql
@@ -1,15 +1,22 @@
 -- ============================================================================
 -- Golden Oven — Storage setup (run once in the Supabase SQL Editor).
--- Creates the public `product-images` bucket used by admin product image
--- uploads (lib/adminProducts.ts uploadProductImage), plus RLS policies:
---   • public read  — so stored image URLs load on the storefront
+-- Creates the public `product-images` bucket used by admin product media
+-- uploads (lib/adminProducts.ts uploadProductMedia — images AND short videos,
+-- for the product gallery carousel), plus RLS policies:
+--   • public read  — so stored media URLs load on the storefront
 --   • authenticated write — so signed-in admins can upload/replace/delete
 -- Idempotent: safe to run more than once.
 -- ============================================================================
 
-insert into storage.buckets (id, name, public)
-values ('product-images', 'product-images', true)
-on conflict (id) do nothing;
+insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
+values (
+  'product-images', 'product-images', true,
+  52428800, -- 50 MB cap per file (comfortably covers a short product video)
+  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
+)
+on conflict (id) do update set
+  file_size_limit = excluded.file_size_limit,
+  allowed_mime_types = excluded.allowed_mime_types;
 
 drop policy if exists "public read product-images" on storage.objects;
 create policy "public read product-images"
