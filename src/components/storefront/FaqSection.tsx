import { useState } from 'react'

const FAQS = [
  {
    q: 'Can I choose the delivery date?',
    a: 'Yes — pick your preferred delivery date at checkout. We recommend ordering a day earlier to guarantee your slot; every brownie is baked fresh and made to order.',
  },
  {
    q: 'How long do the brownies stay fresh?',
    a: 'Our brownies stay fudgy for up to 5 days at room temperature in their sealed packaging, and longer refrigerated.',
  },
  {
    q: 'Will they be safe during delivery?',
    a: 'Every box is packed snugly with the topper and add-ons secured so your gift arrives exactly as intended.',
  },
  {
    q: 'What are the delivery options and cost?',
    a: 'We deliver across Sri Lanka. Delivery is a flat fee calculated once per order from your combined box count, shown clearly at checkout.',
  },
  {
    q: 'Is your packaging sustainable?',
    a: 'Yes — we use recyclable, thoughtfully sourced packaging designed to protect the brownies and the planet.',
  },
]

// "Got any questions?" FAQ accordion (browniegod-style). One item open at a
// time; keyed by index into a small static list.
export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bg-blush-50 px-4 py-14">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold">Got any questions?</h2>
          <p className="mt-3 max-w-sm text-sm text-ink/70">
            Everything you need to know about our brownies, delivery, and ordering.
          </p>
        </div>
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {FAQS.map((faq, i) => {
            const isOpen = open === i
            return (
              <div key={faq.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium"
                >
                  {faq.q}
                  <span className="text-lg text-wine">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <p className="pb-4 text-sm text-ink/70">{faq.a}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
