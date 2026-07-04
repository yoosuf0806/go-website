import { useState } from 'react'
import { inquiryFormSchema, type InquiryCategory, type InquiryForm } from '../../schemas/inquiry'
import { useCreateInquiry } from '../../hooks/useCreateInquiry'
import { inquiryWhatsAppLink } from '../../lib/whatsapp'
import { settings } from '../../data/catalog'

interface InquiryModalProps {
  category: InquiryCategory
  onClose: () => void
  onSuccess: (category: InquiryCategory) => void
}

// Pink corporate/wedding inquiry modal (spec §6.6): zod-validated form → insert
// into inquiries → open pre-filled WhatsApp message → success toast. WhatsApp
// only opens after a successful insert, mirroring the checkout rule (spec §11).
export default function InquiryModal({ category, onClose, onSuccess }: InquiryModalProps) {
  // Category is fixed by the CTA that opened this modal (set synchronously as a
  // prop before render — never hydrated after open, per the §7 modal warning).
  const [form, setForm] = useState<Omit<InquiryForm, 'category'>>({
    name: '',
    phone: '',
    email: '',
    eventDate: '',
    guestCount: undefined,
    message: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof InquiryForm, string>>>({})
  const mutation = useCreateInquiry()

  const label = category === 'wedding' ? 'Wedding' : 'Corporate'

  async function handleSubmit() {
    const result = inquiryFormSchema.safeParse({ ...form, category })
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof InquiryForm, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof InquiryForm
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    try {
      const { phone } = await mutation.mutateAsync(result.data)
      const link = inquiryWhatsAppLink(settings.business.whatsapp_number, {
        category,
        name: result.data.name,
        phone,
        email: result.data.email || undefined,
        eventDate: result.data.eventDate || undefined,
        guestCount:
          typeof result.data.guestCount === 'number' && Number.isFinite(result.data.guestCount)
            ? result.data.guestCount
            : undefined,
        message: result.data.message || undefined,
      })
      window.open(link, '_blank', 'noopener,noreferrer')
      onSuccess(category)
    } catch {
      // mutation.error holds the message; stay open so the user can retry.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button aria-label="Close inquiry" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-800"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-pink-600">{label} quotation request</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Tell us about your {category === 'wedding' ? 'big day' : 'event'} and we'll send a custom
          quote over WhatsApp.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <Field label="Name" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input
              type="tel"
              placeholder="07X XXX XXXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
            />
          </Field>
          <Field label="Email (optional)" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
            />
          </Field>
          <div className="flex gap-3">
            <Field label="Event date (optional)" error={errors.eventDate}>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
            </Field>
            <Field label="Guests (optional)" error={errors.guestCount}>
              <input
                type="number"
                min={1}
                value={form.guestCount ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    guestCount: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
            </Field>
          </div>
          <Field label="Message (optional)" error={errors.message}>
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
            />
          </Field>
        </div>

        {mutation.isError && (
          <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {mutation.error.message} — please retry.
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="mt-6 w-full rounded-full bg-pink-600 py-2.5 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Sending…' : mutation.isError ? 'Retry' : 'Send via WhatsApp'}
        </button>
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
    <label className="block flex-1">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  )
}
