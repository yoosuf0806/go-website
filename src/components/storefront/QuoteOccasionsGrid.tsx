import type { OccasionCard } from '../../types/content'

// "Popular for" — a horizontal-scroll strip of occasion cards. Reuses the
// homepage OccasionCard shape but ignores its cta/to (purely informational
// here, not a set of navigation links).
export default function QuoteOccasionsGrid({ heading, occasions }: { heading: string; occasions: OccasionCard[] }) {
  if (occasions.length === 0) return null
  return (
    <section className="pt-6">
      <h2 className="px-6 pb-3 font-display text-xl text-navy sm:px-10">{heading}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-6 pb-1 sm:px-10">
        {occasions.map((o, i) => (
          <div key={i} className="w-[150px] flex-none">
            <div className="aspect-[150/120] overflow-hidden rounded-xl bg-blush-100">
              {o.imageUrl ? (
                <img src={o.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">{o.emoji}</div>
              )}
            </div>
            <p className="pt-2 text-[14px] font-medium text-navy">{o.title}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
