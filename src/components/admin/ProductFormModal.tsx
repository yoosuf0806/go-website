import { useState } from 'react'
import {
  uploadProductImage,
  type AdminCategory,
  type AdminProduct,
  type ProductInput,
} from '../../lib/adminProducts'

interface ProductFormModalProps {
  /** The product to edit, or null to create a new one. */
  product: AdminProduct | null
  categories: AdminCategory[]
  onClose: () => void
  onSubmit: (input: ProductInput) => void
  saving: boolean
  error?: string | null
}

function initialInput(product: AdminProduct | null, categories: AdminCategory[]): ProductInput {
  if (product) {
    const { id: _id, ...rest } = product
    void _id
    return rest
  }
  return {
    category_id: categories[0]?.id ?? null,
    name: '',
    slug: '',
    description: '',
    price_per_piece: 0,
    image_url: null,
    is_visible: true,
    in_stock: true,
    stock_qty: null,
    is_slab_available: false,
    allows_letter_topper: false,
    sort_order: 0,
  }
}

// Add/edit product modal (spec §7 Products). All initial state is derived from
// the product synchronously; the parent mounts this only when adding/editing so
// state is never hydrated after open (the §7 modal warning).
export default function ProductFormModal({
  product,
  categories,
  onClose,
  onSubmit,
  saving,
  error,
}: ProductFormModalProps) {
  const [form, setForm] = useState<ProductInput>(() => initialInput(product, categories))
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const url = await uploadProductImage(file)
      set('image_url', url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Letter topper only makes sense on slab-capable products (spec §6.2).
    const cleaned: ProductInput = {
      ...form,
      allows_letter_topper: form.is_slab_available ? form.allows_letter_topper : false,
    }
    onSubmit(cleaned)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-800"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold">{product ? 'Edit product' : 'New product'}</h2>

        <div className="mt-4 flex flex-col gap-3">
          <label className="text-sm">
            <span className="block text-neutral-600">Name</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-600">Slug</span>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-600">Description</span>
            <textarea
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="block text-neutral-600">Price / piece (Rs.)</span>
              <input
                type="number"
                min={0}
                value={form.price_per_piece}
                onChange={(e) => set('price_per_piece', Number(e.target.value))}
                className="mt-1 w-32 rounded border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="block text-neutral-600">Category</span>
              <select
                value={form.category_id ?? ''}
                onChange={(e) => set('category_id', e.target.value || null)}
                className="mt-1 rounded border border-neutral-300 px-2 py-2 text-sm"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-neutral-600">Sort order</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => set('sort_order', Number(e.target.value))}
                className="mt-1 w-24 rounded border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="text-sm">
            <span className="block text-neutral-600">Image</span>
            <input type="file" accept="image/*" onChange={handleImage} className="mt-1 text-sm" />
            {uploading && <p className="mt-1 text-xs text-neutral-500">Uploading…</p>}
            {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
            {form.image_url && (
              <img
                src={form.image_url}
                alt=""
                className="mt-2 h-20 w-20 rounded object-cover"
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(e) => set('is_visible', e.target.checked)}
              />
              Visible on storefront
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.in_stock}
                onChange={(e) => set('in_stock', e.target.checked)}
              />
              In stock
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_slab_available}
                onChange={(e) => set('is_slab_available', e.target.checked)}
              />
              Slab available
            </label>
            {form.is_slab_available && (
              <label className="flex items-center gap-2 pl-6 text-sm">
                <input
                  type="checkbox"
                  checked={form.allows_letter_topper}
                  onChange={(e) => set('allows_letter_topper', e.target.checked)}
                />
                Allows letter topper
              </label>
            )}
          </div>

          <label className="text-sm">
            <span className="block text-neutral-600">Daily stock qty (optional)</span>
            <input
              type="number"
              min={0}
              value={form.stock_qty ?? ''}
              onChange={(e) => set('stock_qty', e.target.value === '' ? null : Number(e.target.value))}
              className="mt-1 w-32 rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
