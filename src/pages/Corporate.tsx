import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCatalog } from '../contexts/CatalogContext'
import { useCreateQuote } from '../hooks/useCreateInquiry'
import { quoteFormSchema, type QuoteFormRaw } from '../schemas/inquiry'
import Toast from '../components/ui/Toast'
import Seo from '../components/Seo'

export default function Corporate() {
  const { catalog } = useCatalog()
  const { quoteFlavors, content } = catalog
  const corp = content.corporate
  const [toast, setToast] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const mutation = useCreateQuote()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormRaw>({
    resolver: zodResolver(quoteFormSchema),
  })

  const selectedFlavorId = watch('flavorId')

  async function onSubmit(data: QuoteFormRaw) {
    try {
      await mutation.mutateAsync({
        ...data,
        category: 'corporate',
        pieceCount: Number(data.pieceCount),
      })
      setSubmitted(true)
      reset()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Seo
        title={content.seo.corporate.title}
        description={content.seo.corporate.description}
        path="/corporate"
      />

      <h1 className="font-display text-3xl font-semibold text-navy">{corp.heading}</h1>
      <p className="mt-3 max-w-2xl text-neutral-500">{corp.intro}</p>

      {/* Product info pills */}
      <ul className="mt-6 flex flex-wrap gap-2">
        {corp.productInfo.map((info) => (
          <li
            key={info}
            className="rounded-full border border-pink/30 bg-pink-light px-4 py-1.5 text-sm text-neutral-700"
          >
            {info}
          </li>
        ))}
      </ul>

      {/* Pre-order note */}
      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {corp.preOrderNote}
      </p>

      {submitted ? (
        <SuccessBanner onReset={() => setSubmitted(false)} />
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 rounded-3xl bg-pink-light p-6 sm:p-10"
        >
          <h2 className="font-display text-xl font-semibold">Request a Quote</h2>

          {/* Flavor picker */}
          {quoteFlavors.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-neutral-700">Preferred Flavour (optional)</p>
              <div className="flex flex-wrap gap-2">
                {quoteFlavors.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      if (selectedFlavorId === f.id) {
                        setValue('flavorId', undefined)
                        setValue('flavorName', undefined)
                      } else {
                        setValue('flavorId', f.id)
                        setValue('flavorName', f.name)
                      }
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      selectedFlavorId === f.id
                        ? 'border-pink bg-pink text-white'
                        : 'border-pink/30 bg-white text-neutral-700 hover:border-pink'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Your Name *" error={errors.name?.message}>
              <input
                {...register('name')}
                placeholder="e.g. Dilshan Fernando"
                className={inputCls(!!errors.name)}
              />
            </Field>

            <Field label="Phone Number *" error={errors.phone?.message}>
              <input
                {...register('phone')}
                type="tel"
                placeholder="07X XXX XXXX"
                className={inputCls(!!errors.phone)}
              />
            </Field>

            <Field label="Email (optional)" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                placeholder="you@company.com"
                className={inputCls(!!errors.email)}
              />
            </Field>

            <Field label="Number of Pieces *" error={errors.pieceCount?.message}>
              <input
                {...register('pieceCount')}
                type="number"
                min={1}
                placeholder="e.g. 60"
                className={inputCls(!!errors.pieceCount)}
              />
            </Field>

            <Field label="Delivery Date *" error={errors.deliveryDate?.message} className="sm:col-span-2">
              <input
                {...register('deliveryDate')}
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className={inputCls(!!errors.deliveryDate)}
              />
            </Field>

            <Field label="Additional Notes (optional)" error={errors.message?.message} className="sm:col-span-2">
              <textarea
                {...register('message')}
                rows={3}
                placeholder="Flavour requests, packaging notes, delivery instructions…"
                className={inputCls(!!errors.message) + ' resize-none'}
              />
            </Field>
          </div>

          {mutation.error && (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {mutation.error.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="mt-6 rounded-full bg-pink px-8 py-3 text-sm font-bold text-white hover:bg-pink-dark disabled:opacity-50"
          >
            {mutation.isPending ? 'Sending…' : 'Send Quote Request'}
          </button>
        </form>
      )}

      {/* FAQ */}
      {corp.faq.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">Frequently Asked Questions</h2>
          <dl className="mt-4 space-y-4">
            {corp.faq.map((item) => (
              <div key={item.q} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <dt className="font-medium text-neutral-900">{item.q}</dt>
                <dd className="mt-1 text-sm text-neutral-500">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function SuccessBanner({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-8 rounded-3xl bg-pink-light p-8 text-center">
      <p className="text-3xl">🎉</p>
      <h2 className="mt-3 font-display text-xl font-semibold">Quote request received!</h2>
      <p className="mt-2 text-neutral-500">
        We'll review your request and get back to you within one business day.
      </p>
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
