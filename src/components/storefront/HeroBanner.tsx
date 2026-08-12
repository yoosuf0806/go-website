import { Link } from 'react-router-dom'
import { imageSrcSet } from '../../lib/images'

// Shared full-bleed landing banner — the same visual template as the Home hero
// (HeroCarousel): a full-width photo with a dark bottom-up scrim and the copy
// (eyebrow, big display heading, subtitle, CTA pills) anchored bottom-left.
// Used by the Brownie Slab page and the Corporate / Wedding landing heroes so
// every category landing page reads as one system. Falls back to a navy
// gradient when no image is set.

const HERO_WIDTHS = [640, 960, 1280, 1600]

// If a CDN-transformed candidate fails, strip srcset so the browser reloads the
// untouched original `src` (mirrors HeroCarousel/Slideshow).
function dropSrcSet(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.srcset = ''
  e.currentTarget.sizes = ''
}

export interface HeroCta {
  label: string
  /** Internal route ("/shop"), same-page anchor ("#flavours"), or URL. */
  href: string
}

function CtaButton({ cta, variant }: { cta: HeroCta; variant: 'primary' | 'secondary' }) {
  const cls =
    variant === 'primary'
      ? 'rounded-full bg-pink px-8 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-pink-dark'
      : 'rounded-full bg-navy px-7 py-3 text-[15px] font-bold text-white transition-transform hover:-translate-y-0.5'
  // Router links keep SPA navigation for internal routes; anchors/URLs use <a>.
  return cta.href.startsWith('/') ? (
    <Link to={cta.href} className={cls}>
      {cta.label}
    </Link>
  ) : (
    <a href={cta.href} className={cls}>
      {cta.label}
    </a>
  )
}

interface HeroBannerProps {
  eyebrow?: string
  title: string
  subtitle?: string
  imageUrl?: string | null
  primaryCta: HeroCta
  secondaryCta?: HeroCta
  /** Extra height for a flagship banner (Wedding uses this in its mockup). */
  tall?: boolean
  /** True for the LCP banner on a page — eager-loads + prioritises the image. */
  priority?: boolean
  alt?: string
}

export default function HeroBanner({
  eyebrow,
  title,
  subtitle,
  imageUrl,
  primaryCta,
  secondaryCta,
  tall = false,
  priority = false,
  alt = '',
}: HeroBannerProps) {
  return (
    <section
      className={`relative overflow-hidden bg-navy ${
        tall ? 'h-[520px] sm:h-[600px]' : 'h-[440px] sm:h-[520px]'
      }`}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            srcSet={imageSrcSet(imageUrl, HERO_WIDTHS)}
            sizes="100vw"
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding={priority ? 'auto' : 'async'}
            onError={dropSrcSet}
          />
          {/* Dark scrim so overlaid text stays readable over any image. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-[#3a2230] to-[#2b1103]" />
      )}

      <div className="absolute inset-0 flex items-end">
        <div className="mx-auto flex w-full max-w-[1400px] px-5 pb-10 sm:px-6 sm:pb-20">
          <div className="max-w-xl text-white">
            {eyebrow && (
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-pink-light drop-shadow">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 font-display text-[clamp(1.85rem,6vw,4rem)] leading-[1.12] drop-shadow sm:leading-[1.15]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 max-w-md text-base leading-relaxed text-white/90 drop-shadow sm:mt-4 sm:text-lg">
                {subtitle}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3 sm:mt-7 sm:gap-4">
              <CtaButton cta={primaryCta} variant="primary" />
              {secondaryCta && <CtaButton cta={secondaryCta} variant="secondary" />}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
