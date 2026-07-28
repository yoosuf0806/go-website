import type { QuoteHero as QuoteHeroContent } from '../../types/content'

// Full-bleed hero banner at the top of the Corporate Orders / Wedding Orders
// landing pages. Falls back to a plain navy gradient when no image is set.
export default function QuoteHero({ hero, ctaHref }: { hero: QuoteHeroContent; ctaHref: string }) {
  return (
    <section
      className="relative flex min-h-[420px] items-center overflow-hidden bg-navy sm:min-h-[520px]"
      style={
        hero.imageUrl
          ? {
              backgroundImage: `linear-gradient(0deg, rgba(26,10,0,0.82) 0%, rgba(26,10,0,0.72) 45%, rgba(26,10,0,0.55) 100%), url(${hero.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <div className="relative mx-auto w-full max-w-4xl px-6 py-20 text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[4px] text-pink">{hero.eyebrow}</p>
        <h1 className="text-balance text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.1] text-white">
          {hero.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-base">
          {hero.subtitle}
        </p>
        <a
          href={ctaHref}
          className="mt-9 inline-block rounded-full bg-pink px-8 py-4 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(217,45,86,0.4)] transition-all hover:-translate-y-0.5 hover:bg-pink-dark"
        >
          {hero.cta}
        </a>
      </div>
    </section>
  )
}
