#!/usr/bin/env bash
# apply_slab_first_bulk_orders.sh
# Run from the repo root in your Codespace (on a fresh branch off main):
#
#   git checkout main && git pull
#   git checkout -b claude/slab-first-bulk-orders
#   bash apply_slab_first_bulk_orders.sh
#   git add -A && git commit -m "feat(nav+corporate): slab-first order, Bulk Orders nav, product-style layout"
#   git push -u origin claude/slab-first-bulk-orders
#
# Then open the PR at:
#   https://github.com/yoosuf0806/go-website/compare/main...claude/slab-first-bulk-orders
#
# After merging, apply supabase/migrations/023_slab_first_sort_order.sql
# in the Supabase SQL editor.

set -euo pipefail

PATCH_FILE="$(mktemp)"
cat > "$PATCH_FILE" << 'PATCH_EOF'
diff --git a/scripts/seed-data.ts b/scripts/seed-data.ts
index 280adee..206b139 100644
--- a/scripts/seed-data.ts
+++ b/scripts/seed-data.ts
@@ -212,11 +212,11 @@ export const seedData: SeedData = {
   ],
 
   packages: [
-    { id: 'box-9', label: '9 Pieces', piece_count: 9, is_slab: false, is_active: true, letter_max_chars: 0, sort_order: 1 },
-    { id: 'box-12', label: '12 Pieces', piece_count: 12, is_slab: false, is_active: true, letter_max_chars: 4, sort_order: 2 },
-    { id: 'box-15', label: '15 Pieces', piece_count: 15, is_slab: false, is_active: true, letter_max_chars: 5, sort_order: 3 },
-    { id: 'slab-12', label: 'Brownie Slab (12 pcs)', piece_count: 12, is_slab: true, is_active: true, letter_max_chars: 7, sort_order: 4 },
-    { id: 'slab-15', label: 'Brownie Slab (15 pcs)', piece_count: 15, is_slab: true, is_active: true, letter_max_chars: 7, sort_order: 5 },
+    { id: 'slab-12', label: 'Brownie Slab (12 pcs)', piece_count: 12, is_slab: true, is_active: true, letter_max_chars: 7, sort_order: 1 },
+    { id: 'slab-15', label: 'Brownie Slab (15 pcs)', piece_count: 15, is_slab: true, is_active: true, letter_max_chars: 7, sort_order: 2 },
+    { id: 'box-9', label: '9 Pieces', piece_count: 9, is_slab: false, is_active: true, letter_max_chars: 0, sort_order: 3 },
+    { id: 'box-12', label: '12 Pieces', piece_count: 12, is_slab: false, is_active: true, letter_max_chars: 4, sort_order: 4 },
+    { id: 'box-15', label: '15 Pieces', piece_count: 15, is_slab: false, is_active: true, letter_max_chars: 5, sort_order: 5 },
   ],
 
   addons: [
diff --git a/src/components/storefront/StorefrontLayout.tsx b/src/components/storefront/StorefrontLayout.tsx
index 30e2dcf..92cde7d 100644
--- a/src/components/storefront/StorefrontLayout.tsx
+++ b/src/components/storefront/StorefrontLayout.tsx
@@ -11,8 +11,7 @@ import CheckoutModal from './CheckoutModal'
 
 const NAV = [
   { to: '/shop', label: 'Shop All' },
-  { to: '/corporate', label: 'Corporate Gifting' },
-  { to: '/corporate', label: 'Brownies for Wedding' },
+  { to: '/corporate', label: 'Bulk Orders' },
   { to: '/shop', label: 'Brownie Slab' },
 ]
 
@@ -207,8 +206,7 @@ function Footer() {
             title="Shop"
             links={[
               { to: '/shop', label: 'Shop All' },
-              { to: '/corporate', label: 'Corporate Gifting' },
-              { to: '/corporate', label: 'Wedding Orders' },
+              { to: '/corporate', label: 'Bulk Orders' },
               { to: '/shop', label: 'Brownie Slab' },
             ]}
           />
diff --git a/src/pages/Corporate.tsx b/src/pages/Corporate.tsx
index bc65dee..b26cc44 100644
--- a/src/pages/Corporate.tsx
+++ b/src/pages/Corporate.tsx
@@ -65,22 +65,15 @@ export default function Corporate() {
         <span className="text-neutral-600">{corp.heading}</span>
       </nav>
 
-      <div className="mt-4 grid gap-8 lg:grid-cols-2">
-        {/* Left: flavour image + info pills */}
-        <div>
+      <div className="mt-4 grid grid-cols-1 gap-12 lg:grid-cols-2">
+        {/* Left: flavour image — sticky like a product gallery */}
+        <div className="lg:sticky lg:top-28 lg:self-start">
           <div className="relative aspect-square overflow-hidden rounded-3xl bg-pink-light">
             {heroImage ? (
               <img src={heroImage} alt={selected?.name ?? 'Brownies'} className="h-full w-full object-cover" />
             ) : (
               <div className="flex h-full w-full items-center justify-center text-[8rem]">🍫</div>
             )}
-            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
-              {PILLS.map((p) => (
-                <span key={p} className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
-                  {p}
-                </span>
-              ))}
-            </div>
             {selected && (
               <span className="absolute bottom-4 left-4 rounded-full bg-navy/80 px-3 py-1 text-xs font-medium text-white">
                 {selected.name}
@@ -89,19 +82,25 @@ export default function Corporate() {
           </div>
         </div>
 
-        {/* Right: heading, flavour picker, quote form */}
+        {/* Right: badges, heading, intro, flavour picker, quote form */}
         <div>
-          <p className="text-sm text-neutral-500">
-            <span className="text-pink">★★★★★</span> Loved by 200+ teams across Colombo
-          </p>
-          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-navy">{corp.heading}</h1>
-          <p className="mt-3 text-neutral-500">{corp.intro}</p>
+          <div className="mb-3 flex flex-wrap gap-2">
+            {PILLS.map((p) => (
+              <span key={p} className="rounded-full bg-warmgray px-3 py-1.5 text-xs font-semibold text-neutral-500">
+                {p}
+              </span>
+            ))}
+          </div>
 
-          {corp.preOrderNote && (
-            <p className="mt-4 rounded-xl bg-pink-light px-4 py-3 text-sm text-neutral-700">
-              <span className="font-semibold text-pink">Heads up:</span> {corp.preOrderNote}
-            </p>
-          )}
+          <h1 className="font-display text-[clamp(1.8rem,3vw,2.5rem)] font-semibold leading-tight text-navy">
+            {corp.heading}
+          </h1>
+          <div className="mt-2 flex items-center gap-2 text-sm">
+            <span className="text-pink" aria-hidden>★★★★★</span>
+            <span className="text-neutral-400">Loved by 200+ teams across Colombo</span>
+          </div>
+
+          <p className="mt-3 text-sm leading-relaxed text-neutral-500">{corp.intro}</p>
 
           {/* Flavour picker */}
           {flavors.length > 0 && (
@@ -191,6 +190,12 @@ export default function Corporate() {
               >
                 {mutation.isPending ? 'Sending…' : 'Send Quote Request'}
               </button>
+
+              {corp.preOrderNote && (
+                <p className="mt-4 rounded-xl bg-pink-light px-4 py-3 text-sm text-neutral-700">
+                  <span className="font-semibold text-pink">Heads up:</span> {corp.preOrderNote}
+                </p>
+              )}
               <p className="mt-3 text-center text-xs text-neutral-400">
                 By submitting you agree to be contacted about your quote.
               </p>
diff --git a/supabase/migrations/023_slab_first_sort_order.sql b/supabase/migrations/023_slab_first_sort_order.sql
new file mode 100644
index 0000000..45a48ea
--- /dev/null
+++ b/supabase/migrations/023_slab_first_sort_order.sql
@@ -0,0 +1,11 @@
+-- 023_slab_first_sort_order.sql
+-- Bring the Brownie Slab packages (slab-12, slab-15) ahead of the box
+-- packages (box-9, box-12, box-15) everywhere sort_order is used to
+-- render the package/size picker (storefront PackageSelector, admin, and
+-- the build-time snapshot).
+
+update packages set sort_order = 1 where id = 'slab-12';
+update packages set sort_order = 2 where id = 'slab-15';
+update packages set sort_order = 3 where id = 'box-9';
+update packages set sort_order = 4 where id = 'box-12';
+update packages set sort_order = 5 where id = 'box-15';
diff --git a/supabase/setup.sql b/supabase/setup.sql
index abaef66..86a1812 100644
--- a/supabase/setup.sql
+++ b/supabase/setup.sql
@@ -177,11 +177,11 @@ create trigger orders_updated_at before update on orders
 -- letter_max_chars: max chars/line for the free 3-line built-in topper.
 -- 0 = topper not offered for that package (box-9).
 insert into packages (id, label, piece_count, is_slab, sort_order, letter_max_chars) values
-  ('box-9',  '9 Pieces',              9,  false, 1, 0),
-  ('box-12', '12 Pieces',             12, false, 2, 4),
-  ('box-15', '15 Pieces',             15, false, 3, 5),
-  ('slab-12','Brownie Slab (12 pcs)', 12, true,  4, 7),
-  ('slab-15','Brownie Slab (15 pcs)', 15, true,  5, 7)
+  ('slab-12','Brownie Slab (12 pcs)', 12, true,  1, 7),
+  ('slab-15','Brownie Slab (15 pcs)', 15, true,  2, 7),
+  ('box-9',  '9 Pieces',              9,  false, 3, 0),
+  ('box-12', '12 Pieces',             12, false, 4, 4),
+  ('box-15', '15 Pieces',             15, false, 5, 5)
 on conflict (id) do update set letter_max_chars = excluded.letter_max_chars;
 
 -- letter_topper is now free and built-in (per-package limits above), not a
PATCH_EOF

git apply "$PATCH_FILE"
rm -f "$PATCH_FILE"

echo "Applied. Files changed:"
echo "  - supabase/migrations/023_slab_first_sort_order.sql (new)"
echo "  - supabase/setup.sql"
echo "  - scripts/seed-data.ts"
echo "  - src/components/storefront/StorefrontLayout.tsx"
echo "  - src/pages/Corporate.tsx"
