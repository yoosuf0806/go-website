#!/usr/bin/env bash
# apply_admin_categories_crud.sh
# Run from the repo root in your Codespace, on a fresh branch off main:
#
#   git checkout main && git pull
#   git checkout -b claude/admin-categories-crud
#   bash apply_admin_categories_crud.sh
#   git add -A && git commit -m "feat(admin): create, rename, reorder, and delete categories"
#   git push -u origin claude/admin-categories-crud
#
# Then open the PR at:
#   https://github.com/yoosuf0806/go-website/compare/main...claude/admin-categories-crud
#
# No migration/SQL Editor step needed — the existing "admin all
# categories" RLS policy already grants full CRUD to authenticated
# admins.

set -euo pipefail

PATCH_FILE="$(mktemp)"
cat > "$PATCH_FILE" << 'PATCH_EOF'
diff --git a/src/hooks/useAdminProducts.ts b/src/hooks/useAdminProducts.ts
index ae82cc8..57cc150 100644
--- a/src/hooks/useAdminProducts.ts
+++ b/src/hooks/useAdminProducts.ts
@@ -8,7 +8,9 @@ import {
   createProduct,
   updateProduct,
   deleteProduct,
+  createCategory,
   updateCategory,
+  deleteCategory,
   type ProductInput,
   type AdminCategory,
 } from '../lib/adminProducts'
@@ -43,15 +45,30 @@ export function useProductMutations() {
   return { create, update, remove }
 }
 
-export function useUpdateCategory() {
+export function useCategoryMutations() {
   const qc = useQueryClient()
-  return useMutation({
-    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<AdminCategory, 'is_visible'>> }) =>
-      updateCategory(id, patch),
-    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'categories'] }),
+  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
+
+  const create = useMutation({
+    mutationFn: (input: Pick<AdminCategory, 'name' | 'slug' | 'sort_order'>) => createCategory(input),
+    onSuccess: invalidate,
   })
+  const update = useMutation({
+    mutationFn: ({
+      id,
+      patch,
+    }: {
+      id: string
+      patch: Partial<Pick<AdminCategory, 'name' | 'slug' | 'sort_order' | 'is_visible'>>
+    }) => updateCategory(id, patch),
+    onSuccess: invalidate,
+  })
+  const remove = useMutation({ mutationFn: (id: string) => deleteCategory(id), onSuccess: invalidate })
+
+  return { create, update, remove }
 }
 
+
 /** Active packages, for building the per-product-per-package stock grid (one column each). */
 export function useAdminPackages() {
   return useQuery({
diff --git a/src/lib/adminProducts.ts b/src/lib/adminProducts.ts
index 87b3947..2d62d7b 100644
--- a/src/lib/adminProducts.ts
+++ b/src/lib/adminProducts.ts
@@ -95,14 +95,25 @@ export async function deleteProduct(id: string): Promise<void> {
   if (error) throw new Error(error.message)
 }
 
+export async function createCategory(input: Pick<AdminCategory, 'name' | 'slug' | 'sort_order'>): Promise<void> {
+  const { error } = await supabase.from('categories').insert({ ...input, is_visible: true })
+  if (error) throw new Error(error.message)
+}
+
 export async function updateCategory(
   id: string,
-  patch: Partial<Pick<AdminCategory, 'is_visible'>>,
+  patch: Partial<Pick<AdminCategory, 'name' | 'slug' | 'sort_order' | 'is_visible'>>,
 ): Promise<void> {
   const { error } = await supabase.from('categories').update(patch).eq('id', id)
   if (error) throw new Error(error.message)
 }
 
+/** Deleting a category never deletes products — category_id is ON DELETE SET NULL. */
+export async function deleteCategory(id: string): Promise<void> {
+  const { error } = await supabase.from('categories').delete().eq('id', id)
+  if (error) throw new Error(error.message)
+}
+
 /** All active packages (for building the stock-toggle grid: one column per package). */
 export async function fetchPackages(): Promise<AdminPackage[]> {
   const { data, error } = await supabase
diff --git a/src/pages/admin/Products.tsx b/src/pages/admin/Products.tsx
index 615f988..2bb1e73 100644
--- a/src/pages/admin/Products.tsx
+++ b/src/pages/admin/Products.tsx
@@ -6,7 +6,7 @@ import {
   useAdminProductPackageStock,
   useSetProductPackageStock,
   useProductMutations,
-  useUpdateCategory,
+  useCategoryMutations,
 } from '../../hooks/useAdminProducts'
 import type { AdminProduct, ProductInput } from '../../lib/adminProducts'
 import { formatLKR } from '../../lib/format'
@@ -22,7 +22,8 @@ export default function Products() {
   const { data: stockRows } = useAdminProductPackageStock()
   const setStock = useSetProductPackageStock()
   const { create, update, remove } = useProductMutations()
-  const updateCategory = useUpdateCategory()
+  const categoryMutations = useCategoryMutations()
+  const [newCategoryName, setNewCategoryName] = useState('')
 
   // `editing` is undefined when closed, null when adding, or a product when
   // editing — set synchronously before the modal mounts.
@@ -39,6 +40,47 @@ export default function Products() {
   const saving = create.isPending || update.isPending
   const saveError = create.error?.message ?? update.error?.message ?? null
 
+  function slugify(name: string): string {
+    return (
+      name
+        .trim()
+        .toLowerCase()
+        .replace(/[^a-z0-9]+/g, '-')
+        .replace(/^-+|-+$/g, '') || `category-${Date.now()}`
+    )
+  }
+
+  function handleAddCategory() {
+    const name = newCategoryName.trim()
+    if (!name) return
+    const nextSortOrder = Math.max(0, ...(categories ?? []).map((c) => c.sort_order)) + 1
+    categoryMutations.create.mutate(
+      { name, slug: slugify(name), sort_order: nextSortOrder },
+      { onSuccess: () => setNewCategoryName('') },
+    )
+  }
+
+  function handleMoveCategory(index: number, direction: -1 | 1) {
+    if (!categories) return
+    const target = categories[index + direction]
+    const current = categories[index]
+    if (!target || !current) return
+    // Swap sort_order between the two neighbours.
+    categoryMutations.update.mutate({ id: current.id, patch: { sort_order: target.sort_order } })
+    categoryMutations.update.mutate({ id: target.id, patch: { sort_order: current.sort_order } })
+  }
+
+  function handleRenameCategory(id: string, name: string) {
+    const trimmed = name.trim()
+    if (!trimmed) return
+    categoryMutations.update.mutate({ id, patch: { name: trimmed } })
+  }
+
+  function handleDeleteCategory(id: string, name: string) {
+    if (!window.confirm(`Delete "${name}"? Products in this category will become uncategorised.`)) return
+    categoryMutations.remove.mutate(id)
+  }
+
   // No row for a product×package combo = in stock; a row with in_stock=false
   // is the only kind that should normally exist (spec: sold-out overrides).
   function isInStock(productId: string, packageId: string): boolean {
@@ -59,28 +101,92 @@ export default function Products() {
         </button>
       </div>
 
-      {categories && categories.length > 0 && (
-        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
-          <h2 className="text-sm font-semibold">Category visibility</h2>
-          <div className="mt-2 flex flex-wrap gap-2">
-            {categories.map((c) => (
-              <button
-                key={c.id}
-                type="button"
-                disabled={updateCategory.isPending}
-                onClick={() => updateCategory.mutate({ id: c.id, patch: { is_visible: !c.is_visible } })}
-                className={`rounded-full border px-3 py-1 text-xs disabled:opacity-50 ${
-                  c.is_visible
-                    ? 'border-amber-600 bg-amber-600 text-white'
-                    : 'border-neutral-300 text-neutral-500 hover:bg-neutral-100'
-                }`}
-              >
-                {c.name} {c.is_visible ? '· shown' : '· hidden'}
-              </button>
-            ))}
-          </div>
+      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
+        <div className="flex items-center justify-between">
+          <h2 className="text-sm font-semibold">Categories</h2>
+          <p className="text-xs text-neutral-400">Shown as filter tabs on the Shop page, in this order.</p>
         </div>
-      )}
+
+        <div className="mt-3 flex flex-wrap gap-2">
+          <input
+            value={newCategoryName}
+            onChange={(e) => setNewCategoryName(e.target.value)}
+            onKeyDown={(e) => {
+              if (e.key === 'Enter') handleAddCategory()
+            }}
+            placeholder="New category name…"
+            className="min-w-[200px] flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
+          />
+          <button
+            type="button"
+            onClick={handleAddCategory}
+            disabled={!newCategoryName.trim() || categoryMutations.create.isPending}
+            className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
+          >
+            + Add category
+          </button>
+        </div>
+        {categoryMutations.create.error && (
+          <p className="mt-2 text-xs text-red-600">{categoryMutations.create.error.message}</p>
+        )}
+
+        {categories && categories.length > 0 && (
+          <ul className="mt-4 flex flex-col divide-y divide-neutral-100">
+            {categories.map((c, i) => (
+              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
+                <div className="flex shrink-0 flex-col">
+                  <button
+                    type="button"
+                    aria-label="Move up"
+                    disabled={i === 0}
+                    onClick={() => handleMoveCategory(i, -1)}
+                    className="text-xs leading-none text-neutral-400 hover:text-neutral-800 disabled:opacity-30"
+                  >
+                    ▲
+                  </button>
+                  <button
+                    type="button"
+                    aria-label="Move down"
+                    disabled={i === categories.length - 1}
+                    onClick={() => handleMoveCategory(i, 1)}
+                    className="text-xs leading-none text-neutral-400 hover:text-neutral-800 disabled:opacity-30"
+                  >
+                    ▼
+                  </button>
+                </div>
+                <input
+                  defaultValue={c.name}
+                  key={c.name}
+                  onBlur={(e) => {
+                    if (e.target.value.trim() !== c.name) handleRenameCategory(c.id, e.target.value)
+                  }}
+                  className="min-w-[140px] flex-1 rounded-md border border-transparent px-2 py-1 text-sm hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
+                />
+                <button
+                  type="button"
+                  disabled={categoryMutations.update.isPending}
+                  onClick={() => categoryMutations.update.mutate({ id: c.id, patch: { is_visible: !c.is_visible } })}
+                  className={`rounded-full border px-3 py-1 text-xs disabled:opacity-50 ${
+                    c.is_visible
+                      ? 'border-amber-600 bg-amber-600 text-white'
+                      : 'border-neutral-300 text-neutral-500 hover:bg-neutral-100'
+                  }`}
+                >
+                  {c.is_visible ? 'Shown' : 'Hidden'}
+                </button>
+                <button
+                  type="button"
+                  onClick={() => handleDeleteCategory(c.id, c.name)}
+                  disabled={categoryMutations.remove.isPending}
+                  className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
+                >
+                  Delete
+                </button>
+              </li>
+            ))}
+          </ul>
+        )}
+      </div>
 
       {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading products…</p>}
       {isError && (
PATCH_EOF

git apply "$PATCH_FILE"
rm -f "$PATCH_FILE"

echo "Applied. Files changed:"
echo "  - src/lib/adminProducts.ts"
echo "  - src/hooks/useAdminProducts.ts"
echo "  - src/pages/admin/Products.tsx"
