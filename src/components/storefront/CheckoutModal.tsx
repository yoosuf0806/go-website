import { useState } from 'react'
import { useCartStore } from '../../stores/cart'
import { useVoucherStore } from '../../stores/voucher'
import { cartTotals, lineTotal, totalAfterVoucher } from '../../lib/pricing'
import { formatLKR, normalizePhone } from '../../lib/format'
import { addonSummary, orderWhatsAppLink } from '../../lib/whatsapp'
import { checkoutDetailsSchema, type CheckoutDetails } from '../../schemas/checkout'
import { useCreateOrder } from '../../hooks/useCreateOrder'
import { useCatalog } from '../../contexts/CatalogContext'

type Step = 'details' | 'review'

const emptyForm: CheckoutDetails = {
  name: '',
  phone: '',
  email: '',
  altPhone: '',
  address: '',
  deliveryDate: '',
  note: '',
  isGift: false,
  recipientName: '',
  recipientPhone: '',
}

interface CheckoutModalProps {
  onClose: () => void
}

// 3-step checkout modal (spec §6.4): Details → Review → Confirm. Confirm only
// opens WhatsApp after a successful order insert, so admin records and the
// customer message never diverge (spec §11). The Details step is styled after
// the reference checkout: clean sectioned layout (Contact / Delivery), single
// column, generous inputs, mobile-first.
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

  // The voucher code is entered in the Cart Drawer (shared store) — this step
  // only reflects the already-applied discount in the totals.
  const voucher = useVoucherStore()
  const appliedDiscount = voucher.status === 'ok' ? voucher.discount : 0
  const finalTotal = totalAfterVoucher(totals.total, appliedDiscount)

  const today = new Date().toISOString().slice(0, 10)
  const set = (patch: Partial<CheckoutDetails>) => setForm((f) => ({ ...f, ...patch }))

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
    const appliedVoucher =
      voucher.status === 'ok' ? { code: voucher.code.trim(), discount: voucher.discount } : null
    try {
      const { orderNo, phone } = await mutation.mutateAsync({
        items,
        totals,
        details,
        voucher: appliedVoucher,
      })
      const link = orderWhatsAppLink(settings.business.whatsapp_number, {
        orderNo,
        items,
        totals,
        customer: {
          name: details.name,
          phone,
          email: details.email,
          altPhone: details.altPhone ? normalizePhone(details.altPhone) : null,
          address: details.address,
          deliveryDate: details.deliveryDate,
          note: details.note,
          isGift: details.isGift,
          recipientName: details.recipientName,
          recipientPhone: details.recipientPhone ? normalizePhone(details.recipientPhone) : null,
        },
        voucher: appliedVoucher,
      })
      window.open(link, '_blank', 'noopener,noreferrer')
      clearCart()
      voucher.remove()
      setSuccessOrderNo(orderNo)
    } catch (err) {
      // A voucher can lose a race between "Apply" and "Confirm" (redeemed by
      // another checkout in between) — drop it so retrying doesn't repeat it.
      if (appliedVoucher && err instanceof Error && /voucher/i.test(err.message)) {
        voucher.remove()
      }
      // mutation.error already holds the message; stay on the review step so
      // the customer can retry without losing their details or cart.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
      <button aria-label="Close checkout" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* Branded header + step tracker */}
        <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white">
          <div className="flex items-center justify-between px-5 py-3.5 sm:px-6">
            <span className="font-display text-lg font-extrabold text-pink">Golden Oven</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            >
              ✕
            </button>
          </div>
          {successOrderNo == null && (
            <div className="flex items-center justify-center gap-2 pb-4">
              <StepDot label="Cart" state="done" />
              <StepLine done />
              <StepDot label="Details" state={step === 'details' ? 'active' : 'done'} icon="📋" />
              <StepLine done={step === 'review'} />
              <StepDot label="Review" state={step === 'review' ? 'active' : 'upcoming'} icon="🔍" />
              <StepLine />
              <StepDot label="WhatsApp" state="upcoming" icon="💬" />
            </div>
          )}
        </div>

        <div className="px-5 py-5 pb-safe sm:px-6">
          {successOrderNo != null ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
                ✓
              </div>
              <h2 className="font-display text-xl text-navy">Order #{successOrderNo} confirmed!</h2>
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
              <h2 className="font-display text-lg text-navy">Checkout</h2>

              {/* ── Gift / For me toggle ────────────────────────── */}
              <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200">
                <button
                  type="button"
                  onClick={() => set({ isGift: false })}
                  className={`flex flex-col items-center gap-1 px-3 py-3.5 text-sm font-bold transition-colors ${
                    !form.isGift ? 'bg-pink text-white' : 'text-navy hover:bg-neutral-50'
                  }`}
                >
                  <span className="text-lg">🙂</span>
                  It's for me
                </button>
                <button
                  type="button"
                  onClick={() => set({ isGift: true })}
                  className={`flex flex-col items-center gap-1 border-l border-neutral-200 px-3 py-3.5 text-sm font-bold transition-colors ${
                    form.isGift ? 'bg-pink text-white' : 'text-navy hover:bg-neutral-50'
                  }`}
                >
                  <span className="text-lg">🎁</span>
                  It's a gift
                </button>
              </div>

              {form.isGift && (
                <section className="mt-5 rounded-xl border border-neutral-200 p-4">
                  <CardTitle icon="🎁" title="Recipient Information" />
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Recipient's name" error={errors.recipientName} required>
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={form.recipientName ?? ''}
                        invalid={!!errors.recipientName}
                        onChange={(e) => set({ recipientName: e.target.value })}
                      />
                    </Field>
                    <Field label="Recipient's phone" error={errors.recipientPhone} required>
                      <Input
                        type="tel"
                        placeholder="07X XXX XXXX"
                        value={form.recipientPhone ?? ''}
                        invalid={!!errors.recipientPhone}
                        onChange={(e) => set({ recipientPhone: e.target.value })}
                      />
                    </Field>
                  </div>
                </section>
              )}

              {/* ── Contact ─────────────────────────────────────── */}
              <section className="mt-5 rounded-xl border border-neutral-200 p-4">
                <CardTitle icon="👤" title="Contact" />
                <div className="mt-3 flex flex-col gap-3">
                  <Field label="Full name" error={errors.name} required>
                    <Input
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      value={form.name}
                      invalid={!!errors.name}
                      onChange={(e) => set({ name: e.target.value })}
                    />
                  </Field>
                  <Field label="Email" error={errors.email} required>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={form.email}
                      invalid={!!errors.email}
                      onChange={(e) => set({ email: e.target.value })}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Phone" error={errors.phone} required>
                      <Input
                        type="tel"
                        autoComplete="tel"
                        placeholder="07X XXX XXXX"
                        value={form.phone}
                        invalid={!!errors.phone}
                        onChange={(e) => set({ phone: e.target.value })}
                      />
                    </Field>
                    <Field label="Alternative contact" error={errors.altPhone} optional>
                      <Input
                        type="tel"
                        autoComplete="tel"
                        placeholder="Optional 2nd number"
                        value={form.altPhone ?? ''}
                        invalid={!!errors.altPhone}
                        onChange={(e) => set({ altPhone: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* ── Delivery ────────────────────────────────────── */}
              <section className="mt-5 rounded-xl border border-neutral-200 p-4">
                <CardTitle icon="📍" title="Address Details" />
                <div className="mt-3 flex flex-col gap-3">
                  <Field label="Delivery address" error={errors.address} required>
                    <textarea
                      rows={2}
                      autoComplete="street-address"
                      placeholder="House / street, area, city"
                      value={form.address}
                      onChange={(e) => set({ address: e.target.value })}
                      className={inputCls(!!errors.address)}
                    />
                  </Field>
                  <Field label="Delivery date" error={errors.deliveryDate} required>
                    <Input
                      type="date"
                      min={today}
                      value={form.deliveryDate}
                      invalid={!!errors.deliveryDate}
                      onChange={(e) => set({ deliveryDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Note" error={errors.note} optional>
                    <textarea
                      rows={2}
                      placeholder="Anything we should know? (e.g. gate code)"
                      value={form.note ?? ''}
                      onChange={(e) => set({ note: e.target.value })}
                      className={inputCls(!!errors.note)}
                    />
                  </Field>
                </div>
              </section>

              <button
                type="button"
                onClick={handleContinue}
                className="mt-6 w-full rounded-full bg-pink py-3 text-sm font-bold text-white transition-colors hover:bg-pink-dark"
              >
                Continue to review
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display text-lg text-navy">Review your order</h2>
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
              {/* Gift voucher — applied from the cart drawer; shown here read-only */}
              {voucher.status === 'ok' && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <span>Voucher applied — {voucher.code.trim().toUpperCase()}</span>
                  <button type="button" onClick={voucher.remove} className="font-medium underline hover:no-underline">
                    Remove
                  </button>
                </div>
              )}

              <div className="mt-4 border-t border-neutral-200 pt-3">
                <div className="flex justify-between text-sm text-neutral-600">
                  <span>Subtotal</span>
                  <span>{formatLKR(totals.subtotal)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm text-neutral-600">
                  <span>Delivery ({totals.totalPieces} pcs)</span>
                  <span>{formatLKR(totals.deliveryFee)}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="mt-1 flex justify-between text-sm text-green-700">
                    <span>Voucher discount</span>
                    <span>−{formatLKR(appliedDiscount)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between text-base font-semibold text-navy">
                  <span>Total</span>
                  <span>{formatLKR(finalTotal)}</span>
                </div>
              </div>

              {/* Contact recap so the customer can catch a typo before sending */}
              {details && (
                <div className="mt-4 rounded-xl bg-blush-100 px-4 py-3 text-xs text-neutral-600">
                  <div className="font-semibold text-navy">{details.name}</div>
                  <div>
                    📞 {details.phone}
                    {details.altPhone ? ` · ${details.altPhone}` : ''}
                  </div>
                  <div>✉️ {details.email}</div>
                  <div>📍 {details.address}</div>
                  {details.isGift && (
                    <div className="mt-2 border-t border-neutral-200 pt-2">
                      <span className="font-semibold text-pink">🎁 Gift for:</span> {details.recipientName}
                      {details.recipientPhone ? ` · 📞 ${details.recipientPhone}` : ''}
                    </div>
                  )}
                </div>
              )}

              {mutation.isError && (
                <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {mutation.error.message} — nothing was charged, please retry.
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="flex-1 rounded-full border border-neutral-300 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={mutation.isPending}
                  className="flex-1 rounded-full bg-pink py-3 text-sm font-bold text-white hover:bg-pink-dark disabled:opacity-50"
                >
                  {mutation.isPending ? 'Confirming…' : mutation.isError ? 'Retry' : 'Confirm order'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function inputCls(invalid: boolean): string {
  return [
    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-navy placeholder:text-neutral-400',
    'focus:outline-none focus:ring-2 focus:ring-pink/40',
    invalid ? 'border-red-400' : 'border-neutral-300 focus:border-pink',
  ].join(' ')
}

function Input({
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} className={inputCls(!!invalid)} />
}

function Field({
  label,
  error,
  required,
  optional,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-navy">
        {label}
        {optional && <span className="ml-1 font-normal text-neutral-400">(optional)</span>}
        {required && <span className="ml-0.5 text-pink">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  )
}

function CardTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-light text-sm">{icon}</span>
      <h3 className="font-display text-base text-navy">{title}</h3>
    </div>
  )
}

function StepDot({
  label,
  state,
  icon,
}: {
  label: string
  state: 'done' | 'active' | 'upcoming'
  icon?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
          state === 'done'
            ? 'bg-pink text-white'
            : state === 'active'
              ? 'bg-pink text-white shadow-[0_0_0_3px_rgba(217,45,86,0.25)]'
              : 'bg-neutral-100 text-neutral-400'
        }`}
      >
        {state === 'done' ? '✓' : icon}
      </div>
      <span className={`text-[10px] font-semibold ${state === 'upcoming' ? 'text-neutral-400' : 'text-navy'}`}>
        {label}
      </span>
    </div>
  )
}

function StepLine({ done = false }: { done?: boolean }) {
  return <div className={`mb-3.5 h-0.5 w-6 rounded ${done ? 'bg-pink' : 'bg-neutral-200'}`} />
}
