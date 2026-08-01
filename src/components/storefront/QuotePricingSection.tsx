import type { PricingTier } from '../../types/content'

// Pricing/tiers section. Title is fully admin-editable (defaults to "Bulk
// Pricing" / "Wedding Pricing" — not hardcoded as "Corporate Pricing").
export default function QuotePricingSection({ title, tiers }: { title: string; tiers: PricingTier[] }) {
  if (tiers.length === 0) return null
  return (
    <section className="bg-blush-50 px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center font-display text-[clamp(1.6rem,3vw,2.3rem)] font-semibold text-navy">{title}</h2>
        <div className="mt-8 flex flex-col gap-3">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-2xl border border-blush-200 bg-white px-6 py-4"
            >
              <span className="font-semibold text-navy">{tier.label}</span>
              <span className="text-sm text-neutral-500">{tier.price}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
