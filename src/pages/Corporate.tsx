import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCatalog } from '../contexts/CatalogContext'
import { useCreateQuote } from '../hooks/useCreateInquiry'
import { quoteFormSchema, type QuoteFormRaw } from '../schemas/inquiry'
import type { CatalogQuoteFlavor } from '../types/catalog'
import CorporateBanner from '../components/storefront/CorporateBanner'
import Toast from '../components/ui/Toast'
import Seo from '../components/Seo'

const PILLS = ['🌱 Vegetarian', '🍫 Freshly Baked', '✅ Halal']

export default function Corporate() {
  const { catalog } = useCatalog()
  const { quoteFlavors, content } = catalog
  const corp = content.corporate

  const [toast, setToast] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const mutation = useCreateQuote()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormRaw>({ resolver: zodResolver(quoteFormSchema) })

  const selected = quoteFlavors.find((f) => f.id === selectedId) ?? null
  const heroImage = selected?.imageUrl ?? quoteFlavors.find((f) => f.imageUrl)?.imageUrl ?? null
  const pieceCount = watch('pieceCount')

  function pickFlavor(f: CatalogQuoteFlavor) {
    const next = selectedId === f.id ? null : f
    setSelectedId(next?.id ?? null)
    setValue('flavorId', next?.id)
    setValue('flavorName', next?.name)
  }

  async function onSubmit(data: QuoteFormRaw) {
    try {
      await mutation.mutateAsync({ ...data, category: 'corporate', pieceCount: Number(data.pieceCount) })
      setSubmitted(true)
      reset()
      setSelectedId(null)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Seo title={content.seo.corporate.title} description={content.seo.corporate.description} path="/corporate" />

      <CorporateBanner banners={corp.banners} />

      <nav className="mt-4 text-sm text-neutral-400">
        <span>Home</span> <span className="mx-1">›</span>
        <span className="text-neutral-600">{corp.heading}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        {/* Left: flavour image + info pills */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-pink-light">
            {heroImage ? (
              <img src={heroImage} alt={selected?.name ?? 'Brownies'} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[8rem]">🍫</div>
            )}
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {PILLS.map((p) => (
                <span key={p} className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
                  {p}
                </span>
              ))}
            </div>
            {selected && (
              <span className="absolute bottom-4 left-4 rounded-full bg-navy/80 px-3 py-1 text-xs font-medium text-white">
                {selected.name}
              </span>
            )}
          </div>

          {corp.productInfo.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {corp.productInfo.map((info) => (
                <div key={info} className="flex items-start gap-2 rounded-2xl bg-pink-light px-4 py-3 text-sm text-neutral-700">
                  <span className="text-pink">◆</span>
                  <span>{info}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: heading, flavour picker, quote form */}
        <div>
          <p className="text-sm text-neutral-500">
            <span className="text-pink">★★★★★</span> Loved by 200+ teams across Colombo
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-navy">{corp.heading}</h1>
          <p className="mt-3 text-neutral-500">{corp.intro}</p>

          {corp.preOrderNote && (
            <p className="mt-4 rounded-xl bg-pink-light px-4 py-3 text-sm text-neutral-700">
              <span className="font-semibold text-pink">Heads up:</span> {corp.preOrderNote}
            </p>
          )}

          {/* Flavour picker */}
          {quoteFlavors.length > 0 && (
            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-neutral-700">Choose your flavour</p>
                <span className="text-xs text-neutral-400">Mix flavours in notes</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {quoteFlavors.map((f) => {
                  const active = selectedId === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => pickFlavor(f)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                        active ? 'border-pink bg-pink-light' : 'border-neutral-200 bg-white hover:border-pink'
                      }`}
                    >
                      <p className="text-sm font-semibold text-neutral-900">{f.name}</p>
                      {f.description && <p className="mt-0.5 text-xs text-neutral-500">{f.description}</p>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quote form / success */}
          {submitted ? (
            <SuccessBanner onReset={() => setSubmitted(false)} />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl font-semibold">Request a Quote</h2>
                <span className="text-xs text-neutral-400">~1 day response</span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Your name" error={errors.name?.message}>
                  <input {...register('name')} placeholder="Dilshan Fernando" className={inputCls(!!errors.name)} />
                </Field>
                <Field label="Phone number" error={errors.phone?.message}>
                  <input {...register('phone')} type="tel" placeholder="07X XXX XXXX" className={inputCls(!!errors.phone)} />
                </Field>
                <Field label="Email (optional)" error={errors.email?.message}>
                  <input {...register('email')} type="email" placeholder="you@company.com" className={inputCls(!!errors.email)} />
                </Field>
                <Field label="Number of pieces" error={errors.pieceCount?.message}>
                  <input {...register('pieceCount')} type="number" min={1} placeholder="e.g. 60" className={inputCls(!!errors.pieceCount)} />
                </Field>
                <Field label="Delivery date" error={errors.deliveryDate?.message}>
                  <input
                    {...register('deliveryDate')}
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className={inputCls(!!errors.deliveryDate)}
                  />
                </Field>
                <Field label="Notes (optional)" error={errors.message?.message} className="sm:col-span-2">
                  <textarea
                    {...register('message')}
                    rows={3}
                    placeholder="Flavour split, packaging or branding requests, delivery instructions…"
                    className={inputCls(!!errors.message) + ' resize-none'}
                  />
                </Field>
              </div>

              {/* Selected summary */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-pink-light px-4 py-2.5 text-sm">
                <span className="text-neutral-500">Selected</span>
                <span className="font-medium text-neutral-800">
                  {pieceCount ? `${pieceCount} pcs` : '— pcs'} · {selected?.name ?? 'Any flavour'}
                </span>
              </div>

              {mutation.error && (
                <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{mutation.error.message}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="mt-5 w-full rounded-full bg-pink py-3 text-sm font-bold text-white hover:bg-pink-dark disabled:opacity-50"
              >
                {mutation.isPending ? 'Sending…' : 'Send Quote Request 🎁'}
              </button>
              <p className="mt-3 text-center text-xs text-neutral-400">
                By submitting you agree to be contacted about your quote.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* FAQ */}
      {corp.faq.length > 0 && (
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center font-display text-3xl font-semibold text-navy">Frequently asked questions</h2>
          <dl className="mt-6 space-y-3">
            {corp.faq.map((item) => (
              <Faq key={item.q} q={item.q} a={item.a} />
            ))}
          </dl>
        </section>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium text-neutral-900"
      >
        {q}
        <span className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && <p className="px-5 pb-4 text-sm text-neutral-500">{a}</p>}
    </div>
  )
}

function SuccessBanner({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <p className="text-3xl">🎉</p>
      <h2 className="mt-3 font-display text-xl font-semibold">Quote request received!</h2>
      <p className="mt-2 text-neutral-500">We'll review your request and get back to you within one business day.</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-full border border-pink px-6 py-2.5 text-sm font-medium text-pink hover:bg-pink hover:text-white"
      >
        Submit another request
      </button>
    </div>
  )
}

function Field({
  label,
  error,
  children,
  className = '',
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  )
}

function inputCls(hasError: boolean) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm ${
    hasError ? 'border-red-400 bg-red-50' : 'border-neutral-200 bg-white'
  } focus:outline-none focus:ring-2 focus:ring-pink/40`
}
