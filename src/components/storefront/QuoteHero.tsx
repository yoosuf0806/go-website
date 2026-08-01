import type { QuoteHero as QuoteHeroContent } from '../../types/content'

// Full-bleed hero banner at the top of the Corporate / Wedding landing pages.
// Falls back to a plain navy gradient when no image is set. `tall` gives the
// Wedding hero the extra height its mockup uses (470px vs Corporate's 330px).
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
    <section
      className={`relative flex items-end overflow-hidden bg-navy ${tall ? 'min-h-[420px] sm:min-h-[560px]' : 'min-h-[330px] sm:min-h-[440px]'}`}
      style={
        hero.imageUrl
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(43,17,3,0.5) 0%, rgba(43,17,3,0.15) 45%, rgba(43,17,3,0.86) 100%), url(${hero.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <div className="relative w-full px-6 pb-8 pt-16 sm:px-10 sm:pb-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4b9c8]">{hero.eyebrow}</p>
          <h1 className="mt-2 text-balance font-display text-[clamp(1.9rem,4.5vw,3.2rem)] font-medium leading-[1.1] text-white">
            {hero.title}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/82 sm:text-base">{hero.subtitle}</p>
          <a
            href={ctaHref}
            className="mt-6 inline-block rounded-full bg-pink px-8 py-4 text-[15px] font-bold text-white transition-transform hover:-translate-y-0.5 hover:bg-pink-dark"
          >
            {hero.cta}
          </a>
        </div>
      </div>
    </section>
  )
}
