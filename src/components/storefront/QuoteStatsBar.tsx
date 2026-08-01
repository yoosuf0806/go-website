import type { IconCard } from '../../types/content'

// Feature bullets directly below the hero (e.g. "Your branding, on the
// brownie" / "Delivered on your schedule"). Reuses the IconCard shape
// (icon/title/body) that used to render as a numeric stat-strip — same
// admin-editable data (content.stats), restyled to match the mockup's
// icon-square + title + body row pattern.
export default function QuoteStatsBar({ stats }: { stats: IconCard[] }) {
  if (stats.length === 0) return null
  return (
    <div className="px-6 pt-6 sm:px-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-3.5">
        {stats.map((s, i) => (
          <div key={i} className="flex items-start gap-3.5">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border border-blush-200 bg-blush-50 text-berry">
              {s.icon}
            </span>
            <div>
              <div className="text-[16px] font-medium text-navy">{s.title}</div>
              <p className="pt-0.5 text-[14px] leading-relaxed text-[#5c4450]">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
