#!/usr/bin/env bash
# apply_home_sections_revamp.sh
# Run from the repo root in your Codespace, on a fresh branch off main:
#
#   git checkout main && git pull
#   git checkout -b claude/home-sections-revamp
#   bash apply_home_sections_revamp.sh
#   git add -A && git commit -m "feat(home): add slab spotlight, flavour grid, corporate CTA split, final WhatsApp CTA"
#   git push -u origin claude/home-sections-revamp
#
# Then open the PR at:
#   https://github.com/yoosuf0806/go-website/compare/main...claude/home-sections-revamp
#
# Pure frontend change — no Supabase migration to apply.

set -euo pipefail

PATCH_FILE="$(mktemp)"
cat > "$PATCH_FILE" << 'PATCH_EOF'
diff --git a/src/pages/Home.tsx b/src/pages/Home.tsx
index 8ebc5b9..542946a 100644
--- a/src/pages/Home.tsx
+++ b/src/pages/Home.tsx
@@ -1,5 +1,6 @@
 import { Link } from 'react-router-dom'
 import { useCatalog } from '../contexts/CatalogContext'
+import { toWhatsAppNumber } from '../lib/format'
 import Slideshow from '../components/storefront/Slideshow'
 import HeroCarousel from '../components/storefront/HeroCarousel'
 import ProductTile from '../components/storefront/ProductTile'
@@ -19,6 +20,13 @@ export default function Home() {
   // section never points at a sold-out product.
   const hotPicks = products.filter((p) => p.isHotPick && p.inStock)
   const heroImage = hotPicks.find((p) => p.imageUrl)?.imageUrl ?? products.find((p) => p.imageUrl)?.imageUrl ?? null
+  const slabTile = categories.find((c) => /slab/i.test(c.title))
+  const slabImage = slabTile?.imageUrl ?? heroImage
+  const bulkTile = categories.find((c) => /bulk|corporate|wedding/i.test(c.title))
+  const bulkImage =
+    products.find((p) => p.isCorporate && p.imageUrl)?.imageUrl ?? bulkTile?.imageUrl ?? heroImage
+  const flavourGrid = products.filter((p) => p.inStock).slice(0, 8)
+  const waNumber = toWhatsAppNumber(settings.business.whatsapp_number)
 
   return (
     <div>
@@ -113,6 +121,67 @@ export default function Home() {
       {/* SLIDESHOW */}
       {vis.slideshow !== false && <Slideshow promoSlides={content.promoSlides} />}
 
+      {/* SLAB SPOTLIGHT — "Say It With a Brownie Slab" */}
+      <section className="bg-warmgray px-6 py-24">
+        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
+          <div
+            className="aspect-square rounded-[20px] bg-navy bg-cover bg-center shadow-[0_30px_60px_rgba(26,10,0,0.2)]"
+            style={slabImage ? { backgroundImage: `url(${slabImage})` } : undefined}
+          />
+          <div>
+            <span className="inline-block rounded-full bg-pink px-4 py-1.5 text-xs font-bold tracking-wide text-white">
+              ⭐ OUR SIGNATURE
+            </span>
+            <h2 className="mt-5 text-[clamp(1.8rem,4vw,3rem)] text-navy">Say It With a Brownie Slab.</h2>
+            <p className="mt-5 text-[17px] leading-relaxed text-[#5a4038]">
+              Write anything on it — Happy Birthday, Sorry My Love, I Love You Mom. Our custom brownie slabs are
+              the gift nobody expects but everyone remembers.
+            </p>
+            <ul className="mt-7 flex flex-col gap-3.5">
+              {[
+                'Custom letter toppings',
+                'Choice of sparkles & drizzle',
+                'Feeds 8–12 people',
+                'Baked fresh to order, never pre-made',
+              ].map((f) => (
+                <li key={f} className="flex items-center gap-3 text-[15px] font-medium text-navy">
+                  <span className="text-lg font-extrabold text-pink">✓</span>
+                  {f}
+                </li>
+              ))}
+            </ul>
+            <Link
+              to="/shop"
+              className="mt-8 inline-block rounded-full bg-pink px-8 py-4 text-[15px] font-bold text-white shadow-[0_10px_26px_rgba(217,45,86,0.32)] transition-transform hover:-translate-y-0.5"
+            >
+              Customise Your Slab →
+            </Link>
+          </div>
+        </div>
+      </section>
+
+      {/* FLAVOUR GRID — "Pick Your Flavour" */}
+      {flavourGrid.length > 0 && (
+        <section className="bg-white px-6 py-24">
+          <div className="mx-auto max-w-6xl">
+            <SectionHeader title="Pick Your Flavour 🍫" sub="Every brownie baked fresh. Never pre-made, never sitting." />
+            <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
+              {flavourGrid.map((product) => (
+                <ProductTile key={product.id} product={product} packages={packages} />
+              ))}
+            </div>
+            <div className="mt-10 text-center">
+              <Link
+                to="/shop"
+                className="inline-block rounded-full border-2 border-navy px-7 py-3 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white"
+              >
+                Browse All Brownies →
+              </Link>
+            </div>
+          </div>
+        </section>
+      )}
+
       {/* CATEGORY GRID */}
       {vis.categories !== false && (
       <section className="px-6 py-20">
@@ -139,6 +208,29 @@ export default function Home() {
       </section>
       )}
 
+      {/* CORPORATE / BULK ORDERS CTA — split image + copy */}
+      <section className="bg-pink px-6 py-20 text-white">
+        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
+          <div>
+            <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)] leading-tight">Gifting for Your Team or Event?</h2>
+            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-white/90">
+              We handle everything — custom quantities, gift packaging, and island-wide delivery. Perfect for
+              office events, client appreciation, and team celebrations.
+            </p>
+            <Link
+              to="/corporate"
+              className="mt-7 inline-block rounded-full bg-white px-8 py-4 text-[15px] font-bold text-pink transition-transform hover:-translate-y-0.5"
+            >
+              Get a Quote on WhatsApp
+            </Link>
+          </div>
+          <div
+            className="aspect-[4/3] rounded-[18px] bg-[#a03040] bg-cover bg-center shadow-[0_20px_44px_rgba(0,0,0,0.25)]"
+            style={bulkImage ? { backgroundImage: `url(${bulkImage})` } : undefined}
+          />
+        </div>
+      </section>
+
       {/* CTA BANNER */}
       {vis.ctaBanner !== false && (
       <section className="bg-pink px-6 py-20 text-center text-white">
@@ -192,6 +284,24 @@ export default function Home() {
         </section>
       )}
 
+      {/* FINAL CTA — Ready to Order? */}
+      {waNumber && (
+        <section className="bg-navy px-6 py-24 text-center text-white">
+          <div className="mx-auto max-w-xl">
+            <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)]">Ready to Order?</h2>
+            <p className="mt-3 text-[17px] text-white/75">Call or WhatsApp us — we'll sort everything.</p>
+            <a
+              href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to place an order.")}`}
+              target="_blank"
+              rel="noopener noreferrer"
+              className="mt-8 inline-block animate-pulse rounded-full bg-pink px-10 py-[18px] text-lg font-bold text-white transition-transform hover:-translate-y-0.5"
+            >
+              📱 Order on WhatsApp
+            </a>
+          </div>
+        </section>
+      )}
+
       {/* BADGE STRIP */}
       <div className="bg-warmgray px-6 py-14">
         <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 lg:grid-cols-4">
diff --git a/src/types/content.ts b/src/types/content.ts
index f647ae7..54b155b 100644
--- a/src/types/content.ts
+++ b/src/types/content.ts
@@ -159,8 +159,7 @@ export const DEFAULT_CONTENT: SiteContent = {
   ],
   categories: [
     { emoji: '🍫', title: 'Shop All', body: 'Browse our full collection of freshly baked brownies.', cta: 'Browse All →', to: '/shop' },
-    { emoji: '🏢', title: 'Corporate Gifting', body: 'Bulk pricing for teams, events and client gifting.', cta: 'View Range →', to: '/corporate' },
-    { emoji: '💍', title: 'For Weddings', body: 'Elegant wedding favours with bulk pricing.', cta: 'Explore →', to: '/corporate' },
+    { emoji: '🏢', title: 'Bulk Orders', body: 'Bulk pricing for teams, events, weddings, and client gifting.', cta: 'View Range →', to: '/corporate' },
     { emoji: '🍰', title: 'Brownie Slab', body: 'Personalise with letter toppers and sparkles.', cta: 'Customise →', to: '/shop' },
   ],
   ctaBanner: {
@@ -169,7 +168,7 @@ export const DEFAULT_CONTENT: SiteContent = {
     cta: 'Browse All Brownies →',
   },
   howItWorks: [
-    { icon: '1', title: 'Choose a Category', body: 'Browse Shop All, Corporate, Wedding, or Brownie Slab.' },
+    { icon: '1', title: 'Choose a Category', body: 'Browse Shop All, Bulk Orders, or Brownie Slab.' },
     { icon: '2', title: 'Pick Your Package', body: 'Select a 9, 12, or 15-piece box, or a slab.' },
     { icon: '3', title: 'Personalise It', body: 'Letter toppers and sparkles on slab orders.' },
     { icon: '4', title: 'We Deliver Fresh', body: 'Baked fresh and delivered to your door, islandwide.' },
PATCH_EOF

git apply "$PATCH_FILE"
rm -f "$PATCH_FILE"

echo "Applied. Files changed:"
echo "  - src/pages/Home.tsx"
echo "  - src/types/content.ts"
