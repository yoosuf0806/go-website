import { useState } from 'react'
import { useCartStore } from '../../stores/cart'
import { useVoucherStore } from '../../stores/voucher'
import { cartTotals, lineTotal, totalAfterVoucher, voucherDiscount } from '../../lib/pricing'
import { formatLKR, normalizePhone, toWhatsAppNumber } from '../../lib/format'
import { addonSummary, buildOrderMessage, orderWhatsAppLink } from '../../lib/whatsapp'
import { checkoutDetailsSchema, paymentSchema, type CheckoutDetails, type PaymentMethod } from '../../schemas/checkout'
import { useCreateOrder } from '../../hooks/useCreateOrder'
import { useCatalog } from '../../contexts/CatalogContext'
import { uploadBankSlip, validateSlipFile } from '../../lib/bankSlips'

type Step = 'details' | 'review' | 'payment'

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

// 3-step checkout modal (spec §6.4 / 05-checkout.md): Details → Review →
// Confirm. Confirm only opens WhatsApp after a successful order insert, so
// admin records and the customer message never diverge (spec §11). Styled
// after the Blush & Ink mockup: logo header, numbered step tracker, For
// me / It's a gift pill toggle that branches the form, sectioned review
// with Edit links, and a sticky footer with a live "View order" strip.
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
  // Snapshot of the placed order, captured before the cart is cleared so the
  // confirmation screen can still show the recap, re-open WhatsApp, or fall
  // back to copy/call. null until an order succeeds.
  const [success, setSuccess] = useState<{
    orderNo: number
    waLink: string
    message: string
    lines: { name: string; qty: number; total: string }[]
    deliveryLabel: string
    totalLabel: string
    isGift: boolean
    recipientName: string
    recipientPhone: string | null
    paymentMethod: PaymentMethod | null
  } | null>(null)

  // Payment step state (bank transfer is the only live method; card is
  // disabled until the PayHere PR). Slip is uploaded to a private bucket the
  // moment it's picked, so by "Place order" time we already hold its path.
  const [payMethod, setPayMethod] = useState<PaymentMethod>('bank_transfer')
  const [payRef, setPayRef] = useState('')
  const [slipPath, setSlipPath] = useState<string | null>(null)
  const [slipName, setSlipName] = useState<string | null>(null)
  const [slipUploading, setSlipUploading] = useState(false)
  const [payErrors, setPayErrors] = useState<{ paymentRef?: string; slipUrl?: string }>({})

  // The voucher code is entered in the Cart Drawer (shared store) — this step
  // only reflects the already-applied discount in the totals.
  const voucher = useVoucherStore()
  // A percentage voucher's LKR discount depends on this cart's total, so compute
  // it here (voucherDiscount) rather than storing a fixed number in the store.
  const appliedDiscount =
    voucher.status === 'ok' ? voucherDiscount(totals.total, voucher.discountType, voucher.value) : 0
  const finalTotal = totalAfterVoucher(totals.total, appliedDiscount)
  const itemCount = items.reduce((n, i) => n + i.boxQty, 0)
  const waFallback = toWhatsAppNumber(settings.business.whatsapp_number)
  const bank = settings.bankTransfer

  // Earliest allowed delivery is TOMORROW — we don't bake same-day. This is the
  // `min` on the date picker and is re-checked below in case a value is typed in.
  const minDeliveryDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()
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
    // Same-day (or earlier) delivery isn't offered — earliest is tomorrow.
    if (result.data.deliveryDate < minDeliveryDate) {
      setErrors({ deliveryDate: 'Earliest delivery is the next day — please pick a later date.' })
      return
    }
    setErrors({})
    setDetails(result.data)
    setStep('review')
  }

  // Review → Payment. Details are already validated at this point.
  function handleToPayment() {
    setStep('payment')
  }

  // Upload the slip the instant it's chosen, so "Place order" is a single tap
  // that never waits on a network upload. Store only the object path.
  async function handleSlipFile(file: File | null) {
    if (!file) return
    const guard = validateSlipFile(file)
    if (guard) {
      setPayErrors((e) => ({ ...e, slipUrl: guard }))
      return
    }
    setPayErrors((e) => ({ ...e, slipUrl: undefined }))
    setSlipUploading(true)
    try {
      const { path } = await uploadBankSlip(file)
      setSlipPath(path)
      setSlipName(file.name)
    } catch (err) {
      setPayErrors((e) => ({
        ...e,
        slipUrl: err instanceof Error ? err.message : 'Upload failed — try again.',
      }))
    } finally {
      setSlipUploading(false)
    }
  }

  async function handleConfirm() {
    if (!details) return

    // Validate the payment step (bank transfer needs ref + slip).
    const payResult = paymentSchema.safeParse({
      method: payMethod,
      paymentRef: payRef,
      slipUrl: slipPath ?? '',
    })
    if (!payResult.success) {
      const pe: { paymentRef?: string; slipUrl?: string } = {}
      for (const issue of payResult.error.issues) {
        const key = issue.path[0] as 'paymentRef' | 'slipUrl'
        if (!pe[key]) pe[key] = issue.message
      }
      setPayErrors(pe)
      return
    }
    setPayErrors({})

    const isBank = payMethod === 'bank_transfer'
    const appliedVoucher =
      voucher.status === 'ok' ? { code: voucher.code.trim(), discount: appliedDiscount } : null
    try {
      const { orderNo, phone } = await mutation.mutateAsync({
        items,
        totals,
        details,
        voucher: appliedVoucher,
        payment: {
          method: payMethod,
          paymentRef: isBank ? payRef.trim() : null,
          slipUrl: isBank ? slipPath : null,
        },
      })

      // Bank transfer skips the WhatsApp handoff — the order lands as
      // "awaiting verification" and admin checks the slip. Only card/legacy
      // flows build a WhatsApp message.
      const messageInput = {
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
      }
      const link = isBank ? '' : orderWhatsAppLink(settings.business.whatsapp_number, messageInput)
      // Snapshot everything the confirmation screen needs BEFORE clearing the
      // cart — items/totals are about to become empty.
      setSuccess({
        orderNo,
        waLink: link,
        message: isBank ? '' : buildOrderMessage(messageInput),
        lines: items.map((i) => ({
          name: i.productName,
          qty: i.boxQty,
          total: formatLKR(lineTotal(i)),
        })),
        deliveryLabel: totals.deliveryFee === 0 ? 'Free' : formatLKR(totals.deliveryFee),
        totalLabel: formatLKR(finalTotal),
        isGift: details.isGift,
        recipientName: details.recipientName ?? '',
        recipientPhone: details.recipientPhone ? normalizePhone(details.recipientPhone) : null,
        paymentMethod: payMethod,
      })
      if (!isBank && link) window.open(link, '_blank', 'noopener,noreferrer')
      clearCart()
      voucher.remove()
    } catch (err) {
      // A voucher can lose a race between "Apply" and "Confirm" (redeemed by
      // another checkout in between) — drop it so retrying doesn't repeat it.
      if (appliedVoucher && err instanceof Error && /voucher/i.test(err.message)) {
        voucher.remove()
      }
      // mutation.error already holds the message; stay on payment so the
      // customer can retry without losing their details, cart, or slip.
    }
  }

  const stepNo = step === 'details' ? 1 : step === 'review' ? 2 : 3

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
      <button aria-label="Close checkout" className="absolute inset-0 bg-navy/48" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-blush-50 shadow-xl sm:rounded-3xl">
        {/* Header: logo left, back-to-cart affordance right (no nav — minimise exits) */}
        <div className="flex items-center justify-between border-b border-blush-200 bg-white px-5 py-4">
          <span className="font-display text-lg font-extrabold text-pink">Golden Oven</span>
          {success == null && step === 'details' ? (
            <button type="button" onClick={onClose} className="text-sm font-medium text-neutral-500 hover:text-navy">
              ← Cart
            </button>
          ) : success == null && step === 'review' ? (
            <button type="button" onClick={() => setStep('details')} className="text-sm font-medium text-neutral-500 hover:text-navy">
              ← Details
            </button>
          ) : success == null ? (
            <button type="button" onClick={() => setStep('review')} className="text-sm font-medium text-neutral-500 hover:text-navy">
              ← Review
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-navy"
            >
              ✕
            </button>
          )}
        </div>

        {/* Numbered step tracker */}
        {success == null && (
          <div className="flex items-center gap-1.5 border-b border-blush-200 bg-white px-5 py-4">
            <TrackStep n={1} label="Details" state={stepNo > 1 ? 'done' : 'active'} />
            <TrackLine active={stepNo > 1} />
            <TrackStep n={2} label="Review" state={stepNo > 2 ? 'done' : stepNo === 2 ? 'active' : 'upcoming'} />
            <TrackLine active={stepNo > 2} />
            <TrackStep n={3} label="Payment" state={stepNo === 3 ? 'active' : 'upcoming'} />
          </div>
        )}

        {/* ── SUCCESS / CONFIRMATION (07) ─────────────────────── */}
        {success != null ? (
          <OrderConfirmation
            success={success}
            customerName={details?.name ?? ''}
            waFallback={waFallback}
            businessPhone={settings.business.whatsapp_number}
            onClose={onClose}
          />
        ) : step === 'details' ? (
          /* ── DETAILS ───────────────────────────────────────── */
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* For me / It's a gift pill toggle */}
              <div className="flex rounded-full border border-blush-200 bg-white p-1">
                {([false, true] as const).map((gift) => (
                  <button
                    key={String(gift)}
                    type="button"
                    onClick={() => set({ isGift: gift })}
                    className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-colors ${
                      form.isGift === gift ? 'bg-pink text-white' : 'text-navy'
                    }`}
                  >
                    {gift ? "It's a gift" : 'For me'}
                  </button>
                ))}
              </div>

              {/* Your details */}
              <h2 className="mt-5 font-display text-lg text-navy">Your details</h2>
              <div className="mt-3.5 flex flex-col gap-4">
                <Field label="Full name" error={errors.name}>
                  <Input autoComplete="name" placeholder="Your name" value={form.name} invalid={!!errors.name} onChange={(e) => set({ name: e.target.value })} />
                </Field>
                <Field label="Mobile number" error={errors.phone} hint="We'll message you here on WhatsApp.">
                  <Input type="tel" autoComplete="tel" placeholder="07X XXX XXXX" value={form.phone} invalid={!!errors.phone} onChange={(e) => set({ phone: e.target.value })} />
                </Field>
                <Field label="Email" error={errors.email}>
                  <Input type="email" autoComplete="email" placeholder="you@example.com" value={form.email} invalid={!!errors.email} onChange={(e) => set({ email: e.target.value })} />
                </Field>
                <Field label="Alternative contact" error={errors.altPhone} optional>
                  <Input type="tel" autoComplete="tel" placeholder="Optional 2nd number" value={form.altPhone ?? ''} invalid={!!errors.altPhone} onChange={(e) => set({ altPhone: e.target.value })} />
                </Field>
              </div>

              {/* Recipient card — gift orders only */}
              {form.isGift && (
                <div className="mt-5 rounded-2xl border border-blush-200 bg-white p-4 animate-tin">
                  <div className="flex items-center gap-2.5 pb-1">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blush-200 bg-blush-50 text-berry">✦</span>
                    <h3 className="font-display text-[17px] text-navy">Who's receiving it?</h3>
                  </div>
                  <p className="pb-3.5 pt-1.5 text-[13px] leading-relaxed text-neutral-500">
                    This is who we deliver to and coordinate timing with — not who's paying.
                  </p>
                  <div className="flex flex-col gap-4">
                    <Field label="Recipient name" error={errors.recipientName}>
                      <Input placeholder="Amma" value={form.recipientName ?? ''} invalid={!!errors.recipientName} onChange={(e) => set({ recipientName: e.target.value })} />
                    </Field>
                    <Field label="Recipient mobile" error={errors.recipientPhone}>
                      <Input type="tel" placeholder="07X XXX XXXX" value={form.recipientPhone ?? ''} invalid={!!errors.recipientPhone} onChange={(e) => set({ recipientPhone: e.target.value })} />
                    </Field>
                  </div>
                </div>
              )}

              {/* Delivery */}
              <h2 className="mt-5 font-display text-lg text-navy">Delivery</h2>
              <div className="mt-3.5 flex flex-col gap-4">
                <Field label="Address" error={errors.address}>
                  <textarea
                    rows={2}
                    autoComplete="street-address"
                    placeholder="No. 24, Rosmead Place, Colombo 07"
                    value={form.address}
                    onChange={(e) => set({ address: e.target.value })}
                    className={inputCls(!!errors.address)}
                  />
                </Field>
                <Field label="Delivery date" error={errors.deliveryDate}>
                  <Input type="date" min={minDeliveryDate} value={form.deliveryDate} invalid={!!errors.deliveryDate} onChange={(e) => set({ deliveryDate: e.target.value })} />
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
            </div>

            {/* Sticky footer: View order strip + CTA */}
            <div className="border-t border-blush-200 bg-white">
              <div className="flex items-center justify-between border-b border-blush-100 px-5 py-3">
                <span className="text-sm text-neutral-500">
                  View order · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
                <span className="font-bold text-navy">{formatLKR(finalTotal)}</span>
              </div>
              <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full rounded-2xl bg-pink py-4 text-base font-bold text-white transition-colors hover:bg-pink-dark"
                >
                  Continue to review
                </button>
              </div>
            </div>
          </>
        ) : step === 'review' ? (
          /* ── REVIEW ────────────────────────────────────────── */
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h2 className="font-display text-[26px] text-navy">Look right?</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                Check your details, then choose how you'd like to pay on the next step.
              </p>

              {details && (
                <div className="mt-4 flex flex-col gap-4">
                  <RecapCard title="Contact" onEdit={() => setStep('details')}>
                    {details.name}
                    <br />
                    {details.phone}
                    {details.altPhone ? ` · ${details.altPhone}` : ''} · {details.email}
                  </RecapCard>

                  {details.isGift && (
                    <RecapCard title="Gift · recipient" tone="gift" onEdit={() => setStep('details')}>
                      {details.recipientName}
                      {details.recipientPhone ? ` · ${details.recipientPhone}` : ''}
                    </RecapCard>
                  )}

                  <RecapCard title="Delivery" onEdit={() => setStep('details')}>
                    {details.address}
                    <br />
                    <span className="text-neutral-500">{details.deliveryDate}</span>
                    {details.note ? (
                      <>
                        <br />
                        <span className="text-neutral-500">{details.note}</span>
                      </>
                    ) : null}
                  </RecapCard>

                  {/* Order */}
                  <div className="rounded-2xl border border-blush-200 bg-white p-4">
                    <div className="flex items-center justify-between pb-3">
                      <span className="text-[13px] font-bold uppercase tracking-wide text-neutral-500">Order</span>
                      <button type="button" onClick={onClose} className="text-sm font-medium text-pink">
                        Edit
                      </button>
                    </div>
                    <ul className="flex flex-col gap-2.5">
                      {items.map((item) => (
                        <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <div className="text-navy">{item.productName}</div>
                            <div className="truncate text-[13px] text-neutral-500">
                              {[item.packageLabel, addonSummary(item)].filter(Boolean).join(' · ')} · ×{item.boxQty}
                            </div>
                          </div>
                          <span className="shrink-0 text-navy">{formatLKR(lineTotal(item))}</span>
                        </li>
                      ))}
                    </ul>
                    {voucher.status === 'ok' && (
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                        <span>Voucher applied — {voucher.code.trim().toUpperCase()}</span>
                        <button type="button" onClick={voucher.remove} className="font-medium underline hover:no-underline">
                          Remove
                        </button>
                      </div>
                    )}
                    <div className="mt-3 border-t border-blush-100 pt-2.5">
                      <div className="flex justify-between pb-1 text-sm text-neutral-600">
                        <span>Subtotal</span>
                        <span>{formatLKR(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-neutral-600">
                        <span>Delivery ({totals.totalPieces} pcs)</span>
                        <span>{totals.deliveryFee === 0 ? 'Free' : formatLKR(totals.deliveryFee)}</span>
                      </div>
                      {appliedDiscount > 0 && (
                        <div className="mt-1 flex justify-between text-sm text-green-700">
                          <span>Voucher discount</span>
                          <span>−{formatLKR(appliedDiscount)}</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-base font-bold text-navy">Total</span>
                        <span className="text-xl font-bold text-navy">{formatLKR(finalTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky footer: continue to payment */}
            <div className="border-t border-blush-200 bg-white px-4 pb-[max(1.125rem,env(safe-area-inset-bottom))] pt-3.5">
              <button
                type="button"
                onClick={handleToPayment}
                className="w-full rounded-2xl bg-pink py-4 text-base font-bold text-white transition-colors hover:bg-pink-dark"
              >
                Continue to payment
              </button>
              <p className="pt-2.5 text-center text-[13px] text-neutral-500">
                Next: choose how you'd like to pay.
              </p>
            </div>
          </>
        ) : (
          /* ── PAYMENT ───────────────────────────────────────── */
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h2 className="font-display text-[26px] text-navy">How would you like to pay?</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                Pay by bank transfer and upload your slip — we'll verify it and confirm your order.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                {/* Card — coming soon (PayHere), shown but disabled */}
                <div className="flex items-center justify-between rounded-2xl border border-blush-200 bg-white/60 p-4 opacity-70">
                  <div className="flex items-center gap-3">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 border-blush-200" />
                    <div>
                      <div className="font-bold text-navy">Pay by card</div>
                      <div className="text-[13px] text-neutral-500">Visa · Mastercard · Genie</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-blush-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Soon
                  </span>
                </div>

                {/* Bank transfer — the live method */}
                <button
                  type="button"
                  onClick={() => setPayMethod('bank_transfer')}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    payMethod === 'bank_transfer'
                      ? 'border-pink bg-white ring-1 ring-pink'
                      : 'border-blush-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                          payMethod === 'bank_transfer' ? 'border-pink' : 'border-blush-200'
                        }`}
                      >
                        {payMethod === 'bank_transfer' && <span className="h-2.5 w-2.5 rounded-full bg-pink" />}
                      </span>
                      <div>
                        <div className="font-bold text-navy">Bank transfer</div>
                        <div className="text-[13px] text-neutral-500">Upload slip · manual verify</div>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Transfer-to details (from admin-editable settings) */}
                {payMethod === 'bank_transfer' && bank.enabled && (
                  <div className="rounded-2xl border border-blush-200 bg-blush-50 p-4">
                    <div className="pb-3 text-[13px] font-bold uppercase tracking-wide text-neutral-500">
                      Transfer to
                    </div>
                    <dl className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-neutral-500">Bank</dt>
                        <dd className="font-medium text-navy">{bank.bank_name}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-neutral-500">Name</dt>
                        <dd className="font-medium text-navy">{bank.account_name}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-neutral-500">Account No</dt>
                        <dd className="font-medium text-navy">{bank.account_no}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-neutral-500">Branch</dt>
                        <dd className="font-medium text-navy">{bank.branch}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex items-baseline justify-between border-t border-blush-200 pt-3">
                      <span className="font-bold text-navy">Amount</span>
                      <span className="text-lg font-bold text-navy">{formatLKR(finalTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Reference number */}
                {payMethod === 'bank_transfer' && (
                  <Field label="Transfer reference number" error={payErrors.paymentRef}>
                    <input
                      type="text"
                      inputMode="text"
                      value={payRef}
                      onChange={(e) => {
                        setPayRef(e.target.value)
                        if (payErrors.paymentRef) setPayErrors((x) => ({ ...x, paymentRef: undefined }))
                      }}
                      placeholder="e.g. 9F3K2109"
                      className="w-full rounded-xl border border-blush-200 bg-white px-4 py-3 text-navy placeholder:text-neutral-400 focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/40"
                    />
                  </Field>
                )}

                {/* Slip upload */}
                {payMethod === 'bank_transfer' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-navy">Bank slip screenshot</label>
                    <label
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                        payErrors.slipUrl
                          ? 'border-pink bg-white'
                          : slipPath
                            ? 'border-green-400 bg-green-50'
                            : 'border-blush-200 bg-white hover:border-pink'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => handleSlipFile(e.target.files?.[0] ?? null)}
                      />
                      {slipUploading ? (
                        <span className="text-sm font-medium text-neutral-500">Uploading…</span>
                      ) : slipPath ? (
                        <>
                          <span className="text-sm font-bold text-green-700">✓ Slip uploaded</span>
                          <span className="mt-0.5 max-w-full truncate text-[13px] text-neutral-500">{slipName}</span>
                          <span className="mt-1 text-[13px] font-medium text-pink">Replace</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-navy">Tap to upload your slip</span>
                          <span className="mt-0.5 text-[13px] text-neutral-500">JPG, PNG or WebP · max 5 MB</span>
                        </>
                      )}
                    </label>
                    {payErrors.slipUrl && <p className="mt-1.5 text-[13px] text-pink">{payErrors.slipUrl}</p>}
                  </div>
                )}

                {/* Failure retry state */}
                {mutation.isError && (
                  <div className="rounded-2xl border border-pink bg-white p-4 animate-tin">
                    <div className="pb-1.5 font-bold text-pink">We couldn't place that order</div>
                    <p className="pb-2 text-sm leading-relaxed text-neutral-600">
                      Nothing was lost — your details and slip are still here. Try again, or message us and we'll take
                      it from there.
                    </p>
                    {mutation.error instanceof Error && mutation.error.message && (
                      <p className="pb-3 text-[13px] leading-relaxed text-neutral-500">
                        Reason: {mutation.error.message}
                      </p>
                    )}
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={mutation.isPending}
                        className="flex-1 rounded-xl bg-pink py-3.5 text-sm font-bold text-white hover:bg-pink-dark disabled:opacity-50"
                      >
                        Try again
                      </button>
                      {waFallback && (
                        <a
                          href={`https://wa.me/${waFallback}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 rounded-xl bg-[#25d366] py-3.5 text-center text-sm font-bold text-white"
                        >
                          WhatsApp us
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer: place order */}
            <div className="border-t border-blush-200 bg-white px-4 pb-[max(1.125rem,env(safe-area-inset-bottom))] pt-3.5">
              <div className="flex items-baseline justify-between pb-2.5">
                <span className="text-sm text-neutral-500">Total</span>
                <span className="text-lg font-bold text-navy">{formatLKR(finalTotal)}</span>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={mutation.isPending || slipUploading}
                className="w-full rounded-2xl bg-pink py-4 text-base font-bold text-white transition-colors hover:bg-pink-dark disabled:opacity-50"
              >
                {mutation.isPending ? 'Placing order…' : 'Place order'}
              </button>
              <p className="pt-2.5 text-center text-[13px] text-neutral-500">
                Your order is placed as <span className="font-medium text-navy">Awaiting verification</span> — we'll
                confirm once we've checked your slip.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function OrderConfirmation({
  success,
  customerName,
  waFallback,
  businessPhone,
  onClose,
}: {
  success: {
    orderNo: number
    waLink: string
    message: string
    lines: { name: string; qty: number; total: string }[]
    deliveryLabel: string
    totalLabel: string
    isGift: boolean
    recipientName: string
    recipientPhone: string | null
    paymentMethod: PaymentMethod | null
  }
  customerName: string
  waFallback: string | null
  businessPhone: string
  onClose: () => void
}) {
  const [recapOpen, setRecapOpen] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const firstName = customerName.trim().split(/\s+/)[0] || 'there'
  const isBank = success.paymentMethod === 'bank_transfer'

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(success.message)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be blocked (insecure context / permissions) — the
      // WhatsApp link and call button still cover the handoff.
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 pb-6 pt-9 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink text-3xl text-white">✓</div>
        <h2 className="font-display text-[32px] leading-tight text-navy">Thank you, {firstName}.</h2>
        <p className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed text-neutral-600">
          {isBank
            ? "Your order is in and marked awaiting verification. We'll check your transfer slip and confirm timing within the hour."
            : "Your order is in. Send us the WhatsApp message below and we'll confirm timing and lettering within the hour."}
        </p>
        <div className="pt-2 text-sm text-neutral-500">
          Order <span className="font-bold text-navy">#{success.orderNo}</span>
        </div>
      </div>

      {success.isGift && (
        <div className="mx-6 flex items-center gap-3 rounded-2xl border border-pink/40 bg-blush-50 px-4 py-3.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-pink/40 bg-white text-berry">✦</span>
          <div className="text-[14px] leading-relaxed text-neutral-600">
            Gift order — we'll coordinate delivery with{' '}
            <span className="font-medium text-navy">
              {success.recipientName}
              {success.recipientPhone ? ` (${success.recipientPhone})` : ''}
            </span>
            .
          </div>
        </div>
      )}

      {/* Collapsible recap */}
      <div className="mx-6 mt-3.5 overflow-hidden rounded-2xl border border-blush-200">
        <button
          type="button"
          onClick={() => setRecapOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3.5"
        >
          <span className="text-[15px] font-medium text-navy">Order summary · {success.totalLabel}</span>
          <span className="text-neutral-500">{recapOpen ? '−' : '+'}</span>
        </button>
        {recapOpen && (
          <div className="border-t border-blush-100 px-4 pb-4">
            {success.lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-2.5 pt-3 text-[14px] text-neutral-600">
                <span>
                  {l.name} · ×{l.qty}
                </span>
                <span className="text-navy">{l.total}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 text-[14px] text-neutral-600">
              <span>Delivery</span>
              <span className="text-navy">{success.deliveryLabel}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pt-5">
        {isBank ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-pink py-4 text-[17px] font-bold text-white hover:bg-pink-dark"
          >
            Back to shopping
          </button>
        ) : (
          <>
            <a
              href={success.waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25d366] py-4 text-[17px] font-bold text-white shadow-[0_14px_26px_-12px_rgba(37,211,102,0.9)]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
                <path d="M21 11.6a8.4 8.4 0 0 1-12.4 7.4L4 20.5l1.6-4.4A8.4 8.4 0 1 1 21 11.6Z" />
              </svg>
              Continue on WhatsApp
            </a>
            <button type="button" onClick={onClose} className="mt-2.5 w-full py-3 text-[15px] font-medium text-neutral-500 hover:text-navy">
              Back to shopping
            </button>
          </>
        )}
      </div>

      {/* Handoff fallback — WhatsApp may not open on some devices (card flow only) */}
      {!isBank && (
        <div className="mx-6 mt-4 border-t border-blush-200 pb-6 pt-3.5">
        <button
          type="button"
          onClick={() => setHandoffOpen((o) => !o)}
          className="text-[13px] text-neutral-500 underline hover:text-navy"
        >
          WhatsApp didn't open?
        </button>
        {handoffOpen && (
          <div className="mt-3 animate-tin rounded-2xl border border-blush-200 bg-blush-50 p-4">
            <div className="pb-1.5 font-bold text-navy">Order #{success.orderNo} is saved</div>
            <p className="pb-3 text-[14px] leading-relaxed text-neutral-600">
              Your order is safely recorded — reach us any of these ways and quote the order number.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={copyMessage}
                className="w-full rounded-xl bg-blush-100 py-3.5 text-[15px] font-bold text-berry-dark"
              >
                {copied ? 'Copied ✓' : 'Copy order message'}
              </button>
              {waFallback && (
                <a
                  href={`tel:+${waFallback}`}
                  className="w-full rounded-xl bg-blush-100 py-3.5 text-center text-[15px] font-bold text-berry-dark"
                >
                  Call {businessPhone}
                </a>
              )}
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  )
}

function inputCls(invalid: boolean): string {
  return [
    'w-full rounded-xl border bg-white px-4 py-3.5 text-[16px] text-navy',
    'placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink/30',
    invalid ? 'border-pink' : 'border-blush-200 focus:border-pink',
  ].join(' ')
}

function Input({ invalid, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} className={inputCls(!!invalid)} />
}

function Field({
  label,
  error,
  hint,
  optional,
  children,
}: {
  label: string
  error?: string
  hint?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-neutral-500">
        {label}
        {optional && <span className="ml-1 text-neutral-400">(optional)</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1.5 text-[13px] text-pink">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-neutral-500">{hint}</p>
      ) : null}
    </label>
  )
}

// One recap card on the Review step. `tone="gift"` gives the recipient card
// the pink-tinted border that visually distinguishes it, matching the mockup.
function RecapCard({
  title,
  tone = 'default',
  onEdit,
  children,
}: {
  title: string
  tone?: 'default' | 'gift'
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border bg-white p-4 ${tone === 'gift' ? 'border-pink/40' : 'border-blush-200'}`}>
      <div className="flex items-center justify-between pb-2">
        <span className={`text-[13px] font-bold uppercase tracking-wide ${tone === 'gift' ? 'text-berry' : 'text-neutral-500'}`}>
          {title}
        </span>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-pink">
          Edit
        </button>
      </div>
      <div className="text-[15px] leading-relaxed text-navy">{children}</div>
    </div>
  )
}

function TrackStep({ n, label, state }: { n: number; label: string; state: 'done' | 'active' | 'upcoming' }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
          state === 'active'
            ? 'bg-pink text-white'
            : state === 'done'
              ? 'border border-pink bg-blush-50 text-pink'
              : 'border border-blush-200 bg-blush-50 text-neutral-500'
        }`}
      >
        {state === 'done' ? '✓' : n}
      </span>
      <span className={`text-xs ${state === 'upcoming' ? 'font-medium text-neutral-500' : 'font-bold text-navy'}`}>
        {label}
      </span>
    </div>
  )
}

function TrackLine({ active }: { active: boolean }) {
  return <span className={`mb-6 h-0.5 flex-1 ${active ? 'bg-pink' : 'bg-blush-200'}`} />
}
