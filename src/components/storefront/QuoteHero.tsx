import type { QuoteHero as QuoteHeroContent } from '../../types/content'
import HeroBanner from './HeroBanner'

// Full-bleed hero banner at the top of the Corporate / Wedding landing pages.
// Uses the shared HeroBanner template (same as the Home + Slab landing banners)
// so the copy is consistently anchored bottom-left instead of floating in a
// centred column. Falls back to a navy gradient when no image is set. `tall`
// gives the Wedding hero the extra height its mockup uses.
export default function QuoteHero({
  hero,
  ctaHref,
  tall = false,
}: {
  hero: QuoteHeroContent
  ctaHref: string
  tall?: boolean
}) {
  return (
    <HeroBanner
      eyebrow={hero.eyebrow}
      title={hero.title}
      subtitle={hero.subtitle}
      imageUrl={hero.imageUrl}
      primaryCta={{ label: hero.cta, href: ctaHref }}
      tall={tall}
      priority
    />
  )
}
