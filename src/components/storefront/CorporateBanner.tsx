import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CorporateBanner as Banner } from '../../types/content'

// Short-height auto-rotating ad strip at the top of the corporate page.
// Admin-managed via content.corporate.banners. Renders nothing when empty.
export default function CorporateBanner({ banners = [] }: { banners?: Banner[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (banners.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000)
    return () => clearInterval(id)
  }, [banners.length])

  if (banners.length === 0) return null
  const slide = banners[index % banners.length]

  return (
    <section className="relative h-20 overflow-hidden rounded-2xl bg-pink sm:h-24">
      {slide.imageUrl && (
        <>
          <img src={slide.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </>
      )}
      <div className="relative z-10 flex h-full items-center justify-between gap-4 px-5 text-white sm:px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold sm:text-base">{slide.title}</p>
          {slide.body && <p className="truncate text-xs opacity-90 sm:text-sm">{slide.body}</p>}
        </div>
        {slide.cta && slide.to && (
          <Link
            to={slide.to}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-pink hover:bg-pink-light sm:text-sm"
          >
            {slide.cta}
          </Link>
        )}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index % banners.length ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
