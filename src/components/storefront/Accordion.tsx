import { useState, type ReactNode } from 'react'

interface AccordionItem {
  title: string
  content: ReactNode
}

// Simple accordion for the product detail sections (Description / Freshness /
// Allergens). Keyed by index; first item open by default.
export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="divide-y divide-ink/10 border-y border-ink/10">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.title}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-4 text-left font-display text-lg"
            >
              {item.title}
              <span className="text-xl text-wine">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div className="pb-4 text-sm text-ink/70">{item.content}</div>}
          </div>
        )
      })}
    </div>
  )
}
