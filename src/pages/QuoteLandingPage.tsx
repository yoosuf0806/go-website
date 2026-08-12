import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCatalog } from '../contexts/CatalogContext'
import { useCreateQuote } from '../hooks/useCreateInquiry'
import { quoteFormSchema, type QuoteFormRaw } from '../schemas/inquiry'
import type { CatalogProduct } from '../types/catalog'
import type { QuoteLandingContent, SeoMeta } from '../types/content'
import { toWhatsAppNumber } from '../lib/format'
import QuoteHero from '../components/storefront/QuoteHero'
import QuoteStatsBar from '../components/storefront/QuoteStatsBar'
import QuoteOccasionsGrid from '../components/storefront/QuoteOccasionsGrid'
import QuoteHandledSection from '../components/storefront/QuoteHandledSection'
import Toast from '../components/ui/Toast'
import Seo from '../components/Seo'

const FORM_ANCHOR_ID = 'quote-form'
// Corporate orders are counted in brownie pieces, added a box (9 pieces) at a time.
const MIN_PIECES = 9
const PIECE_STEP = 9
const DEFAULT_GUESTS = 50

const OCCASION_OPTIONS = ['Staff appreciation', 'Client gifting', 'Event / conference favours', "Season's greetings", 'Other']

// Shared landing page for /corporate and /wedding: hero, feature bullets,
// "Popular for" occasions strip, "everything handled" + pricing (bonus
// content beyond the mockup — kept because it's genuinely useful and already
// admin-editable; removing it would just recreate the orphaned-content
// problem from the Home cleanup), the quote-request form, FAQ, and success
// state. Corporate and wedding each pass their own independent `content` +
// `seo`, and get their own form field set / panel styling below.
export default function QuoteLandingPage({
  category,
  content,
  seo,
  path,
}: {
  category: 'corporate' | 'wedding'
  content: QuoteLandingContent
  seo: SeoMeta
  path: string
}) {
  const isCorporate = category === 'corporate'
  const { catalog } = useCatalog()
  const waNumber = toWhatsAppNumber(catalog.settings.business.whatsapp_number)
  // Bulk-order flavours (shared list for both corporate and wedding requests —
  // there's no separate wedding-only flavour flag in the catalog today).
  const flavors = catalog.products.filter((p) => p.isCorporate)

  const [toast, setToast] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const initialQty = isCorporate ? MIN_PIECES : DEFAULT_GUESTS
  const [qty, setQty] = useState(initialQty)
  // Fields the schema/DB don't have dedicated columns for — folded into the
  // `message` note at submit time rather than adding a migration for them.
  const [company, setCompany] = useState('')
  const [occasion, setOccasion] = useState(OCCASION_OPTIONS[0])

  const mutation = useCreateQuote()
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormRaw>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: { pieceCount: String(initialQty) },
  })

  function pickFlavor(f: CatalogProduct) {
    const next = selectedId === f.id ? null : f
    setSelectedId(next?.id ?? null)
    setValue('flavorId', next?.id)
    setValue('flavorName', next?.name)
  }

  const qtyFloor = isCorporate ? MIN_PIECES : 1

  // Set an exact piece count (from typing in the field). No clamping here so a
  // multi-digit number can be typed even when its first digit is below the
  // floor; the floor is enforced on blur (QtyStepper) and by the buttons.
  function setQtyValue(value: number) {
    const next = Number.isFinite(value) ? Math.round(value) : qtyFloor
    setQty(next)
    setValue('pieceCount', String(next))
  }

  function adjustQty(delta: number) {
    setQtyValue(Math.max(qtyFloor, qty + delta))
  }

  function resetExtras() {
    setSelectedId(null)
    setCompany('')
    setOccasion(OCCASION_OPTIONS[0])
    setQty(initialQty)
  }

  async function onSubmit(data: QuoteFormRaw) {
    const extraLines = isCorporate ? [`Occasion: ${occasion}`] : []
    const message = [...extraLines, data.message].filter(Boolean).join('\n')
    const name = isCorporate && company.trim() ? `${data.name} (${company.trim()})` : data.name
    try {
      await mutation.mutateAsync({ ...data, name, message: message || undefined, category, pieceCount: Number(data.pieceCount) })
      setSubmitted(true)
      reset({ pieceCount: String(initialQty) })
      resetExtras()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const qtyLabel = 'Number of brownie pieces'
  const qtyHint = isCorporate ? `Minimum ${MIN_PIECES} · in boxes of ${PIECE_STEP}` : 'Total brownie pieces'

  return (
    <div>
      <Seo title={seo.title} description={seo.description} path={path} />

      <QuoteHero hero={content.hero} ctaHref={`#${FORM_ANCHOR_ID}`} tall={!isCorporate} />
      <QuoteStatsBar stats={content.stats} />
      <QuoteOccasionsGrid heading={content.occasionsHeading} occasions={content.occasions} />
      <QuoteHandledSection
        heading={content.handledHeading}
        imageUrl={content.handledImageUrl}
        items={content.handledItems}
        cta={content.handledCta}
        ctaHref={`#${FORM_ANCHOR_ID}`}
      />

      {/* Quote form / success */}
      <div id={FORM_ANCHOR_ID} className="scroll-mt-20 px-6 pb-16 pt-8 sm:px-10">
        <div className="mx-auto max-w-2xl">
          {submitted ? (
            <SuccessBanner isCorporate={isCorporate} qty={qty} qtyLabel={qtyLabel.toLowerCase()} waNumber={waNumber} onReset={() => setSubmitted(false)} />
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-[18px] border border-blush-200 bg-blush-50 p-6 sm:p-7"
            >
              <h3 className="font-display text-2xl text-navy">
                {isCorporate ? 'Request a quote' : 'Get a wedding quote'}
              </h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#7a5c64]">
                {isCorporate
                  ? 'Six fields. We reply with a formal quotation within one working day.'
                  : 'We reply within one working day, with options.'}
              </p>

              {isCorporate ? (
                <>
                  <GroupLabel>Contact</GroupLabel>
                  <div className="flex flex-col gap-2.5 pb-5">
                    <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className={inputCls(false, false)} />
                    <FieldError error={errors.name?.message}>
                      <input {...register('name')} placeholder="Your name" className={inputCls(!!errors.name, false)} />
                    </FieldError>
                    <div className="flex gap-2.5">
                      <FieldError error={errors.phone?.message} className="flex-1">
                        <input {...register('phone')} type="tel" placeholder="Mobile" className={inputCls(!!errors.phone, false)} />
                      </FieldError>
                      <FieldError error={errors.email?.message} className="flex-1">
                        <input {...register('email')} type="email" placeholder="Work email" className={inputCls(!!errors.email, false)} />
                      </FieldError>
                    </div>
                  </div>

                  <GroupLabel>Order details</GroupLabel>
                  <QtyStepper label={qtyLabel} hint={qtyHint} qty={qty} min={qtyFloor} onAdjust={(d) => adjustQty(d * PIECE_STEP)} onSet={setQtyValue} />
                  <div className="mt-3 flex flex-col gap-2.5 pb-5">
                    <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className={inputCls(false, false)}>
                      {OCCASION_OPTIONS.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                    {flavors.length > 0 && <FlavorChips flavors={flavors} selectedId={selectedId} onPick={pickFlavor} />}
                  </div>

                  <GroupLabel>Delivery date</GroupLabel>
                  <div className="flex flex-col gap-2.5">
                    <FieldError error={errors.deliveryDate?.message}>
                      <input
                        {...register('deliveryDate')}
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className={inputCls(!!errors.deliveryDate, false)}
                      />
                    </FieldError>
                    <textarea
                      {...register('message')}
                      rows={3}
                      placeholder="Anything else we should know? (optional)"
                      className={`${inputCls(false, false)} resize-none`}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  <FieldError error={errors.name?.message}>
                    <input {...register('name')} placeholder="Couple or planner name" className={inputCls(!!errors.name, false)} />
                  </FieldError>
                  <div className="flex gap-2.5">
                    <FieldError error={errors.phone?.message} className="flex-1">
                      <input {...register('phone')} type="tel" placeholder="Mobile" className={inputCls(!!errors.phone, false)} />
                    </FieldError>
                    <FieldError error={errors.email?.message} className="flex-1">
                      <input {...register('email')} type="email" placeholder="Email" className={inputCls(!!errors.email, false)} />
                    </FieldError>
                  </div>
                  <div>
                    <label className="block pb-1.5 text-[13px] font-medium text-[#7a5c64]">Delivery date</label>
                    <FieldError error={errors.deliveryDate?.message}>
                      <input
                        {...register('deliveryDate')}
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className={inputCls(!!errors.deliveryDate, false)}
                      />
                    </FieldError>
                  </div>
                  <QtyStepper label={qtyLabel} hint={qtyHint} qty={qty} min={qtyFloor} onAdjust={(d) => adjustQty(d)} onSet={setQtyValue} />
                  {flavors.length > 0 && <FlavorChips flavors={flavors} selectedId={selectedId} onPick={pickFlavor} />}
                  <textarea
                    {...register('message')}
                    rows={3}
                    placeholder="Notes (optional)"
                    className={`${inputCls(false, false)} resize-none`}
                  />
                </div>
              )}

              {mutation.error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {mutation.error.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="mt-5 w-full rounded-2xl bg-pink py-4 text-base font-bold text-white transition-colors hover:bg-pink-dark disabled:opacity-50"
              >
                {mutation.isPending ? 'Sending…' : isCorporate ? 'Send quote request' : 'Send wedding request'}
              </button>

              {content.preOrderNote && (
                <p className="mt-4 rounded-xl bg-blush-100 px-4 py-3 text-sm text-neutral-700">
                  <span className="font-semibold text-pink">Heads up:</span> {content.preOrderNote}
                </p>
              )}
              <p className="mt-3 text-center text-xs text-neutral-400">
                By submitting you agree to be contacted about your quote.
              </p>
            </form>
          )}

          {/* FAQ */}
          {content.faq.length > 0 && (
            <section className="mt-14">
              <h2 className="text-center font-display text-2xl text-navy">Frequently asked questions</h2>
              <div className="mt-5 flex flex-col gap-2.5">
                {content.faq.map((item, i) => (
                  <Faq key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function GroupLabel({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`pb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] ${dark ? 'text-[#f4b9c8]' : 'text-berry'}`}>{children}</p>
  )
}

function QtyStepper({
  label,
  hint,
  qty,
  min,
  onAdjust,
  onSet,
  dark,
}: {
  label: string
  hint: string
  qty: number
  min: number
  onAdjust: (direction: 1 | -1) => void
  /** Set an exact count typed into the field. */
  onSet: (value: number) => void
  dark?: boolean
}) {
  // Local draft so the customer can freely type (incl. clearing the field)
  // without the count snapping mid-edit; committed to the floor on blur.
  const [draft, setDraft] = useState(String(qty))
  useEffect(() => setDraft(String(qty)), [qty])

  function commit() {
    const n = parseInt(draft, 10)
    const next = Number.isNaN(n) ? min : Math.max(min, n)
    onSet(next)
    setDraft(String(next))
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ${
        dark ? 'border border-white/20' : 'border border-blush-200 bg-white'
      }`}
    >
      <div className="min-w-0">
        <div className={`text-[15px] font-medium ${dark ? 'text-white' : 'text-navy'}`}>{label}</div>
        <div className={`text-xs ${dark ? 'text-white/55' : 'text-[#7a5c64]'}`}>{hint}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAdjust(-1)}
          aria-label="Decrease"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-medium ${
            dark ? 'bg-white/10 text-white' : 'bg-blush-50 text-navy'
          }`}
        >
          −
        </button>
        {/* Tappable count — the customer can also type an exact number. Wide
            enough that a 3–4 digit count stays fully visible on mobile. */}
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          aria-label={label}
          onChange={(e) => {
            const v = e.target.value
            if (!/^\d*$/.test(v)) return
            setDraft(v)
            if (v !== '') onSet(parseInt(v, 10))
          }}
          onBlur={commit}
          className={`w-16 rounded-lg border bg-transparent px-1 py-1.5 text-center text-[16px] font-bold focus:outline-none focus:ring-2 focus:ring-pink/40 ${
            dark ? 'border-white/25 text-white' : 'border-blush-200 text-navy'
          }`}
        />
        <button
          type="button"
          onClick={() => onAdjust(1)}
          aria-label="Increase"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-medium ${
            dark ? 'bg-white/10 text-white' : 'bg-blush-50 text-navy'
          }`}
        >
          +
        </button>
      </div>
    </div>
  )
}

function FlavorChips({
  flavors,
  selectedId,
  onPick,
  dark,
}: {
  flavors: CatalogProduct[]
  selectedId: string | null
  onPick: (f: CatalogProduct) => void
  dark?: boolean
}) {
  return (
    <div>
      <p className={`pb-1.5 text-[13px] ${dark ? 'text-white/60' : 'text-[#7a5c64]'}`}>Preferred flavour (optional)</p>
      <div className="flex flex-wrap gap-2">
        {flavors.map((f) => {
          const active = selectedId === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onPick(f)}
              className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? 'border-pink bg-pink text-white'
                  : dark
                    ? 'border-white/25 text-white/80 hover:border-white/50'
                    : 'border-blush-200 bg-white text-navy hover:border-pink'
              }`}
            >
              {f.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-blush-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[15px] font-medium text-navy"
      >
        {q}
        <span className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <p className="border-t border-blush-100 px-5 pb-4 pt-3 text-sm leading-relaxed text-neutral-600">{a}</p>}
    </div>
  )
}

function SuccessBanner({
  isCorporate,
  qty,
  qtyLabel,
  waNumber,
  onReset,
}: {
  isCorporate: boolean
  qty: number
  qtyLabel: string
  waNumber: string | null
  onReset: () => void
}) {
  return (
    <div className="animate-tin rounded-[18px] border border-pink/30 bg-blush-50 p-6 text-center sm:p-8">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink text-2xl text-white">✓</div>
      <h3 className="font-display text-2xl text-navy">{isCorporate ? 'Request received' : "Congratulations — we're on it"}</h3>
      <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-[#5c4450]">
        {isCorporate
          ? `We've logged ${qty} ${qtyLabel} and will send a formal quotation within one working day.`
          : `We've got your date and ${qty} ${qtyLabel}. Expect flavour and lettering options within one working day.`}
      </p>
      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center justify-center gap-2.5 rounded-2xl bg-[#25d366] py-4 text-[15px] font-bold text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
            <path d="M21 11.6a8.4 8.4 0 0 1-12.4 7.4L4 20.5l1.6-4.4A8.4 8.4 0 1 1 21 11.6Z" />
          </svg>
          Need it sooner? WhatsApp us
        </a>
      )}
      <button
        type="button"
        onClick={onReset}
        className="mt-3.5 text-[13px] font-medium text-neutral-500 underline hover:text-navy"
      >
        Submit another request
      </button>
    </div>
  )
}

function FieldError({
  error,
  dark,
  className = '',
  children,
}: {
  error?: string
  dark?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      {children}
      {error && <p className={`mt-1 text-xs ${dark ? 'text-[#ff9fb5]' : 'text-red-600'}`}>{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean, dark: boolean): string {
  if (dark) {
    return `w-full rounded-xl border px-3.5 py-3.5 text-[16px] text-white placeholder:text-white/45 bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-pink/40 ${
      hasError ? 'border-[#ff9fb5]' : 'border-white/20'
    }`
  }
  return `w-full rounded-xl border bg-white px-3.5 py-3.5 text-[16px] text-navy placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink/30 ${
    hasError ? 'border-pink' : 'border-blush-200 focus:border-pink'
  }`
}
