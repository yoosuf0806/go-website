import { useState } from 'react'
import {
  useAdminProducts,
  useAdminCategories,
  useAdminPackages,
  useAdminProductPackageStock,
  useSetProductPackageStock,
  useAdminProductPackageAvailability,
  useSetProductPackageAvailability,
  useAdminProductPackagePrice,
  useSetProductPackagePrice,
  useProductMutations,
  useCategoryMutations,
} from '../../hooks/useAdminProducts'
import type { AdminProduct, ProductInput } from '../../lib/adminProducts'
import { formatLKR } from '../../lib/format'
import ProductFormModal from '../../components/admin/ProductFormModal'

// Admin Products (spec §7): CRUD with add/edit modal + image upload, per-product
// and per-category visibility toggles, allows_letter_topper (slab-only), and a
// numeric sort order.
export default function Products() {
  const { data: products, isLoading, isError, error } = useAdminProducts()
  const { data: categories } = useAdminCategories()
  const { data: packages } = useAdminPackages()
  const { data: stockRows } = useAdminProductPackageStock()
  const setStock = useSetProductPackageStock()
  const { data: availabilityRows } = useAdminProductPackageAvailability()
  const setAvailability = useSetProductPackageAvailability()
  const { data: priceRows } = useAdminProductPackagePrice()
  const setPackPrice = useSetProductPackagePrice()
  const { create, update, remove } = useProductMutations()
  const categoryMutations = useCategoryMutations()
  const [newCategoryName, setNewCategoryName] = useState('')

  // `editing` is undefined when closed, null when adding, or a product when
  // editing — set synchronously before the modal mounts.
  const [editing, setEditing] = useState<AdminProduct | null | undefined>(undefined)

  function handleSubmit(input: ProductInput) {
    if (editing) {
      update.mutate({ id: editing.id, patch: input }, { onSuccess: () => setEditing(undefined) })
    } else {
      create.mutate(input, { onSuccess: () => setEditing(undefined) })
    }
  }

  const saving = create.isPending || update.isPending
  const saveError = create.error?.message ?? update.error?.message ?? null

  function slugify(name: string): string {
    return (
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `category-${Date.now()}`
    )
  }

  function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    const nextSortOrder = Math.max(0, ...(categories ?? []).map((c) => c.sort_order)) + 1
    categoryMutations.create.mutate(
      { name, slug: slugify(name), sort_order: nextSortOrder },
      { onSuccess: () => setNewCategoryName('') },
    )
  }

  function handleMoveCategory(index: number, direction: -1 | 1) {
    if (!categories) return
    const target = categories[index + direction]
    const current = categories[index]
    if (!target || !current) return
    // Swap sort_order between the two neighbours.
    categoryMutations.update.mutate({ id: current.id, patch: { sort_order: target.sort_order } })
    categoryMutations.update.mutate({ id: target.id, patch: { sort_order: current.sort_order } })
  }

  function handleRenameCategory(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    categoryMutations.update.mutate({ id, patch: { name: trimmed } })
  }

  function handleDeleteCategory(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Products in this category will become uncategorised.`)) return
    categoryMutations.remove.mutate(id)
  }

  // No row for a product×package combo = in stock; a row with in_stock=false
  // is the only kind that should normally exist (spec: sold-out overrides).
  function isInStock(productId: string, packageId: string): boolean {
    const row = stockRows?.find((r) => r.product_id === productId && r.package_id === packageId)
    return row ? row.in_stock : true
  }

  // No row for a product×package combo = available (shown on the storefront); a
  // row with is_available=false is the only kind that should normally exist
  // (spec: hide the packages a product doesn't sell, e.g. a slab-only product).
  function isAvailable(productId: string, packageId: string): boolean {
    const row = availabilityRows?.find((r) => r.product_id === productId && r.package_id === packageId)
    return row ? row.is_available : true
  }

  // No row for a product×package combo = priced per piece (price_per_piece ×
  // piece_count). A row carries a flat whole-pack price for that combo.
  function packPriceOf(productId: string, packageId: string): number | undefined {
    return priceRows?.find((r) => r.product_id === productId && r.package_id === packageId)?.price
  }

  // Save the whole-pack price from a grid cell: a positive number upserts the
  // override; an empty/zero/invalid value clears it back to per-piece pricing.
  function handlePackPriceCommit(productId: string, packageId: string, raw: string) {
    const trimmed = raw.trim()
    const parsed = trimmed === '' ? null : Number(trimmed)
    const next = parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null
    if (next === (packPriceOf(productId, packageId) ?? null)) return
    setPackPrice.mutate({ productId, packageId, price: next })
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + New product
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Categories</h2>
          <p className="text-xs text-neutral-400">Shown as filter tabs on the Shop page, in this order.</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCategory()
            }}
            placeholder="New category name…"
            className="min-w-[200px] flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim() || categoryMutations.create.isPending}
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            + Add category
          </button>
        </div>
        {categoryMutations.create.error && (
          <p className="mt-2 text-xs text-red-600">{categoryMutations.create.error.message}</p>
        )}

        {categories && categories.length > 0 && (
          <ul className="mt-4 flex flex-col divide-y divide-neutral-100">
            {categories.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => handleMoveCategory(i, -1)}
                    className="text-xs leading-none text-neutral-400 hover:text-neutral-800 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === categories.length - 1}
                    onClick={() => handleMoveCategory(i, 1)}
                    className="text-xs leading-none text-neutral-400 hover:text-neutral-800 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <input
                  defaultValue={c.name}
                  key={c.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() !== c.name) handleRenameCategory(c.id, e.target.value)
                  }}
                  className="min-w-[140px] flex-1 rounded-md border border-transparent px-2 py-1 text-sm hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={categoryMutations.update.isPending}
                  onClick={() => categoryMutations.update.mutate({ id: c.id, patch: { is_visible: !c.is_visible } })}
                  className={`rounded-full border px-3 py-1 text-xs disabled:opacity-50 ${
                    c.is_visible
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-neutral-300 text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  {c.is_visible ? 'Shown' : 'Hidden'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id, c.name)}
                  disabled={categoryMutations.remove.isPending}
                  className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading products…</p>}
      {isError && (
        <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load products: {error.message}
        </p>
      )}

      {products && products.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Flags</th>
                <th className="px-3 py-2 font-medium">Sort</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{product.name}</td>
                  <td className="px-3 py-2">{formatLKR(product.price_per_piece)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1 text-xs text-neutral-500">
                      {!product.is_visible && <span className="rounded bg-neutral-200 px-1.5">hidden</span>}
                      {!product.in_stock && <span className="rounded bg-red-100 px-1.5 text-red-700">sold out</span>}
                      {product.is_slab_product && (
                        <span className="rounded bg-pink-100 px-1.5 text-pink-700">
                          slab · {product.flavors.length} flavour{product.flavors.length === 1 ? '' : 's'}
                        </span>
                      )}
                      {product.is_slab_available && <span className="rounded bg-neutral-100 px-1.5">slab-12</span>}
                      {product.is_slab_15_available && <span className="rounded bg-neutral-100 px-1.5">slab-15</span>}
                      {product.allows_letter_topper && <span className="rounded bg-neutral-100 px-1.5">topper</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">{product.sort_order}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(product)}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (confirm(`Delete ${product.name}?`)) remove.mutate(product.id)
                        }}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {products && products.length > 0 && packages && packages.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-semibold">Package stock</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Per-product, per-package sold-out toggle — e.g. 9pc Cashew in stock, 12pc Cashew out.
              Click a package to flip it.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                {packages.map((pkg) => (
                  <th key={pkg.id} className="px-3 py-2 text-center font-medium">
                    {pkg.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{product.name}</td>
                  {packages.map((pkg) => {
                    const inStock = isInStock(product.id, pkg.id)
                    return (
                      <td key={pkg.id} className="px-3 py-2 text-center">
                        <button
                          type="button"
                          disabled={setStock.isPending}
                          onClick={() =>
                            setStock.mutate({ productId: product.id, packageId: pkg.id, inStock: !inStock })
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs disabled:opacity-50 ${
                            inStock
                              ? 'border-neutral-300 text-neutral-500 hover:bg-neutral-100'
                              : 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {inStock ? 'In stock' : 'Sold out'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {products && products.length > 0 && packages && packages.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-semibold">Package availability</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Which package sizes each product offers on the storefront. Hide the ones a product
              never sells — e.g. a slab-only product hides the 9/12/15 boxes. Click a package to flip
              it. (Slab sizes also need their toggle enabled in the product’s Edit form to appear.)
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                {packages.map((pkg) => (
                  <th key={pkg.id} className="px-3 py-2 text-center font-medium">
                    {pkg.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{product.name}</td>
                  {packages.map((pkg) => {
                    const available = isAvailable(product.id, pkg.id)
                    return (
                      <td key={pkg.id} className="px-3 py-2 text-center">
                        <button
                          type="button"
                          disabled={setAvailability.isPending}
                          onClick={() =>
                            setAvailability.mutate({
                              productId: product.id,
                              packageId: pkg.id,
                              available: !available,
                            })
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs disabled:opacity-50 ${
                            available
                              ? 'border-neutral-300 text-neutral-500 hover:bg-neutral-100'
                              : 'border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          {available ? 'Shown' : 'Hidden'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {products && products.length > 0 && packages && packages.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-semibold">Whole-pack price</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Optional flat price for a whole pack, overriding the per-piece rate for that size.
              Leave blank to keep pricing per piece (price per piece × piece count). Delivery is
              unchanged — still based on the pack’s piece count. Slab sizes are priced per flavour in
              the product’s Edit form, so they can’t take a whole-pack price here.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                {packages.map((pkg) => (
                  <th key={pkg.id} className="px-3 py-2 text-center font-medium">
                    {pkg.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{product.name}</td>
                  {packages.map((pkg) => {
                    if (pkg.is_slab) {
                      return (
                        <td key={pkg.id} className="px-3 py-2 text-center text-neutral-300">
                          —
                        </td>
                      )
                    }
                    const current = packPriceOf(product.id, pkg.id)
                    return (
                      <td key={pkg.id} className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          defaultValue={current ?? ''}
                          key={`${product.id}:${pkg.id}:${current ?? ''}`}
                          placeholder="per pc"
                          disabled={setPackPrice.isPending}
                          onBlur={(e) => handlePackPriceCommit(product.id, pkg.id, e.target.value)}
                          className="w-24 rounded border border-neutral-300 px-2 py-1 text-right text-xs disabled:opacity-50"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && (
        <ProductFormModal
          product={editing}
          categories={categories ?? []}
          onClose={() => setEditing(undefined)}
          onSubmit={handleSubmit}
          saving={saving}
          error={saveError}
        />
      )}
    </div>
  )
}
