import { useState } from 'react'
import { useAdminAddons, useUpdateAddon } from '../../hooks/useAdminAddons'
import type { AdminAddon } from '../../lib/adminAddons'
import Toast from '../../components/ui/Toast'

// Admin Add-on pricing (spec §7): price + enable toggle per addon, ribbon colour
// list, and topper char limits — the config JSON surfaced as friendly fields.
export default function AddonPricing() {
  const { data: addons, isLoading, isError, error } = useAdminAddons()
  const [toast, setToast] = useState<string | null>(null)

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Add-on Pricing</h1>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading…</p>}
      {isError && (
        <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load add-ons: {error.message}
        </p>
      )}

      {addons && (
        <div className="mt-6 flex flex-col gap-4">
          {addons.map((addon) => (
            <AddonCard key={addon.id} addon={addon} onSaved={() => setToast(`${addon.label} saved.`)} />
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function AddonCard({ addon, onSaved }: { addon: AdminAddon; onSaved: () => void }) {
  const [price, setPrice] = useState(addon.price)
  const [enabled, setEnabled] = useState(addon.is_enabled)
  const [config, setConfig] = useState<Record<string, unknown>>(addon.config)
  const update = useUpdateAddon()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate({ id: addon.id, patch: { price, is_enabled: enabled, config } }, { onSuccess: onSaved })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{addon.label}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
      </div>

      <label className="mt-3 block text-sm">
        <span className="text-neutral-600">Price (Rs.)</span>
        <input
          type="number"
          min={0}
          step="1"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="mt-1 w-32 rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      {addon.id === 'gift_ribbon' && (
        <RibbonColors config={config} onChange={setConfig} />
      )}
      {addon.id === 'letter_topper' && (
        <TopperLimits config={config} onChange={setConfig} />
      )}
      {addon.id === 'gift_message' && (
        <MessageLimit config={config} onChange={setConfig} />
      )}

      <div className="mt-4">
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </button>
        {update.isError && <p className="mt-2 text-sm text-red-600">{update.error.message}</p>}
      </div>
    </form>
  )
}

function RibbonColors({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const colors = Array.isArray(config.colors) ? (config.colors as string[]) : []
  return (
    <label className="mt-3 block text-sm">
      <span className="text-neutral-600">Ribbon colours (comma-separated)</span>
      <input
        type="text"
        value={colors.join(', ')}
        onChange={(e) =>
          onChange({
            ...config,
            colors: e.target.value
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean),
          })
        }
        className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
      />
    </label>
  )
}

function TopperLimits({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const lines = typeof config.lines === 'number' ? config.lines : 3
  const maxChars = typeof config.max_chars_per_line === 'number' ? config.max_chars_per_line : 5
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      <label className="text-sm">
        <span className="block text-neutral-600">Lines</span>
        <input
          type="number"
          min={1}
          value={lines}
          onChange={(e) => onChange({ ...config, lines: Number(e.target.value) })}
          className="mt-1 w-24 rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="block text-neutral-600">Max chars / line</span>
        <input
          type="number"
          min={1}
          value={maxChars}
          onChange={(e) => onChange({ ...config, max_chars_per_line: Number(e.target.value) })}
          className="mt-1 w-24 rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
    </div>
  )
}

function MessageLimit({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const maxChars = typeof config.max_chars === 'number' ? config.max_chars : 100
  return (
    <label className="mt-3 block text-sm">
      <span className="text-neutral-600">Max characters</span>
      <input
        type="number"
        min={1}
        value={maxChars}
        onChange={(e) => onChange({ ...config, max_chars: Number(e.target.value) })}
        className="mt-1 w-24 rounded border border-neutral-300 px-3 py-2 text-sm"
      />
    </label>
  )
}
