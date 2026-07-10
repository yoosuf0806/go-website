import { useState } from 'react'
import { useCartStore } from '../../stores/cart'
import { cartTotals, lineTotal } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { addonSummary, orderWhatsAppLink } from '../../lib/whatsapp'
import { checkoutDetailsSchema, type CheckoutDetails } from '../../schemas/checkout'
import { useCreateOrder } from '../../hooks/useCreateOrder'
import { useCatalog } from '../../contexts/CatalogContext'

type Step = 'details' | 'review'

const emptyForm: CheckoutDetails = { name: '', phone: '', address: '', deliveryDate: '', note: '' }

interface CheckoutModalProps {
  onClose: () => void
}

// 3-step checkout modal (spec §6.4): Details → Review → Confirm. Confirm only
// opens WhatsApp after a successful order insert, so admin records and the
// customer message never diverge (spec §11).
export default function CheckoutModal({ onClose }: CheckoutModalProps) {
  const { catalog } = useCatalog()
  const { deliveryTiers, settings } = catalog
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clear)
  const totals = cartTotals(items, deliveryTiers)
  const mutation = useCreateOrder()

  const [step, setStep] = useState<Step>('details')
  const [form, setForm] = useState<CheckoutDetails>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutDetails, string>>>({})
  const [details, setDetails] = useState<CheckoutDetails | null>(null)
  const [successOrderNo, setSuccessOrderNo] = useState<number | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  function handleContinue() {
    const result = checkoutDetailsSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutDetails, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof CheckoutDetails
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setDetails(result.data)
    setStep('review')
  }

  async function handleConfirm() {
    if (!details) return
    try {
      const { orderNo, phone } = await mutation.mutateAsync({ items, totals, details })
      const link = orderWhatsAppLink(settings.business.whatsapp_number, {
        orderNo,
        items,
        totals,
        customer: {
          name: details.name,
          phone,
          address: details.address,
          deliveryDate: details.deliveryDate,
          note: details.note,
        },
      })
      window.open(link, '_blank', 'noopener,noreferrer')
      clearCart()
      setSuccessOrderNo(orderNo)
    } catch {
      // mutation.error already holds the message; stay on the review step so
      // the customer can retry without losing their details or cart.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button aria-label="Close checkout" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-800"
        >
          ✕
        </button>

        {successOrderNo != null ? (
          <div className="py-6 text-center">
            <h2 className="text-xl font-semibold">Order #{successOrderNo} confirmed!</h2>
            <p className="mt-2 text-sm text-neutral-600">
              We've opened WhatsApp with your order details — send the message to confirm with Golden
              Oven.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-pink px-6 py-2.5 text-sm font-bold text-white hover:bg-pink-dark"
            >
              Done
            </button>
          </div>
        ) : step === 'details' ? (
          <>
            <h2 className="text-lg font-semibold">Your details</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Field label="Name" error={errors.name}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input
                  type="tel"
                  placeholder="07X XXX XXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Delivery address" error={errors.address}>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Delivery date" error={errors.deliveryDate}>
                <input
                  type="date"
                  min={today}
                  value={form.deliveryDate}
                  onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Note (optional)" error={errors.note}>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={handleContinue}
              className="mt-6 w-full rounded-full bg-pink py-2.5 text-sm font-bold text-white hover:bg-pink-dark"
            >
              Continue to review
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Review your order</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.key} className="text-sm">
                  <div className="flex justify-between">
                    <span>
                      {item.productName} — {item.packageLabel} × {item.boxQty}
                    </span>
                    <span className="font-medium">{formatLKR(lineTotal(item))}</span>
                  </div>
                  {addonSummary(item) && (
                    <p className="text-xs text-neutral-500">{addonSummary(item)}</p>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-neutral-200 pt-3">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Subtotal</span>
                <span>{formatLKR(totals.subtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm text-neutral-600">
                <span>Delivery ({totals.totalPieces} pcs)</span>
                <span>{formatLKR(totals.deliveryFee)}</span>
              </div>
              <div className="mt-2 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatLKR(totals.total)}</span>
              </div>
            </div>

            {mutation.isError && (
              <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {mutation.error.message} — nothing was charged, please retry.
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex-1 rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={mutation.isPending}
                className="flex-1 rounded-full bg-pink py-2.5 text-sm font-bold text-white hover:bg-pink-dark disabled:opacity-50"
              >
                {mutation.isPending
                  ? 'Confirming…'
                  : mutation.isError
                    ? 'Retry'
                    : 'Confirm order'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  )
}
