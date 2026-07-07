import { useState } from 'react'
import {
  useAdminProducts,
  useAdminCategories,
  useProductMutations,
  useUpdateCategory,
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
  const { create, update, remove } = useProductMutations()
  const updateCategory = useUpdateCategory()

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

      {categories && categories.length > 0 && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Category visibility</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={updateCategory.isPending}
                onClick={() => updateCategory.mutate({ id: c.id, patch: { is_visible: !c.is_visible } })}
                className={`rounded-full border px-3 py-1 text-xs disabled:opacity-50 ${
                  c.is_visible
                    ? 'border-amber-600 bg-amber-600 text-white'
                    : 'border-neutral-300 text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                {c.name} {c.is_visible ? '· shown' : '· hidden'}
              </button>
            ))}
          </div>
        </div>
      )}

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
                      {product.is_slab_available && <span className="rounded bg-neutral-100 px-1.5">slab</span>}
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
