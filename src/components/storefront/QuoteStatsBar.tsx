import type { IconCard } from '../../types/content'

// At-a-glance stats below the hero (e.g. "50+ Minimum Order", "5 Flavours
// Available"). Reuses the admin-editable IconCard data (content.stats) but
// ignores the `icon` field — the old empty icon squares read as broken.
// Instead each stat is a clean card: a large berry value (title) over a muted
// label (body).
export default function QuoteStatsBar({ stats }: { stats: IconCard[] }) {
  if (stats.length === 0) return null
  return (
    <div className="px-6 pt-8 sm:px-10">
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-blush-200 bg-white px-4 py-5 text-center shadow-[0_10px_24px_-18px_rgba(168,53,90,0.5)]"
          >
            <div className="font-display text-[26px] leading-none text-berry sm:text-[28px]">{s.title}</div>
            <p className="pt-1.5 text-[13px] leading-snug text-neutral-500">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
