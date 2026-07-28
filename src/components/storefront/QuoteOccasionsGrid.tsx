import type { OccasionCard } from '../../types/content'

// "Occasions We Cover" — a simple grid of emoji/title/body cards. Reuses the
// homepage OccasionCard shape but ignores its cta/to (this grid is purely
// informational, not a set of navigation links).
export default function QuoteOccasionsGrid({ heading, occasions }: { heading: string; occasions: OccasionCard[] }) {
  if (occasions.length === 0) return null
  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-[clamp(1.6rem,3vw,2.3rem)] font-semibold text-navy">
          {heading}
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {occasions.map((o, i) => (
            <div key={i} className="rounded-2xl bg-cream p-6">
              {o.imageUrl ? (
                <img src={o.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="text-2xl">{o.emoji}</div>
              )}
              <h3 className="mt-3 font-display text-lg font-semibold text-navy">{o.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{o.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
