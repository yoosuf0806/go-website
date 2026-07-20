import { useState } from 'react'
import { useAdminQuoteFlavors, useQuoteFlavorMutations } from '../../hooks/useAdminQuoteFlavors'
import type { QuoteFlavor } from '../../lib/adminQuoteFlavors'
import { uploadImage } from '../../lib/adminProducts'
import Toast from '../../components/ui/Toast'

// Admin CRUD for the corporate quote flavours (quote_flavors table). Live
// Supabase reads/writes — reflected on the corporate page on next load.
export default function QuoteFlavors() {
  const { data: flavors = [], isLoading, isError, error } = useAdminQuoteFlavors()
  const { add, update, remove } = useQuoteFlavorMutations()
  const [toast, setToast] = useState<string | null>(null)

  function handleAdd() {
    add.mutate(
      { name: 'New flavour', description: '', image_url: null, is_active: true, sort_order: flavors.length + 1 },
      { onSuccess: () => setToast('Flavour added.') },
    )
  }

  if (isLoading) return <p className="text-sm text-neutral-500">Loading…</p>
  if (isError) return <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">Failed: {error.message}</p>

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Quote Flavours</h1>
      <p className="mt-1 text-sm text-neutral-500">
        The selectable flavours shown on the corporate quote page. Changes are live immediately.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {flavors.map((f) => (
          <FlavorRow
            key={f.id}
            flavor={f}
            onPatch={(patch) => update.mutate({ id: f.id, patch })}
            onDelete={() => remove.mutate(f.id, { onSuccess: () => setToast('Flavour deleted.') })}
          />
        ))}
        {flavors.length === 0 && <p className="text-sm text-neutral-400">No flavours yet.</p>}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={add.isPending}
        className="mt-4 rounded-full border-2 border-navy px-4 py-2 text-sm font-bold text-navy hover:bg-navy hover:text-white disabled:opacity-50"
      >
        + Add flavour
      </button>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function FlavorRow({
  flavor,
  onPatch,
  onDelete,
}: {
  flavor: QuoteFlavor
  onPatch: (patch: Partial<Omit<QuoteFlavor, 'id'>>) => void
  onDelete: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      onPatch({ image_url: await uploadImage(file) })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex gap-4">
        <div className="shrink-0">
          {flavor.image_url ? (
            <img src={flavor.image_url} alt="" className="h-20 w-20 rounded-lg object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-pink-light text-2xl">🍫</div>
          )}
          <label className="mt-1 block cursor-pointer text-center text-xs font-medium text-navy hover:underline">
            {uploading ? 'Uploading…' : flavor.image_url ? 'Replace' : 'Upload'}
            <input type="file" accept="image/*" onChange={pickImage} disabled={uploading} className="hidden" />
          </label>
        </div>

        <div className="flex-1">
          <label className="block text-sm">
            <span className="text-neutral-600">Name</span>
            <input
              type="text"
              value={flavor.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-2 block text-sm">
            <span className="text-neutral-600">Description</span>
            <input
              type="text"
              value={flavor.description ?? ''}
              onChange={(e) => onPatch({ description: e.target.value })}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="mt-2 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-neutral-600">Sort</span>
              <input
                type="number"
                value={flavor.sort_order}
                onChange={(e) => onPatch({ sort_order: Number(e.target.value) })}
                className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={flavor.is_active} onChange={(e) => onPatch({ is_active: e.target.checked })} />
              Active
            </label>
            <button type="button" onClick={onDelete} className="ml-auto text-sm text-red-600 hover:underline">
              Delete
            </button>
          </div>
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        </div>
      </div>
    </div>
  )
}
