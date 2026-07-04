import type { BannerSetting } from '../../types/catalog'

/** True only when enabled and (if set) the current time falls inside the scheduled window. */
export function isBannerActive(banner: BannerSetting, now: Date = new Date()): boolean {
  if (!banner.enabled || !banner.text.trim()) return false
  if (banner.starts_at && now < new Date(banner.starts_at)) return false
  if (banner.ends_at && now > new Date(banner.ends_at)) return false
  return true
}

interface BannerBarProps {
  banner: BannerSetting
}

// Scheduled announcement bar (spec §7 Settings — "storefront shows banner only
// inside the window"). Rendered above the header so it's shared across every
// storefront page.
export default function BannerBar({ banner }: BannerBarProps) {
  if (!isBannerActive(banner)) return null

  return (
    <div className="bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white">
      {banner.text}
    </div>
  )
}
