import { useState } from 'react'
import type { CatalogMedia } from '../../types/catalog'
import BrownieImage from './BrownieImage'

interface ProductGalleryProps {
  media: CatalogMedia[]
  /** Legacy single-image fallback for snapshots taken before the media field existed. */
  fallbackImageUrl: string | null
  alt: string
  className?: string
}

// Product page gallery: images and short videos in one carousel (arrows +
// dots, matching Slideshow's styling; uses a translateX transition between
// items). Falls back to the single legacy image, then to BrownieImage's
// placeholder, for products with no gallery yet.
export default function ProductGallery({
  media,
  fallbackImageUrl,
  alt,
  className = '',
}: ProductGalleryProps) {
  const items: CatalogMedia[] =
    media.length > 0
      ? media
      : fallbackImageUrl
        ? [{ url: fallbackImageUrl, type: 'image' }]
        : []
  const [index, setIndex] = useState(0)

  if (items.length === 0) {
    return <BrownieImage src={null} alt={alt} className={className} />
  }

  const move = (dir: number) => setIndex((i) => (i + dir + items.length) % items.length)

  return (
    <div className={`relative overflow-hidden rounded-[20px] bg-warmgray ${className}`}>
      <div
        className="flex h-full transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((item, i) => (
          <div key={`${item.url}-${i}`} className="h-full min-w-full">
            {item.type === 'video' ? (
              <video
                src={item.url}
                className="h-full w-full object-cover"
                controls
                muted
                playsInline
                loop
              />
            ) : (
              <img
                src={item.url}
                alt={`${alt}${items.length > 1 ? ` — photo ${i + 1}` : ''}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-lg text-navy hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-lg text-navy hover:bg-white"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {items.map((item, i) => (
              <button
                key={`${item.url}-dot-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
