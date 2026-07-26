#!/usr/bin/env bash
# apply_ui_revamp.sh
# Run from the repo root in your Codespace, on a fresh branch off main:
#
#   git checkout main && git pull
#   git checkout -b claude/ui-revamp-pink-playfair
#   bash apply_ui_revamp.sh
#   git add -A && git commit -m "feat(design): revamp UI to new pink/near-black + Playfair Display/Inter look"
#   git push -u origin claude/ui-revamp-pink-playfair
#
# Then open the PR at:
#   https://github.com/yoosuf0806/go-website/compare/main...claude/ui-revamp-pink-playfair
#
# This is a pure frontend/design-token change — no Supabase migration to apply.

set -euo pipefail

PATCH_FILE="$(mktemp)"
cat > "$PATCH_FILE" << 'PATCH_EOF'
diff --git a/index.html b/index.html
index f8ad409..4a788c8 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
     <link rel="preconnect" href="https://fonts.googleapis.com" />
     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
     <link
-      href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Nunito:wght@300;400;500;600;700;800&display=swap"
+      href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700;800&display=swap"
       rel="stylesheet"
     />
     <!--app-head-->
diff --git a/src/components/storefront/StorefrontLayout.tsx b/src/components/storefront/StorefrontLayout.tsx
index 92cde7d..36d0760 100644
--- a/src/components/storefront/StorefrontLayout.tsx
+++ b/src/components/storefront/StorefrontLayout.tsx
@@ -1,5 +1,5 @@
-import { useState } from 'react'
-import { Outlet, Link, NavLink } from 'react-router-dom'
+import { useEffect, useState } from 'react'
+import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
 import { useCatalog } from '../../contexts/CatalogContext'
 import { useCartStore } from '../../stores/cart'
 import { toWhatsAppNumber } from '../../lib/format'
@@ -9,27 +9,36 @@ import PromoTicker from './PromoTicker'
 import CartDrawer from './CartDrawer'
 import CheckoutModal from './CheckoutModal'
 
+const HEADER_HEIGHT = 68
+
 const NAV = [
   { to: '/shop', label: 'Shop All' },
   { to: '/corporate', label: 'Bulk Orders' },
   { to: '/shop', label: 'Brownie Slab' },
 ]
 
-// Shared storefront chrome (reference-matched): pink promo marquee, sticky white
-// header with occasion nav + mobile drawer, navy footer, and a WhatsApp float.
+// Shared storefront chrome: pink promo marquee, fixed header (transparent over
+// the Home hero, solid everywhere else / once scrolled), navy footer, and a
+// WhatsApp float.
 export default function StorefrontLayout() {
   const { catalog } = useCatalog()
   const { settings } = catalog
+  const { pathname } = useLocation()
   const [cartOpen, setCartOpen] = useState(false)
   const [checkoutOpen, setCheckoutOpen] = useState(false)
   const [mobileNav, setMobileNav] = useState(false)
   const waNumber = toWhatsAppNumber(settings.business.whatsapp_number)
+  const isHome = pathname === '/'
 
   return (
     <div className="flex min-h-screen flex-col bg-white text-navy">
       <PromoTicker />
       <BannerBar banner={settings.banner} />
-      <Header onCartClick={() => setCartOpen(true)} onMenuClick={() => setMobileNav(true)} />
+      <Header
+        transparentOverHero={isHome}
+        onCartClick={() => setCartOpen(true)}
+        onMenuClick={() => setMobileNav(true)}
+      />
       <main className="flex-1">
         <Outlet />
       </main>
@@ -62,14 +71,39 @@ export default function StorefrontLayout() {
   )
 }
 
-function Header({ onCartClick, onMenuClick }: { onCartClick: () => void; onMenuClick: () => void }) {
+function Header({
+  transparentOverHero,
+  onCartClick,
+  onMenuClick,
+}: {
+  transparentOverHero: boolean
+  onCartClick: () => void
+  onMenuClick: () => void
+}) {
   const itemCount = useCartStore((s) => s.items.reduce((n, item) => n + item.boxQty, 0))
+  const [scrolled, setScrolled] = useState(false)
+
+  useEffect(() => {
+    if (!transparentOverHero) return
+    const onScroll = () => setScrolled(window.scrollY > 80)
+    onScroll()
+    window.addEventListener('scroll', onScroll, { passive: true })
+    return () => window.removeEventListener('scroll', onScroll)
+  }, [transparentOverHero])
+
+  const solid = !transparentOverHero || scrolled
+  const fg = solid ? 'text-navy' : 'text-white'
 
   return (
-    <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white">
-      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
-        <Link to="/" className="font-display text-2xl lowercase text-pink">
-          golden oven
+    <header
+      className={`sticky top-0 z-30 transition-colors duration-300 ${
+        solid ? 'border-b border-neutral-100 bg-white shadow-sm' : 'bg-white/10 backdrop-blur-md'
+      }`}
+      style={{ height: HEADER_HEIGHT }}
+    >
+      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
+        <Link to="/" className={`font-display text-2xl font-extrabold text-pink`}>
+          Golden Oven
         </Link>
 
         <nav className="hidden items-center gap-8 md:flex">
@@ -78,7 +112,7 @@ function Header({ onCartClick, onMenuClick }: { onCartClick: () => void; onMenuC
               key={item.label}
               to={item.to}
               className={({ isActive }) =>
-                `text-sm font-bold transition-colors hover:text-pink ${isActive ? 'text-pink' : 'text-navy'}`
+                `text-sm font-medium transition-colors hover:text-pink ${isActive ? 'text-pink' : fg}`
               }
             >
               {item.label}
@@ -87,12 +121,7 @@ function Header({ onCartClick, onMenuClick }: { onCartClick: () => void; onMenuC
         </nav>
 
         <div className="flex items-center gap-3">
-          <button
-            type="button"
-            onClick={onCartClick}
-            aria-label="Open cart"
-            className="relative text-2xl"
-          >
+          <button type="button" onClick={onCartClick} aria-label="Open cart" className={`relative text-2xl ${fg}`}>
             🛒
             {itemCount > 0 && (
               <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">
@@ -106,9 +135,9 @@ function Header({ onCartClick, onMenuClick }: { onCartClick: () => void; onMenuC
             aria-label="Open menu"
             className="flex flex-col gap-[5px] p-1 md:hidden"
           >
-            <span className="h-0.5 w-6 rounded bg-navy" />
-            <span className="h-0.5 w-6 rounded bg-navy" />
-            <span className="h-0.5 w-6 rounded bg-navy" />
+            <span className={`h-0.5 w-6 rounded ${solid ? 'bg-navy' : 'bg-white'}`} />
+            <span className={`h-0.5 w-6 rounded ${solid ? 'bg-navy' : 'bg-white'}`} />
+            <span className={`h-0.5 w-6 rounded ${solid ? 'bg-navy' : 'bg-white'}`} />
           </button>
         </div>
       </div>
@@ -118,45 +147,37 @@ function Header({ onCartClick, onMenuClick }: { onCartClick: () => void; onMenuC
 
 function MobileNav({ onClose, onCartClick }: { onClose: () => void; onCartClick: () => void }) {
   return (
-    <div className="fixed inset-0 z-50 md:hidden">
-      <button aria-label="Close menu" className="absolute inset-0 bg-black/45" onClick={onClose} />
-      <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
-        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
-          <span className="font-display text-xl lowercase text-pink">golden oven</span>
-          <button
-            type="button"
-            onClick={onClose}
-            aria-label="Close"
-            className="flex h-9 w-9 items-center justify-center rounded-full bg-warmgray"
-          >
-            ✕
-          </button>
-        </div>
-        <nav className="flex-1 py-2">
-          {NAV.map((item) => (
-            <Link
-              key={item.label}
-              to={item.to}
-              onClick={onClose}
-              className="block border-l-[3px] border-transparent px-6 py-3.5 text-[15px] font-bold text-navy hover:border-pink hover:bg-pink-light hover:text-pink"
-            >
-              {item.label}
-            </Link>
-          ))}
-        </nav>
-        <div className="border-t border-neutral-100 p-4 pb-safe">
-          <button
-            type="button"
-            onClick={() => {
-              onClose()
-              onCartClick()
-            }}
-            className="w-full rounded-full bg-pink py-3 text-sm font-bold text-white"
-          >
-            View Cart 🛒
-          </button>
-        </div>
-      </div>
+    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-navy md:hidden">
+      <button
+        aria-label="Close menu"
+        onClick={onClose}
+        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full text-white"
+      >
+        ✕
+      </button>
+      <Link to="/" onClick={onClose} className="px-6 py-2.5 font-display text-3xl font-semibold text-white">
+        Home
+      </Link>
+      {NAV.map((item) => (
+        <Link
+          key={item.label}
+          to={item.to}
+          onClick={onClose}
+          className="px-6 py-2.5 font-display text-3xl font-semibold text-white"
+        >
+          {item.label}
+        </Link>
+      ))}
+      <button
+        type="button"
+        onClick={() => {
+          onClose()
+          onCartClick()
+        }}
+        className="mt-6 rounded-full bg-pink px-9 py-3.5 text-[15px] font-bold text-white"
+      >
+        View Cart 🛒
+      </button>
     </div>
   )
 }
diff --git a/src/index.css b/src/index.css
index 0e60443..807a64c 100644
--- a/src/index.css
+++ b/src/index.css
@@ -9,7 +9,7 @@
   h1,
   h2,
   h3 {
-    @apply font-display font-normal;
+    @apply font-display font-bold;
   }
 }
 
diff --git a/src/pages/Home.tsx b/src/pages/Home.tsx
index 2b5b033..8ebc5b9 100644
--- a/src/pages/Home.tsx
+++ b/src/pages/Home.tsx
@@ -18,6 +18,7 @@ export default function Home() {
   // contains visible products already, so we just require in-stock so the
   // section never points at a sold-out product.
   const hotPicks = products.filter((p) => p.isHotPick && p.inStock)
+  const heroImage = hotPicks.find((p) => p.imageUrl)?.imageUrl ?? products.find((p) => p.imageUrl)?.imageUrl ?? null
 
   return (
     <div>
@@ -27,7 +28,7 @@ export default function Home() {
         path="/"
         jsonLd={[organizationJsonLd()]}
       />
-      {/* HERO — admin image carousel if slides exist, else the emoji-tile hero */}
+      {/* HERO — admin image carousel if slides exist, else the full-bleed hero */}
       {content.heroSlides.length > 0 ? (
         <HeroCarousel
           slides={content.heroSlides}
@@ -35,51 +36,39 @@ export default function Home() {
           secondaryCta={hero.secondaryCta}
         />
       ) : (
-        <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 py-16 md:grid-cols-2">
-          <div>
-            <h1 className="text-[clamp(2.1rem,7vw,4.2rem)] leading-[1.15] text-navy">
-              {hero.title} <em className="not-italic text-pink">{hero.highlight}</em> {hero.titleAfter}
-            </h1>
-            <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-500">{hero.subtitle}</p>
-            <div className="mt-8 flex flex-wrap gap-4">
-              <Link
-                to="/shop"
-                className="rounded-full bg-pink px-8 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-pink-dark"
-              >
-                {hero.primaryCta}
-              </Link>
-              <Link
-                to="/corporate"
-                className="rounded-full border-2 border-navy px-7 py-3 text-[15px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
-              >
-                {hero.secondaryCta}
-              </Link>
-            </div>
-          </div>
-          <div className="relative flex items-center justify-center">
-            <div className="grid max-w-[480px] grid-cols-2 gap-4">
-              {['🍫', '🍫', '🤍', '✨'].map((e, i) => (
-                <div
-                  key={i}
-                  className={`flex aspect-square items-center justify-center rounded-[20px] text-6xl ${
-                    i === 0
-                      ? 'mt-8 bg-gradient-to-br from-[#fce4ec] to-[#fff3e0]'
-                      : i === 1
-                        ? '-mt-8 bg-gradient-to-br from-[#f8bbd0] to-[#fce4ec]'
-                        : i === 2
-                          ? 'bg-gradient-to-br from-[#fff3e0] to-[#ffecb3]'
-                          : 'bg-gradient-to-br from-[#fce4ec] to-[#f8bbd0]'
-                  }`}
+        <section
+          className="relative flex min-h-[620px] items-center overflow-hidden bg-navy"
+          style={
+            heroImage
+              ? {
+                  backgroundImage: `linear-gradient(135deg, rgba(26,10,0,0.9) 0%, rgba(45,15,5,0.72) 50%, rgba(26,10,0,0.94) 100%), url(${heroImage})`,
+                  backgroundSize: 'cover',
+                  backgroundPosition: 'center',
+                }
+              : undefined
+          }
+        >
+          <div className="relative mx-auto w-full max-w-6xl px-6 py-24">
+            <div className="max-w-xl">
+              <p className="mb-5 text-xs font-bold uppercase tracking-[4px] text-pink">Homemade · Halal · Colombo</p>
+              <h1 className="text-[clamp(2.3rem,6vw,4.5rem)] leading-[1.05] text-white text-balance">
+                {hero.title} <em className="not-italic text-pink">{hero.highlight}</em> {hero.titleAfter}
+              </h1>
+              <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">{hero.subtitle}</p>
+              <div className="mt-9 flex flex-wrap gap-4">
+                <Link
+                  to="/shop"
+                  className="rounded-full bg-pink px-8 py-4 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(217,45,86,0.4)] transition-all hover:-translate-y-0.5 hover:bg-pink-dark"
                 >
-                  {e}
-                </div>
-              ))}
-            </div>
-            <div className="absolute -right-3 -top-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-navy shadow-lg">
-              🎁 Gift-ready boxes
-            </div>
-            <div className="absolute -bottom-2 -left-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-navy shadow-lg">
-              ⭐ 100+ happy customers
+                  {hero.primaryCta}
+                </Link>
+                <Link
+                  to="/corporate"
+                  className="rounded-full border-[1.5px] border-white/80 px-7 py-4 text-[15px] font-bold text-white transition-colors hover:bg-white hover:text-navy"
+                >
+                  {hero.secondaryCta}
+                </Link>
+              </div>
             </div>
           </div>
         </section>
@@ -112,7 +101,7 @@ export default function Home() {
 
       {/* TRUST BAR */}
       {vis.trust !== false && (
-      <div className="bg-navy py-8 text-white">
+      <div className="bg-pink-light py-10">
         <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
           {trust.map((t) => (
             <Trust key={t.title} icon={t.icon} title={t.title} body={t.body} />
@@ -166,9 +155,9 @@ export default function Home() {
 
       {/* HOW IT WORKS */}
       {vis.howItWorks !== false && (
-      <section className="bg-warmgray px-6 py-20">
+      <section className="bg-navy px-6 py-20">
         <div className="mx-auto max-w-6xl">
-          <SectionHeader title="How It Works" sub="From box to door in 4 simple steps." />
+          <SectionHeader title="How It Works" sub="From box to door in 4 simple steps." dark />
           <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
             {howItWorks.map((step) => (
               <Step key={step.title} n={step.icon} title={step.title} body={step.body} />
@@ -222,11 +211,11 @@ const CATEGORY_GRADIENTS = [
   'from-[#f3e5f5] to-[#e1bee7]',
 ]
 
-function SectionHeader({ title, sub }: { title: string; sub: string }) {
+function SectionHeader({ title, sub, dark = false }: { title: string; sub: string; dark?: boolean }) {
   return (
     <div className="text-center">
-      <h2 className="text-[clamp(2rem,4vw,3rem)] text-navy">{title}</h2>
-      <p className="mx-auto mt-3 max-w-xl leading-relaxed text-neutral-500">{sub}</p>
+      <h2 className={`text-[clamp(2rem,4vw,3rem)] ${dark ? 'text-white' : 'text-navy'}`}>{title}</h2>
+      <p className={`mx-auto mt-3 max-w-xl leading-relaxed ${dark ? 'text-white/70' : 'text-neutral-500'}`}>{sub}</p>
     </div>
   )
 }
@@ -235,8 +224,8 @@ function Trust({ icon, title, body }: { icon: string; title: string; body: strin
   return (
     <div>
       <div className="text-3xl">{icon}</div>
-      <strong className="mt-2 block font-display text-base font-normal text-pink">{title}</strong>
-      <p className="text-[13px] text-white/80">{body}</p>
+      <strong className="mt-2 block font-display text-2xl font-extrabold text-pink">{title}</strong>
+      <p className="text-[13px] font-semibold text-[#a03040]">{body}</p>
     </div>
   )
 }
@@ -285,11 +274,11 @@ function CategoryCard({
 function Step({ n, title, body }: { n: string; title: string; body: string }) {
   return (
     <div className="text-center">
-      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-pink font-display text-xl text-white shadow-lg shadow-pink/30">
+      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/20 bg-pink font-display text-xl text-white shadow-lg shadow-pink/30">
         {n}
       </div>
-      <h3 className="mt-5 text-base text-navy">{title}</h3>
-      <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">{body}</p>
+      <h3 className="mt-5 text-base text-white">{title}</h3>
+      <p className="mt-2 text-[13px] leading-relaxed text-white/70">{body}</p>
     </div>
   )
 }
diff --git a/tailwind.config.ts b/tailwind.config.ts
index 1afdcf8..9e5e909 100644
--- a/tailwind.config.ts
+++ b/tailwind.config.ts
@@ -1,32 +1,32 @@
 import type { Config } from 'tailwindcss'
 
-// Golden Oven storefront design system. Primary palette: bright pink + navy,
-// Abril Fatface headings + Nunito body (reference-matched). The blush/wine/ink
-// tokens remain temporarily while Shop/PDP/modals are migrated to the new look.
+// Golden Oven storefront design system. Primary palette: berry pink + near-black
+// espresso, Playfair Display headings + Inter body (2026 revamp). The blush/wine/ink
+// tokens remain temporarily while any remaining legacy surfaces are migrated.
 export default {
   content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
   theme: {
     extend: {
       colors: {
         pink: {
-          DEFAULT: '#EE2F63',
-          light: '#fff0f4',
-          dark: '#c4194a',
+          DEFAULT: '#d92d56',
+          light: '#f2dee3',
+          dark: '#a03040',
         },
         navy: {
-          DEFAULT: '#1A1A2E',
-          light: '#2d2d4e',
+          DEFAULT: '#1a0a00',
+          light: '#3a1a0a',
         },
-        warmgray: '#F4F4F4',
+        warmgray: '#fdf6f0',
         // Legacy tokens (removed once every surface is migrated).
         blush: { 50: '#fdf2f4', 100: '#fbe7ec', 200: '#f7d0da', 300: '#f0aebf' },
         wine: { DEFAULT: '#5d1f2f', 700: '#4a1826', 900: '#3a121d' },
         ink: '#1a1512',
-        cream: '#faf6f0',
+        cream: '#fdf6f0',
       },
       fontFamily: {
-        display: ['"Abril Fatface"', 'Georgia', 'serif'],
-        sans: ['Nunito', 'system-ui', 'sans-serif'],
+        display: ['"Playfair Display"', 'Georgia', 'serif'],
+        sans: ['Inter', 'system-ui', 'sans-serif'],
       },
       keyframes: {
         marquee: {
PATCH_EOF

git apply "$PATCH_FILE"
rm -f "$PATCH_FILE"

echo "Applied. Files changed:"
echo "  - tailwind.config.ts"
echo "  - index.html"
echo "  - src/index.css"
echo "  - src/components/storefront/StorefrontLayout.tsx"
echo "  - src/pages/Home.tsx"
