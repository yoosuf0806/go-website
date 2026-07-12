import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { HeroSlide } from '../../types/content'

interface HeroCarouselProps {
  slides: HeroSlide[]
  primaryCta: string
  secondaryCta: string
}

// Admin-managed hero banner: full-width image slides with the slide's own text
// overlaid, plus the shared primary/secondary CTAs. Auto-advances; arrows and
// dots appear only when there's more than one slide. Rendered by Home only when
// content.heroSlides is non-empty (otherwise the emoji-tile hero shows).
export default function HeroCarousel({ slides, primaryCta, secondaryCta }: HeroCarouselProps) {
  const [index, setIndex] = useState(0)
  const count = slides.length

  useEffect(() => {
    if (count <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6000)
    return () => clearInterval(id)
  }, [count])

  // Guard against a stale index if slides shrink.
  const safeIndex = index % count
  const move = (dir: number) => setIndex((i) => (i + dir + count) % count)

  return (
    <section className="relative h-[520px] overflow-hidden bg-navy sm:h-[560px]">
      <div
        className="flex h-full transition-transform duration-700 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ transform: `translateX(-${safeIndex * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div key={i} className="relative h-full min-w-full">
            <img
              src={slide.imageUrl}
              alt={slide.title ? `${slide.title} ${slide.titleAfter}`.trim() : 'Golden Oven brownies'}
              className="absolute inset-0 h-full w-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            {/* Dark scrim so overlaid text stays readable over any image. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/20" />
            <div className="absolute inset-0 flex items-center">
              <div className="mx-auto flex w-full max-w-[1400px] px-6">
                <div className="max-w-xl text-white">
                  <h1 className="text-[clamp(2.1rem,6vw,4rem)] leading-[1.15] drop-shadow">
                    {slide.title} <em className="not-italic text-pink-light">{slide.highlight}</em>{' '}
                    {slide.titleAfter}
                  </h1>
                  {slide.subtitle && (
                    <p className="mt-4 max-w-md text-lg leading-relaxed text-white/90 drop-shadow">
                      {slide.subtitle}
                    </p>
                  )}
                  <div className="mt-7 flex flex-wrap gap-4">
                    <Link
                      to="/shop"
                      className="rounded-full bg-pink px-8 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-pink-dark"
                    >
                      {primaryCta}
                    </Link>
                    <Link
                      to="/corporate"
                      className="rounded-full border-2 border-white px-7 py-3 text-[15px] font-bold text-white transition-colors hover:bg-white hover:text-navy"
                    >
                      {secondaryCta}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl text-white backdrop-blur hover:bg-white/35"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl text-white backdrop-blur hover:bg-white/35"
          >
            ›
          </button>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === safeIndex}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === safeIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
