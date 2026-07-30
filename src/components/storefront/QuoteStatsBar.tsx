import type { IconCard } from '../../types/content'

// Trust-stat strip directly below the hero (e.g. "50+ Minimum Order"). Reuses
// the IconCard shape: icon = emoji, title = the big stat, body = its label.
export default function QuoteStatsBar({ stats }: { stats: IconCard[] }) {
  if (stats.length === 0) return null
  return (
    <div className="bg-blush-100 py-8">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-6 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="rounded-2xl bg-white px-4 py-6 text-center shadow-sm">
            <div className="text-2xl">{s.icon}</div>
            <strong className="mt-2 block font-display text-2xl font-extrabold text-pink">{s.title}</strong>
            <p className="text-[13px] font-semibold text-[#a03040]">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
