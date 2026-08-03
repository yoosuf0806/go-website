#!/usr/bin/env bash
# apply_brownie_slab_page.sh
# Run from the repo root in your Codespace, on a fresh branch off main:
#
#   git checkout main && git pull
#   git checkout -b claude/brownie-slab-page
#   bash apply_brownie_slab_page.sh
#   git add -A && git commit -m "feat(slab): dedicated Brownie Slab landing page (/slab) + nav reorder + admin editor"
#   git push -u origin claude/brownie-slab-page
#
# Open the PR:
#   https://github.com/yoosuf0806/go-website/compare/main...claude/brownie-slab-page
#
# No migration and no Supabase action needed — the page content lives in the
# existing site_settings 'content' blob and is picked up on Publish.
#
# WHAT THIS DOES:
#  - New /slab page: admin-image banner, "how it works" strip, "Choose your
#    flavour" (driven LIVE by slab-enabled products — isSlabAvailable OR
#    isSlab15Available), admin-managed product gallery, admin-editable FAQ, and
#    a sticky "Order a slab" CTA on mobile.
#  - Nav reordered to: Brownie Slab | Wedding Orders | Corporate Orders | Shop All
#    (header, mobile menu, footer). "Brownie Slab" now points to /slab.
#  - Home "Build your slab" CTA now links to /slab (was /shop).
#  - Admin › Content gains a "Brownie Slab page" section (banner + image,
#    how-it-works, headings, gallery add/remove, FAQ) and a Brownie Slab SEO row.
#
# This patch is independent of the payment/kitchen PR — apply in any order.

set -euo pipefail
PATCH_FILE="$(mktemp)"
cat > "$PATCH_FILE" << 'PATCH_EOF'
diff --git a/scripts/prerender.ts b/scripts/prerender.ts
index b9bda3d..892e478 100644
--- a/scripts/prerender.ts
+++ b/scripts/prerender.ts
@@ -41,6 +41,7 @@ async function main() {
     { url: '/shop', out: 'shop/index.html' },
     { url: '/corporate', out: 'corporate/index.html' },
     { url: '/wedding', out: 'wedding/index.html' },
+    { url: '/slab', out: 'slab/index.html' },
     { url: '/policies/returns', out: 'policies/returns/index.html' },
     { url: '/policies/payment', out: 'policies/payment/index.html' },
     ...catalog.products.map((p) => ({
diff --git a/src/App.tsx b/src/App.tsx
index 1bcc48d..1faecea 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -8,6 +8,7 @@ import Shop from './pages/Shop'
 import ProductDetail from './pages/ProductDetail'
 import Corporate from './pages/Corporate'
 import Wedding from './pages/Wedding'
+import Slab from './pages/Slab'
 import Policy from './pages/Policy'
 import NotFound from './pages/NotFound'
 
@@ -48,6 +49,7 @@ export default function App() {
         <Route path="/shop/:slug" element={<ProductDetail />} />
         <Route path="/corporate" element={<Corporate />} />
         <Route path="/wedding" element={<Wedding />} />
+        <Route path="/slab" element={<Slab />} />
         <Route path="/policies/:slug" element={<Policy />} />
       </Route>
 
diff --git a/src/components/storefront/StorefrontLayout.tsx b/src/components/storefront/StorefrontLayout.tsx
index df7b2ac..f298e1b 100644
--- a/src/components/storefront/StorefrontLayout.tsx
+++ b/src/components/storefront/StorefrontLayout.tsx
@@ -13,10 +13,10 @@ import CheckoutModal from './CheckoutModal'
 const HEADER_HEIGHT = 68
 
 const NAV = [
-  { to: '/shop', label: 'Shop All' },
+  { to: '/slab', label: 'Brownie Slab' },
   { to: '/wedding', label: 'Wedding Orders' },
   { to: '/corporate', label: 'Corporate Orders' },
-  { to: '/shop', label: 'Brownie Slab' },
+  { to: '/shop', label: 'Shop All' },
 ]
 
 // Shared storefront chrome: pink promo marquee, fixed header (transparent over
@@ -234,9 +234,9 @@ function Footer() {
           <FooterCol
             title="Shop"
             links={[
-              { to: '/shop', label: 'Shop All' },
+              { to: '/slab', label: 'Brownie Slab' },
               { to: '/corporate', label: 'Bulk Orders' },
-              { to: '/shop', label: 'Brownie Slab' },
+              { to: '/shop', label: 'Shop All' },
             ]}
           />
           <FooterCol
diff --git a/src/pages/Home.tsx b/src/pages/Home.tsx
index 0159261..f80e600 100644
--- a/src/pages/Home.tsx
+++ b/src/pages/Home.tsx
@@ -127,7 +127,7 @@ export default function Home() {
               {slabImage && <BrownieImage src={slabImage} alt="Brownie slab" className="h-full w-full" />}
             </div>
             <Link
-              to="/shop"
+              to="/slab"
               className="mt-4 block rounded-2xl bg-navy py-4 text-center text-base font-bold text-white transition-transform hover:-translate-y-0.5"
             >
               {homeSlab.cta}
diff --git a/src/pages/Slab.tsx b/src/pages/Slab.tsx
new file mode 100644
index 0000000..a2832cf
--- /dev/null
+++ b/src/pages/Slab.tsx
@@ -0,0 +1,125 @@
+import { useCatalog } from '../contexts/CatalogContext'
+import ProductTile from '../components/storefront/ProductTile'
+import BrownieImage from '../components/storefront/BrownieImage'
+import Accordion from '../components/storefront/Accordion'
+import Seo from '../components/Seo'
+
+// Brownie Slab landing page (/slab). Banner + how-it-works + a flavour picker
+// driven LIVE by slab-enabled products (12pc or 15pc slab), an admin-managed
+// product gallery, and an admin-editable FAQ. Copy/images come from
+// content.slab; the flavour list is read from the catalog so it never drifts
+// from what's actually orderable.
+export default function Slab() {
+  const { catalog } = useCatalog()
+  const { content, products, packages } = catalog
+  const slab = content.slab
+
+  // Slab-enabled = orderable as the 12pc slab OR the 15pc slab.
+  const slabProducts = products.filter((p) => p.isSlabAvailable || p.isSlab15Available)
+
+  return (
+    <div className="bg-blush-50">
+      <Seo title={slab.banner.title} description={content.seo.slab.description} path="/slab" />
+
+      {/* ── BANNER ─────────────────────────────────────────── */}
+      <section className="relative overflow-hidden bg-navy text-white">
+        {slab.banner.imageUrl && (
+          <div className="absolute inset-0">
+            <BrownieImage src={slab.banner.imageUrl} alt="" className="h-full w-full opacity-40" priority />
+            <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-navy/40" />
+          </div>
+        )}
+        <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-24">
+          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#f4b9c8]">
+            {slab.banner.eyebrow}
+          </span>
+          <h1 className="mt-3 max-w-2xl font-display text-[34px] leading-[1.08] md:text-[52px]">
+            {slab.banner.title}
+          </h1>
+          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/75 md:text-lg">
+            {slab.banner.subtitle}
+          </p>
+          <a
+            href="#flavours"
+            className="mt-7 inline-block rounded-2xl bg-pink px-7 py-4 text-base font-bold text-white transition-transform hover:-translate-y-0.5"
+          >
+            {slab.banner.cta}
+          </a>
+        </div>
+      </section>
+
+      {/* ── HOW IT WORKS ───────────────────────────────────── */}
+      {slab.howItWorks.length > 0 && (
+        <section className="mx-auto max-w-5xl px-6 py-10 md:py-14">
+          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
+            {slab.howItWorks.map((step, i) => (
+              <div key={i} className="rounded-2xl border border-blush-200 bg-white p-5 text-center md:p-6">
+                <div className="text-3xl">{step.icon}</div>
+                <div className="mt-2 font-display text-lg text-navy">{step.title}</div>
+                <p className="mt-1 text-sm leading-relaxed text-[#5c4450]">{step.body}</p>
+              </div>
+            ))}
+          </div>
+        </section>
+      )}
+
+      {/* ── CHOOSE YOUR FLAVOUR ────────────────────────────── */}
+      <section id="flavours" className="mx-auto max-w-6xl px-[22px] py-10 md:px-8 md:py-14">
+        <div className="pb-1 text-center">
+          <h2 className="font-display text-[27px] text-navy md:text-[34px]">{slab.flavoursHeading}</h2>
+          {slab.flavoursIntro && (
+            <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-[#5c4450]">{slab.flavoursIntro}</p>
+          )}
+        </div>
+
+        {slabProducts.length > 0 ? (
+          <div className="mt-7 grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
+            {slabProducts.map((product) => (
+              <ProductTile key={product.id} product={product} packages={packages} />
+            ))}
+          </div>
+        ) : (
+          <p className="mt-8 text-center text-[15px] text-neutral-500">
+            No slab flavours are available right now — check back soon.
+          </p>
+        )}
+      </section>
+
+      {/* ── PRODUCT GALLERY ────────────────────────────────── */}
+      {slab.gallery.length > 0 && (
+        <section className="bg-white py-10 md:py-14">
+          <div className="mx-auto max-w-6xl px-[22px] md:px-8">
+            <h2 className="text-center font-display text-[27px] text-navy md:text-[34px]">{slab.galleryHeading}</h2>
+            <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
+              {slab.gallery.map((url, i) => (
+                <div key={i} className="aspect-square overflow-hidden rounded-2xl bg-blush-50">
+                  <BrownieImage src={url} alt={`Brownie slab ${i + 1}`} className="h-full w-full" />
+                </div>
+              ))}
+            </div>
+          </div>
+        </section>
+      )}
+
+      {/* ── FAQ ────────────────────────────────────────────── */}
+      {slab.faq.length > 0 && (
+        <section className="mx-auto max-w-3xl px-6 py-10 md:py-14">
+          <h2 className="text-center font-display text-[27px] text-navy md:text-[34px]">{slab.faqHeading}</h2>
+          <div className="mt-6">
+            <Accordion items={slab.faq.map((item) => ({ title: item.q, content: item.a }))} />
+          </div>
+        </section>
+      )}
+
+      {/* ── STICKY CTA (mobile) ────────────────────────────── */}
+      <div className="sticky bottom-0 z-20 border-t border-blush-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
+        <a
+          href="#flavours"
+          className="block w-full rounded-2xl bg-pink py-3.5 text-center text-base font-bold text-white"
+        >
+          Order a slab
+        </a>
+      </div>
+    </div>
+  )
+}
diff --git a/src/pages/admin/Content.tsx b/src/pages/admin/Content.tsx
index 714a4b5..80db94b 100644
--- a/src/pages/admin/Content.tsx
+++ b/src/pages/admin/Content.tsx
@@ -9,6 +9,7 @@ import type {
   QuoteLandingContent,
   SeoMeta,
   SiteContent,
+  SlabLandingContent,
 } from '../../types/content'
 import { uploadImage } from '../../lib/adminProducts'
 import Toast from '../../components/ui/Toast'
@@ -199,12 +200,15 @@ function ContentForm({ initial, onSaved }: { initial: SiteContent; onSaved: () =
         onChange={(v) => set('wedding', v)}
       />
 
+      <SlabPageEditor content={form.slab} onChange={(v) => set('slab', v)} />
+
       <Section title="SEO">
         <Text label="Site name" value={form.seo.siteName} onChange={(v) => set('seo', { ...form.seo, siteName: v })} />
         <SeoEditor label="Home" meta={form.seo.home} onChange={(m) => set('seo', { ...form.seo, home: m })} />
         <SeoEditor label="Shop" meta={form.seo.shop} onChange={(m) => set('seo', { ...form.seo, shop: m })} />
         <SeoEditor label="Corporate Orders" meta={form.seo.corporate} onChange={(m) => set('seo', { ...form.seo, corporate: m })} />
         <SeoEditor label="Wedding Orders" meta={form.seo.wedding} onChange={(m) => set('seo', { ...form.seo, wedding: m })} />
+        <SeoEditor label="Brownie Slab" meta={form.seo.slab} onChange={(m) => set('seo', { ...form.seo, slab: m })} />
       </Section>
 
       <div className="sticky bottom-0 -mx-2 flex items-center gap-3 bg-neutral-50/90 px-2 py-3 backdrop-blur">
@@ -581,3 +585,92 @@ function PricingTiersEditor({ tiers, onChange }: { tiers: PricingTier[]; onChang
     </div>
   )
 }
+
+// Admin editor for the Brownie Slab landing page (/slab). The flavour list is
+// NOT edited here — it's read live from slab-enabled products. This edits the
+// banner (copy + image), how-it-works strip, section headings, the product
+// gallery (add/remove images), and the FAQ.
+function SlabPageEditor({
+  content,
+  onChange,
+}: {
+  content: SlabLandingContent
+  onChange: (v: SlabLandingContent) => void
+}) {
+  return (
+    <Section title="Brownie Slab page">
+      <p className="text-xs text-neutral-500">
+        The flavour cards are driven automatically by your slab-enabled products — no need to edit them here.
+      </p>
+
+      <div className="rounded border border-neutral-100 p-3">
+        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Banner</div>
+        <div className="mt-2 flex flex-col gap-2">
+          <Text label="Eyebrow" value={content.banner.eyebrow} onChange={(v) => onChange({ ...content, banner: { ...content.banner, eyebrow: v } })} />
+          <Text label="Title" value={content.banner.title} onChange={(v) => onChange({ ...content, banner: { ...content.banner, title: v } })} />
+          <Area label="Subtitle" value={content.banner.subtitle} onChange={(v) => onChange({ ...content, banner: { ...content.banner, subtitle: v } })} />
+          <Text label="Button" value={content.banner.cta} onChange={(v) => onChange({ ...content, banner: { ...content.banner, cta: v } })} />
+          <ImageField label="Banner image (optional)" value={content.banner.imageUrl} onChange={(url) => onChange({ ...content, banner: { ...content.banner, imageUrl: url } })} />
+        </div>
+      </div>
+
+      <div className="rounded border border-neutral-100 p-3">
+        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">How it works (3 steps)</div>
+        <div className="mt-2">
+          <IconCards items={content.howItWorks} onChange={(v) => onChange({ ...content, howItWorks: v })} iconLabel="Emoji" />
+        </div>
+      </div>
+
+      <Text label="Flavours heading" value={content.flavoursHeading} onChange={(v) => onChange({ ...content, flavoursHeading: v })} />
+      <Area label="Flavours intro" value={content.flavoursIntro} onChange={(v) => onChange({ ...content, flavoursIntro: v })} />
+
+      <div className="rounded border border-neutral-100 p-3">
+        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Product gallery</div>
+        <Text label="Gallery heading" value={content.galleryHeading} onChange={(v) => onChange({ ...content, galleryHeading: v })} />
+        <div className="mt-2">
+          <GalleryEditor images={content.gallery} onChange={(v) => onChange({ ...content, gallery: v })} />
+        </div>
+      </div>
+
+      <div className="rounded border border-neutral-100 p-3">
+        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">FAQ</div>
+        <Text label="FAQ heading" value={content.faqHeading} onChange={(v) => onChange({ ...content, faqHeading: v })} />
+        <div className="mt-2">
+          <FaqEditor items={content.faq} onChange={(v) => onChange({ ...content, faq: v })} />
+        </div>
+      </div>
+    </Section>
+  )
+}
+
+// Add/remove/reorder-free gallery editor: each row is an uploaded image with a
+// remove button; a trailing uploader appends. An empty gallery hides the
+// section on the storefront.
+function GalleryEditor({ images, onChange }: { images: string[]; onChange: (v: string[]) => void }) {
+  const removeAt = (i: number) => onChange(images.filter((_, j) => j !== i))
+  const addImage = (url: string | undefined) => {
+    if (url) onChange([...images, url])
+  }
+  return (
+    <div className="flex flex-col gap-3">
+      {images.length > 0 && (
+        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
+          {images.map((url, i) => (
+            <div key={i} className="relative">
+              <img src={url} alt={`Gallery ${i + 1}`} className="aspect-square w-full rounded object-cover" />
+              <button
+                type="button"
+                onClick={() => removeAt(i)}
+                className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs font-bold text-red-600 shadow hover:bg-white"
+                aria-label={`Remove image ${i + 1}`}
+              >
+                ✕
+              </button>
+            </div>
+          ))}
+        </div>
+      )}
+      <ImageField label="Add a gallery image" value={undefined} onChange={addImage} />
+    </div>
+  )
+}
diff --git a/src/types/content.test.ts b/src/types/content.test.ts
new file mode 100644
index 0000000..a21ee0e
--- /dev/null
+++ b/src/types/content.test.ts
@@ -0,0 +1,37 @@
+import { describe, it, expect } from 'vitest'
+import { mergeContent, DEFAULT_CONTENT } from './content'
+
+describe('mergeContent — Brownie Slab landing (content.slab)', () => {
+  it('falls back to slab defaults when the DB blob omits slab entirely', () => {
+    const merged = mergeContent({ promoMessages: ['x'] })
+    expect(merged.slab.banner.title).toBe(DEFAULT_CONTENT.slab.banner.title)
+    expect(merged.slab.faq.length).toBe(DEFAULT_CONTENT.slab.faq.length)
+  })
+
+  it('shallow-merges the banner so a single overridden field keeps the rest', () => {
+    const merged = mergeContent({ slab: { banner: { title: 'Custom slab title' } } as never })
+    expect(merged.slab.banner.title).toBe('Custom slab title')
+    // Untouched banner fields still come from defaults.
+    expect(merged.slab.banner.eyebrow).toBe(DEFAULT_CONTENT.slab.banner.eyebrow)
+  })
+
+  it('preserves an explicitly empty gallery (empty = hide the section)', () => {
+    const merged = mergeContent({ slab: { gallery: [] } as never })
+    expect(merged.slab.gallery).toEqual([])
+  })
+
+  it('keeps admin-provided gallery images', () => {
+    const merged = mergeContent({ slab: { gallery: ['a.jpg', 'b.jpg'] } as never })
+    expect(merged.slab.gallery).toEqual(['a.jpg', 'b.jpg'])
+  })
+
+  it('falls back to default FAQ when the DB left it empty', () => {
+    const merged = mergeContent({ slab: { faq: [] } as never })
+    expect(merged.slab.faq.length).toBe(DEFAULT_CONTENT.slab.faq.length)
+  })
+
+  it('exposes slab SEO with a default', () => {
+    const merged = mergeContent(null)
+    expect(merged.seo.slab.title).toContain('Brownie Slab')
+  })
+})
diff --git a/src/types/content.ts b/src/types/content.ts
index 53ae05d..287962a 100644
--- a/src/types/content.ts
+++ b/src/types/content.ts
@@ -156,9 +156,35 @@ export interface SiteContent {
     shop: SeoMeta
     corporate: SeoMeta
     wedding: SeoMeta
+    slab: SeoMeta
   }
   corporate: QuoteLandingContent
   wedding: QuoteLandingContent
+  /** Brownie Slab landing page (/slab): banner, how-it-works, flavour picker
+   *  (driven live by slab-enabled products), product gallery, and FAQ. */
+  slab: SlabLandingContent
+}
+
+// Brownie Slab landing page content. The flavour list itself is NOT stored
+// here — it's read live from slab-enabled products; this holds only the
+// editable copy, banner image, gallery images, and FAQ.
+export interface SlabLandingContent {
+  banner: {
+    eyebrow: string
+    title: string
+    subtitle: string
+    cta: string
+    imageUrl?: string
+  }
+  /** "How it works" strip. Reuses IconCard: icon = emoji, title, body. */
+  howItWorks: IconCard[]
+  flavoursHeading: string
+  flavoursIntro: string
+  galleryHeading: string
+  /** Admin-managed gallery image URLs. Empty = gallery section hidden. */
+  gallery: string[]
+  faqHeading: string
+  faq: FaqItem[]
 }
 
 export const DEFAULT_CONTENT: SiteContent = {
@@ -271,6 +297,10 @@ export const DEFAULT_CONTENT: SiteContent = {
       title: 'Wedding Favours & Gifting — Golden Oven',
       description: 'Brownie favours and gifting for engagements, bridal showers, and wedding receptions. Bulk pricing and custom packaging.',
     },
+    slab: {
+      title: 'Brownie Slab — Golden Oven',
+      description: 'One big shareable brownie slab, freshly baked in your choice of flavour. Perfect for celebrations, offices, and gifting. Add letter toppers free.',
+    },
   },
   corporate: {
     hero: {
@@ -402,6 +432,39 @@ export const DEFAULT_CONTENT: SiteContent = {
     preOrderLeadDays: 4,
     discountThreshold: 100,
   },
+  slab: {
+    banner: {
+      eyebrow: 'The Brownie Slab',
+      title: 'One big slab. Every bit shareable.',
+      subtitle: 'A generous, freshly baked brownie slab in your choice of flavour — cut it your way, top it with a free letter message, and make any table the centrepiece.',
+      cta: 'Choose your flavour',
+      imageUrl: undefined,
+    },
+    howItWorks: [
+      { icon: '🍫', title: 'Pick a flavour', body: 'Choose from our slab-ready brownie flavours.' },
+      { icon: '✍️', title: 'Add a message', body: 'Free letter toppers — spell out a name or a note.' },
+      { icon: '🚚', title: 'Freshly delivered', body: 'Baked to order and delivered islandwide.' },
+    ],
+    flavoursHeading: 'Choose your flavour',
+    flavoursIntro: 'Every one of these can be ordered as a full slab.',
+    galleryHeading: 'Our slab gallery',
+    gallery: [],
+    faqHeading: 'Brownie slab FAQ',
+    faq: [
+      {
+        q: 'How big is a brownie slab?',
+        a: 'The slab is a single large brownie made to share — sized to serve a group. Exact piece counts are shown on each flavour when you order.',
+      },
+      {
+        q: 'Can I add a message on top?',
+        a: 'Yes — letter toppers are free and built in. Spell out a name, a date, or a short message.',
+      },
+      {
+        q: 'How much notice do you need?',
+        a: 'Slabs are baked fresh to order. We recommend ordering at least a day ahead; larger orders may need more lead time.',
+      },
+    ],
+  },
 }
 
 /** Deep-merge a partial (DB) content object over the defaults so missing keys
@@ -431,6 +494,7 @@ export function mergeContent(partial: Partial<SiteContent> | null | undefined):
       shop: { ...DEFAULT_CONTENT.seo.shop, ...partial.seo?.shop },
       corporate: { ...DEFAULT_CONTENT.seo.corporate, ...partial.seo?.corporate },
       wedding: { ...DEFAULT_CONTENT.seo.wedding, ...partial.seo?.wedding },
+      slab: { ...DEFAULT_CONTENT.seo.slab, ...partial.seo?.slab },
     },
     promoMessages: partial.promoMessages?.length ? partial.promoMessages : DEFAULT_CONTENT.promoMessages,
     trust: partial.trust?.length ? partial.trust : DEFAULT_CONTENT.trust,
@@ -444,6 +508,22 @@ export function mergeContent(partial: Partial<SiteContent> | null | undefined):
     sectionVisibility: { ...DEFAULT_CONTENT.sectionVisibility, ...partial.sectionVisibility },
     corporate: mergeQuoteLanding(DEFAULT_CONTENT.corporate, partial.corporate),
     wedding: mergeQuoteLanding(DEFAULT_CONTENT.wedding, partial.wedding),
+    slab: mergeSlabLanding(DEFAULT_CONTENT.slab, partial.slab),
+  }
+}
+
+/** Merge a partial SlabLandingContent over defaults. gallery is intentionally
+ *  preserved as-is (an empty array is a valid "hide the gallery" state), while
+ *  howItWorks/faq fall back to defaults when the DB left them empty. */
+function mergeSlabLanding(base: SlabLandingContent, partial?: Partial<SlabLandingContent>): SlabLandingContent {
+  if (!partial) return base
+  return {
+    ...base,
+    ...partial,
+    banner: { ...base.banner, ...partial.banner },
+    howItWorks: partial.howItWorks?.length ? partial.howItWorks : base.howItWorks,
+    faq: partial.faq?.length ? partial.faq : base.faq,
+    gallery: partial.gallery ?? base.gallery,
   }
 }
 
PATCH_EOF
echo "→ Applying patch…"; git apply --index "$PATCH_FILE"; rm -f "$PATCH_FILE"
echo "→ Installing deps…"; npm install --silent
echo "→ Snapshot…"; npm run snapshot --silent || true
echo "→ Typecheck…"; npx tsc -b
echo "→ Lint…"; npx oxlint
echo "→ Tests…"; npx vitest run
echo "→ Build…"; npm run build
echo
echo "✅ Done. git add -A && commit && push, then open the PR."
echo "   https://github.com/yoosuf0806/go-website/compare/main...claude/brownie-slab-page"