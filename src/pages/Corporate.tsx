import { useState } from 'react'
import { settings, content } from '../data/catalog'
import type { InquiryCategory } from '../schemas/inquiry'
import InquiryModal from '../components/storefront/InquiryModal'
import Toast from '../components/ui/Toast'
import Seo from '../components/Seo'

// Corporate + wedding hero sections and the pink inquiry modal (spec §6.6).
// Each hero is feature-toggleable via site_settings.features; the "Get Your
// Quotation" CTA opens the modal with its category set synchronously.
export default function Corporate() {
  const { corporate_section, wedding_section } = settings.features
  const [modalCategory, setModalCategory] = useState<InquiryCategory | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const noneEnabled = !corporate_section && !wedding_section

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Seo
        title={content.seo.corporate.title}
        description={content.seo.corporate.description}
        path="/corporate"
      />
      <h1 className="font-display text-3xl font-semibold">Corporate &amp; Weddings</h1>

      {noneEnabled && (
        <p className="mt-4 text-neutral-500">
          Bulk enquiries are currently closed. Please check back soon.
        </p>
      )}

      {corporate_section && (
        <Hero
          eyebrow="For offices & events"
          title="Corporate gifting, done deliciously"
          body="Client gifts, office celebrations, and event catering — brownie boxes and slabs at scale, delivered across Sri Lanka."
          onCta={() => setModalCategory('corporate')}
        />
      )}

      {wedding_section && (
        <Hero
          eyebrow="For your big day"
          title="Wedding favours & dessert tables"
          body="Personalised brownie favours and slab centrepieces for weddings and receptions. Tell us your date and guest count for a custom quote."
          onCta={() => setModalCategory('wedding')}
        />
      )}

      {modalCategory && (
        <InquiryModal
          category={modalCategory}
          onClose={() => setModalCategory(null)}
          onSuccess={(category) => {
            setModalCategory(null)
            setToast(
              `Your ${category} inquiry is on its way — send the WhatsApp message to reach us.`,
            )
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function Hero({
  eyebrow,
  title,
  body,
  onCta,
}: {
  eyebrow: string
  title: string
  body: string
  onCta: () => void
}) {
  return (
    <section className="mt-8 rounded-3xl bg-pink-light p-8 sm:p-12">
      <p className="text-xs font-medium uppercase tracking-widest text-pink">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-neutral-500">{body}</p>
      <button
        type="button"
        onClick={onCta}
        className="mt-5 rounded-full bg-pink px-7 py-3 text-sm font-bold text-white hover:bg-pink-dark"
      >
        Get Your Quotation
      </button>
    </section>
  )
}
