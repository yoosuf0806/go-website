import type { OccasionCard } from '../../types/content'

// "Occasions We Cover" — a tidy responsive grid. Emojis are intentionally
// dropped (they looked toy-ish on the corporate page); each occasion is a
// clean check-tag. If an admin has uploaded an image for an occasion we still
// honour it as an image card, otherwise it falls back to the check-tag.
export default function QuoteOccasionsGrid({ heading, occasions }: { heading: string; occasions: OccasionCard[] }) {
  if (occasions.length === 0) return null
  const hasImages = occasions.some((o) => o.imageUrl)

  return (
    <section className="px-6 pt-10 sm:px-10">
      <h2 className="pb-4 font-display text-2xl text-navy sm:text-[28px]">{heading}</h2>

      {hasImages ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {occasions.map((o, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-blush-200 bg-white">
              <div className="aspect-[3/2] bg-blush-100">
                {o.imageUrl && <img src={o.imageUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <p className="px-3 py-2.5 text-[14px] font-medium text-navy">{o.title}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {occasions.map((o, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-2xl border border-blush-200 bg-blush-50 px-4 py-3.5"
            >
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-pink text-white">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M4 10.5l3.5 3.5L16 5.5" />
                </svg>
              </span>
              <span className="text-[14px] font-medium text-navy">{o.title}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
