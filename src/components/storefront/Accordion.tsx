import { useState, type ReactNode } from 'react'

interface AccordionItem {
  title: string
  content: ReactNode
}

// Accordion for the product detail sections (Description / Freshness /
// Allergens). Reference style: bordered card, pink +/− icon, first item open.
export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.title} className="border-b border-neutral-200 last:border-b-0">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-left text-sm font-bold text-navy hover:bg-warmgray"
            >
              {item.title}
              <span className="text-xl text-pink">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div className="px-5 pb-4 text-sm leading-relaxed text-neutral-500">{item.content}</div>}
          </div>
        )
      })}
    </div>
  )
}
