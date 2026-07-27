#!/usr/bin/env bash
# apply_design_polish.sh
# Run from the repo root in your Codespace, on a fresh branch off main:
#
#   git checkout main && git pull
#   git checkout -b claude/design-polish-pass
#   bash apply_design_polish.sh
#   git add -A && git commit -m "fix(home): design polish pass — contrast, color hierarchy, whitespace, nav"
#   git push -u origin claude/design-polish-pass
#
# Then open the PR at:
#   https://github.com/yoosuf0806/go-website/compare/main...claude/design-polish-pass
#
# Pure frontend change — no Supabase migration to apply.

set -euo pipefail

PATCH_FILE="$(mktemp)"
cat > "$PATCH_FILE" << 'PATCH_EOF'
diff --git a/src/components/storefront/PromoTicker.tsx b/src/components/storefront/PromoTicker.tsx
index c5b0bc6..2c7ecb4 100644
--- a/src/components/storefront/PromoTicker.tsx
+++ b/src/components/storefront/PromoTicker.tsx
@@ -1,20 +1,35 @@
+import { useEffect, useState } from 'react'
 import { useCatalog } from '../../contexts/CatalogContext'
 
-// Slim scrolling promo strip at the very top (reference-matched pink marquee).
-// Messages come from the editable content blob. Doubled content + 50% marquee
-// gives a seamless loop; pauses under prefers-reduced-motion (see index.css).
+// Slim promo strip at the very top. Rotates through one message at a time
+// (cross-fade) instead of a continuous scrolling wall of text. Messages come
+// from the editable content blob. Pauses under prefers-reduced-motion.
 export default function PromoTicker() {
   const { catalog } = useCatalog()
-  const row = [...catalog.content.promoMessages, ...catalog.content.promoMessages]
+  const messages = catalog.content.promoMessages
+  const [index, setIndex] = useState(0)
+
+  useEffect(() => {
+    if (messages.length <= 1) return
+    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 4000)
+    return () => clearInterval(id)
+  }, [messages.length])
+
+  if (messages.length === 0) return null
+
   return (
-    <div className="overflow-hidden bg-pink py-2.5 text-[13px] font-semibold tracking-wide text-white">
-      <div className="flex w-max animate-marquee whitespace-nowrap">
-        {row.map((msg, i) => (
-          <span key={i} className="px-12">
-            {msg}
-          </span>
-        ))}
-      </div>
+    <div className="relative h-9 overflow-hidden bg-pink text-[13px] font-semibold tracking-wide text-white">
+      {messages.map((msg, i) => (
+        <p
+          key={i}
+          aria-hidden={i !== index}
+          className={`absolute inset-0 flex items-center justify-center px-6 text-center transition-opacity duration-500 motion-reduce:transition-none ${
+            i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
+          }`}
+        >
+          {msg}
+        </p>
+      ))}
     </div>
   )
 }
diff --git a/src/pages/Home.tsx b/src/pages/Home.tsx
index 542946a..347be3d 100644
--- a/src/pages/Home.tsx
+++ b/src/pages/Home.tsx
@@ -49,7 +49,7 @@ export default function Home() {
           style={
             heroImage
               ? {
-                  backgroundImage: `linear-gradient(135deg, rgba(26,10,0,0.9) 0%, rgba(45,15,5,0.72) 50%, rgba(26,10,0,0.94) 100%), url(${heroImage})`,
+                  backgroundImage: `linear-gradient(90deg, rgba(26,10,0,0.92) 0%, rgba(26,10,0,0.72) 38%, rgba(26,10,0,0.25) 75%, rgba(26,10,0,0.1) 100%), url(${heroImage})`,
                   backgroundSize: 'cover',
                   backgroundPosition: 'center',
                 }
@@ -84,32 +84,29 @@ export default function Home() {
 
       {/* HOT PICKS — admin-flagged featured products, directly below the hero */}
       {vis.hotPicks !== false && hotPicks.length > 0 && (
-        <section className="px-6 pb-6 pt-4">
+        <section className="bg-white px-6 py-20">
           <div className="mx-auto max-w-6xl">
-            <div className="flex items-end justify-between gap-4">
-              <div>
-                <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] text-navy">Hot Picks 🔥</h2>
-                <p className="mt-1 text-neutral-500">Our most-loved brownies right now.</p>
-              </div>
+            <SectionHeader title="Hot Picks 🔥" sub="Our most-loved brownies right now." />
+            <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
+              {hotPicks.map((product) => (
+                <ProductTile key={product.id} product={product} packages={packages} />
+              ))}
+            </div>
+            <div className="mt-10 text-center">
               <Link
                 to="/shop"
-                className="hidden whitespace-nowrap rounded-full border-2 border-navy px-5 py-2 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white sm:inline-block"
+                className="inline-block rounded-full border-2 border-navy px-7 py-3.5 text-[15px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
               >
-                View all
+                View All →
               </Link>
             </div>
-            <div className="mt-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
-              {hotPicks.map((product) => (
-                <ProductTile key={product.id} product={product} packages={packages} />
-              ))}
-            </div>
           </div>
         </section>
       )}
 
       {/* TRUST BAR */}
       {vis.trust !== false && (
-      <div className="bg-pink-light py-10">
+      <div className="bg-warmgray py-10">
         <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
           {trust.map((t) => (
             <Trust key={t.title} icon={t.icon} title={t.title} body={t.body} />
@@ -133,7 +130,7 @@ export default function Home() {
               ⭐ OUR SIGNATURE
             </span>
             <h2 className="mt-5 text-[clamp(1.8rem,4vw,3rem)] text-navy">Say It With a Brownie Slab.</h2>
-            <p className="mt-5 text-[17px] leading-relaxed text-[#5a4038]">
+            <p className="mt-5 text-[18px] leading-relaxed text-[#5a4038]">
               Write anything on it — Happy Birthday, Sorry My Love, I Love You Mom. Our custom brownie slabs are
               the gift nobody expects but everyone remembers.
             </p>
@@ -144,7 +141,7 @@ export default function Home() {
                 'Feeds 8–12 people',
                 'Baked fresh to order, never pre-made',
               ].map((f) => (
-                <li key={f} className="flex items-center gap-3 text-[15px] font-medium text-navy">
+                <li key={f} className="flex items-center gap-3 text-base font-medium text-navy">
                   <span className="text-lg font-extrabold text-pink">✓</span>
                   {f}
                 </li>
@@ -173,7 +170,7 @@ export default function Home() {
             <div className="mt-10 text-center">
               <Link
                 to="/shop"
-                className="inline-block rounded-full border-2 border-navy px-7 py-3 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white"
+                className="inline-block rounded-full border-2 border-navy px-7 py-3.5 text-[15px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
               >
                 Browse All Brownies →
               </Link>
@@ -184,13 +181,13 @@ export default function Home() {
 
       {/* CATEGORY GRID */}
       {vis.categories !== false && (
-      <section className="px-6 py-20">
+      <section className="bg-warmgray px-6 py-24">
         <div className="mx-auto max-w-6xl">
           <SectionHeader
             title="Find Your Perfect Box"
             sub="Browse by occasion — from everyday treats to corporate gifts and wedding favours."
           />
-          <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
+          <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
             {categories.map((c, i) => (
               <CategoryCard
                 key={c.title}
@@ -209,23 +206,28 @@ export default function Home() {
       )}
 
       {/* CORPORATE / BULK ORDERS CTA — split image + copy */}
-      <section className="bg-pink px-6 py-20 text-white">
+      <section className="bg-white px-6 py-24">
         <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
           <div>
-            <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)] leading-tight">Gifting for Your Team or Event?</h2>
-            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-white/90">
+            <span className="inline-block rounded-full bg-pink-light px-4 py-1.5 text-xs font-bold tracking-wide text-pink">
+              FOR TEAMS & EVENTS
+            </span>
+            <h2 className="mt-5 text-[clamp(1.7rem,3.5vw,2.6rem)] leading-tight text-navy">
+              Gifting for Your Team or Event?
+            </h2>
+            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-neutral-500">
               We handle everything — custom quantities, gift packaging, and island-wide delivery. Perfect for
               office events, client appreciation, and team celebrations.
             </p>
             <Link
               to="/corporate"
-              className="mt-7 inline-block rounded-full bg-white px-8 py-4 text-[15px] font-bold text-pink transition-transform hover:-translate-y-0.5"
+              className="mt-7 inline-block rounded-full bg-pink px-8 py-4 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(217,45,86,0.32)] transition-transform hover:-translate-y-0.5"
             >
               Get a Quote on WhatsApp
             </Link>
           </div>
           <div
-            className="aspect-[4/3] rounded-[18px] bg-[#a03040] bg-cover bg-center shadow-[0_20px_44px_rgba(0,0,0,0.25)]"
+            className="aspect-[4/3] rounded-[18px] bg-navy bg-cover bg-center shadow-[0_20px_44px_rgba(0,0,0,0.15)]"
             style={bulkImage ? { backgroundImage: `url(${bulkImage})` } : undefined}
           />
         </div>
@@ -233,12 +235,12 @@ export default function Home() {
 
       {/* CTA BANNER */}
       {vis.ctaBanner !== false && (
-      <section className="bg-pink px-6 py-20 text-center text-white">
-        <h2 className="text-[clamp(2rem,4vw,3.5rem)]">{ctaBanner.title}</h2>
-        <p className="mx-auto mt-4 max-w-md text-lg opacity-90">{ctaBanner.body}</p>
+      <section className="bg-warmgray px-6 py-20 text-center">
+        <h2 className="text-[clamp(2rem,4vw,3.5rem)] text-navy">{ctaBanner.title}</h2>
+        <p className="mx-auto mt-4 max-w-md text-lg text-neutral-500">{ctaBanner.body}</p>
         <Link
           to="/shop"
-          className="mt-8 inline-block rounded-full bg-white px-11 py-4 font-display text-lg text-pink transition-transform hover:-translate-y-0.5"
+          className="mt-8 inline-block rounded-full bg-pink px-8 py-4 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(217,45,86,0.32)] transition-transform hover:-translate-y-0.5"
         >
           {ctaBanner.cta}
         </Link>
@@ -247,9 +249,9 @@ export default function Home() {
 
       {/* HOW IT WORKS */}
       {vis.howItWorks !== false && (
-      <section className="bg-navy px-6 py-20">
+      <section className="bg-white px-6 py-24">
         <div className="mx-auto max-w-6xl">
-          <SectionHeader title="How It Works" sub="From box to door in 4 simple steps." dark />
+          <SectionHeader title="How It Works" sub="From box to door in 4 simple steps." />
           <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
             {howItWorks.map((step) => (
               <Step key={step.title} n={step.icon} title={step.title} body={step.body} />
@@ -261,14 +263,14 @@ export default function Home() {
 
       {/* TESTIMONIALS */}
       {vis.testimonials !== false && reviews_section && featuredReviews.length > 0 && (
-        <section className="bg-pink-light px-6 py-20">
+        <section className="bg-warmgray px-6 py-24">
           <div className="mx-auto max-w-6xl">
             <SectionHeader title={testimonialsHeading.title} sub={testimonialsHeading.sub} />
             <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
               {featuredReviews.slice(0, 3).map((review) => (
                 <figure key={review.id} className="rounded-[20px] border-l-4 border-pink bg-white p-8">
                   <div className="tracking-[2px] text-[#f4a100]">{'★'.repeat(review.rating)}</div>
-                  <blockquote className="mt-4 text-sm italic leading-relaxed text-neutral-700">
+                  <blockquote className="mt-4 text-[15px] italic leading-relaxed text-neutral-700">
                     “{review.body}”
                   </blockquote>
                   <figcaption className="mt-5 flex items-center gap-2.5">
@@ -294,7 +296,7 @@ export default function Home() {
               href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to place an order.")}`}
               target="_blank"
               rel="noopener noreferrer"
-              className="mt-8 inline-block animate-pulse rounded-full bg-pink px-10 py-[18px] text-lg font-bold text-white transition-transform hover:-translate-y-0.5"
+              className="mt-8 inline-block animate-pulse rounded-full bg-pink px-8 py-4 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(217,45,86,0.4)] transition-transform hover:-translate-y-0.5"
             >
               📱 Order on WhatsApp
             </a>
@@ -303,7 +305,7 @@ export default function Home() {
       )}
 
       {/* BADGE STRIP */}
-      <div className="bg-warmgray px-6 py-14">
+      <div className="bg-warmgray px-6 py-16">
         <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 lg:grid-cols-4">
           {badges.map((b) => (
             <Badge key={b.title} icon={b.icon} title={b.title} body={b.body} />
@@ -372,9 +374,10 @@ function CategoryCard({
           {emoji}
         </div>
       )}
-      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy/85 to-transparent p-6 text-white">
+      <div className="absolute inset-0 bg-black/35" />
+      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy/90 via-navy/40 to-transparent p-6 text-white">
         <h3 className="text-xl">{title}</h3>
-        <p className="mt-1.5 text-xs leading-relaxed opacity-85">{body}</p>
+        <p className="mt-1.5 text-[13px] leading-relaxed opacity-90">{body}</p>
         <span className="mt-3 text-xs font-bold text-white/90">{cta}</span>
       </div>
     </Link>
@@ -384,11 +387,11 @@ function CategoryCard({
 function Step({ n, title, body }: { n: string; title: string; body: string }) {
   return (
     <div className="text-center">
-      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/20 bg-pink font-display text-xl text-white shadow-lg shadow-pink/30">
+      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink font-display text-xl text-white shadow-lg shadow-pink/25">
         {n}
       </div>
-      <h3 className="mt-5 text-base text-white">{title}</h3>
-      <p className="mt-2 text-[13px] leading-relaxed text-white/70">{body}</p>
+      <h3 className="mt-5 text-base text-navy">{title}</h3>
+      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
     </div>
   )
 }
PATCH_EOF

git apply "$PATCH_FILE"
rm -f "$PATCH_FILE"

echo "Applied. Files changed:"
echo "  - src/pages/Home.tsx"
echo "  - src/components/storefront/PromoTicker.tsx"
