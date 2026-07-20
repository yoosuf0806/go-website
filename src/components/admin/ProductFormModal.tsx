import { useState } from 'react'
import {
  uploadProductMedia,
  type AdminCategory,
  type AdminProduct,
  type ProductInput,
  type ProductMedia,
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
    media: [],
    is_visible: true,
    in_stock: true,
    stock_qty: null,
    is_slab_available: false,
    is_slab_15_available: false,
    allows_letter_topper: false,
    is_hot_pick: false,
    is_corporate: false,
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

  // Uploads every selected file (images and/or videos), appending each to the
  // gallery as it completes so the grid fills in progressively rather than
  // blocking on the slowest upload. One failure doesn't drop the others.
  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-selecting the same file(s) later
    if (files.length === 0) return
    setUploadError(null)
    setUploading(true)
    const failures: string[] = []
    for (const file of files) {
      try {
        const item = await uploadProductMedia(file)
        setForm((f) => ({ ...f, media: [...f.media, item] }))
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`)
      }
    }
    setUploading(false)
    if (failures.length > 0) setUploadError(failures.join('; '))
  }

  function removeMedia(index: number) {
    setForm((f) => ({ ...f, media: f.media.filter((_, i) => i !== index) }))
  }

  // Moves an item earlier/later in the gallery order; index 0 is the cover
  // image shown on tiles, SEO, and JSON-LD.
  function moveMedia(index: number, direction: -1 | 1) {
    setForm((f) => {
      const next = [...f.media]
      const target = index + direction
      if (target < 0 || target >= next.length) return f
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...f, media: next }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Letter topper only makes sense on slab-capable products — either size (spec §6.2, PR #2).
    const slabCapable = form.is_slab_available || form.is_slab_15_available
    const cleaned: ProductInput = {
      ...form,
      allows_letter_topper: slabCapable ? form.allows_letter_topper : false,
      // image_url is derived from the gallery cover so legacy readers
      // (SEO/JSON-LD/ProductTile) that only look at image_url keep working.
      image_url: form.media[0]?.url ?? null,
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
            <span className="block text-neutral-600">
              Photos &amp; videos
              <span className="ml-1 font-normal text-neutral-400">
                — shown as a carousel; first item is the cover
              </span>
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaSelect}
              className="mt-1 text-sm"
            />
            {uploading && <p className="mt-1 text-xs text-neutral-500">Uploading…</p>}
            {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}

            {form.media.length > 0 && (
              <ul className="mt-3 grid grid-cols-4 gap-2">
                {form.media.map((item: ProductMedia, i: number) => (
                  <li key={`${item.url}-${i}`} className="group relative">
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        muted
                        className="h-20 w-20 rounded object-cover"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        className="h-20 w-20 rounded object-cover"
                      />
                    )}
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-navy/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Cover
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => moveMedia(i, -1)}
                        disabled={i === 0}
                        aria-label="Move earlier"
                        className="text-xs text-white disabled:opacity-30"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        aria-label="Remove"
                        className="text-xs text-white"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMedia(i, 1)}
                        disabled={i === form.media.length - 1}
                        aria-label="Move later"
                        className="text-xs text-white disabled:opacity-30"
                      >
                        ▶
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
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
                checked={form.is_hot_pick}
                onChange={(e) => set('is_hot_pick', e.target.checked)}
              />
              Hot pick (feature on homepage)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_corporate}
                onChange={(e) => set('is_corporate', e.target.checked)}
              />
              Corporate / wedding flavour (show on quote page)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_slab_available}
                onChange={(e) => set('is_slab_available', e.target.checked)}
              />
              12pc Slab available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_slab_15_available}
                onChange={(e) => set('is_slab_15_available', e.target.checked)}
              />
              15pc Slab available
            </label>
            {(form.is_slab_available || form.is_slab_15_available) && (
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
