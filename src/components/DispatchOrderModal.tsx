import { useState } from 'react'
import { DELIVERY_PROVIDERS, dispatchOrder, type DeliveryProvider } from '../lib/dispatch'
import { dispatchWaLink } from '../lib/whatsapp'
import { toWhatsAppNumber } from '../lib/format'

// Shared, mobile-optimised "send for delivery" modal used by both the admin
// Orders page and the kitchen board. Staff pick the courier (LOV), enter its
// tracking handle (a number for PromptXpress, a link for PickMe Flash), and on
// Apply the order is moved to 'out_for_delivery' with the tracking stored, then
// a dispatch message opens in WhatsApp to the customer.
export default function DispatchOrderModal({
  orderId,
  orderNo,
  customerPhone,
  onClose,
  onDispatched,
}: {
  orderId: string
  orderNo: number
  /** Customer's phone — the dispatch WhatsApp message is sent here. */
  customerPhone: string | null
  onClose: () => void
  /** Called after a successful dispatch (e.g. to refetch orders). */
  onDispatched?: () => void
}) {
  const [provider, setProvider] = useState<DeliveryProvider>('promptxpress')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = DELIVERY_PROVIDERS.find((p) => p.value === provider)!
  const trimmed = value.trim()
  const valid = trimmed !== ''

  async function handleApply() {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    const isNumber = config.handle === 'number'
    try {
      await dispatchOrder({
        orderId,
        provider,
        trackingNumber: isNumber ? trimmed : null,
        trackingUrl: isNumber ? null : trimmed,
      })
      // Open the dispatch message to the customer on WhatsApp.
      const waNumber = customerPhone ? toWhatsAppNumber(customerPhone) : null
      if (waNumber) {
        const link = dispatchWaLink(customerPhone as string, {
          provider,
          orderNo,
          trackingNumber: isNumber ? trimmed : null,
          trackingUrl: isNumber ? null : trimmed,
        })
        window.open(link, '_blank', 'noopener,noreferrer')
      }
      onDispatched?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch this order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:px-4">
      <button aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-200 sm:hidden" />
        <h2 className="text-lg font-bold text-neutral-900">Send order #{orderNo} for delivery</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Pick the courier and add its tracking details. The customer gets a WhatsApp message with
          the tracking info.
        </p>

        {/* Delivery method LOV */}
        <label className="mt-4 block text-sm font-medium text-neutral-800">Delivery method</label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as DeliveryProvider)
            setValue('')
            setError(null)
          }}
          className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-base text-neutral-900 focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/30"
        >
          {DELIVERY_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Tracking handle (number or link, per courier) */}
        <label className="mt-4 block text-sm font-medium text-neutral-800">{config.inputLabel}</label>
        <input
          type={config.handle === 'url' ? 'url' : 'text'}
          inputMode={config.handle === 'url' ? 'url' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={config.placeholder}
          className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/30"
        />

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-2xl border border-neutral-300 py-3.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!valid || saving}
            className="flex-1 rounded-2xl bg-pink py-3.5 text-base font-bold text-white hover:bg-pink-dark disabled:opacity-50"
          >
            {saving ? 'Sending…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
