import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Slide {
  eyebrow: string
  title: string
  body: string
  cta: string
  to: string
  emoji: string
  className: string
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Now Available',
    title: 'Classic Brownies',
    body: 'Rich, fudgy, and baked fresh to order. Pure dark chocolate made with premium ingredients.',
    cta: 'Shop Now',
    to: '/shop',
    emoji: '🍫',
    className: 'from-[#3e2723] to-[#6d4c41]',
  },
  {
    eyebrow: 'Bulk Orders Welcome',
    title: 'Corporate Gifting',
    body: 'Impress your team and clients with premium brownie boxes. Exclusive bulk pricing available.',
    cta: 'View Corporate Range',
    to: '/corporate',
    emoji: '🏢',
    className: 'from-[#1a1a2e] to-[#2d2d6e]',
  },
  {
    eyebrow: 'Wedding Collections',
    title: 'Brownies for Your Big Day',
    body: 'Elegant wedding favours your guests will remember. Custom packaging, personal touches.',
    cta: 'Explore Wedding Range',
    to: '/corporate',
    emoji: '💍',
    className: 'from-[#4a0e1e] to-pink',
  },
  {
    eyebrow: 'Personalise It',
    title: 'Brownie Slabs',
    body: 'Customisable slab brownies — add letter toppers and sparkles to make it truly personal.',
    cta: 'Customise Yours',
    to: '/shop',
    emoji: '🍰',
    className: 'from-[#1b2838] to-[#2a4a6e]',
  },
]

export default function Slideshow() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000)
    return () => clearInterval(id)
  }, [])

  const move = (dir: number) => setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length)

  return (
    <section className="relative h-[480px] overflow-hidden bg-navy sm:h-[420px]">
      <div
        className="flex h-full transition-transform duration-700 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((slide) => (
          <div
            key={slide.title}
            className={`relative flex h-full min-w-full items-center justify-center bg-gradient-to-br ${slide.className}`}
          >
            <div className="pointer-events-none absolute text-[10rem] opacity-20">{slide.emoji}</div>
            <div className="relative z-10 max-w-lg px-8 text-center text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-70">
                {slide.eyebrow}
              </p>
              <h2 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] leading-tight">{slide.title}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed opacity-85">{slide.body}</p>
              <Link
                to={slide.to}
                className="mt-6 inline-block rounded-full bg-white px-7 py-3 text-sm font-bold text-navy transition-transform hover:-translate-y-0.5"
              >
                {slide.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => move(-1)}
        aria-label="Previous slide"
        className="absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/30"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        aria-label="Next slide"
        className="absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/30"
      >
        ›
      </button>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index ? 'w-6 bg-white' : 'w-2 bg-white/40'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
