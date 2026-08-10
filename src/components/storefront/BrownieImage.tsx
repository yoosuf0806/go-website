import { useState } from 'react'
import { imageSrcSet } from '../../lib/images'

interface BrownieImageProps {
  src: string | null
  alt: string
  className?: string
  /**
   * Set true for the single largest/first image on a page (e.g. the Home
   * hero) — it's almost always the LCP element, so lazy-loading it makes the
   * browser deprioritise a fetch for something that's already on screen.
   * Every other call site (grid tiles, list rows) should stay lazy, which is
   * correct for anything below the fold or off-screen on first paint.
   */
  priority?: boolean
  /**
   * Candidate widths offered via `srcset` when the image CDN is enabled
   * (VITE_IMAGE_CDN=supabase). Ignored on the Free plan — the original URL is
   * served. Defaults suit product tiles; the hero/detail can pass larger sets.
   */
  widths?: number[]
  /**
   * `sizes` hint telling the browser how wide the image renders, so it can pick
   * the smallest sufficient srcset candidate. Only used when a srcset is built.
   */
  sizes?: string
}

const DEFAULT_WIDTHS = [200, 400, 600, 800]

// Product image with a graceful blush-gradient fallback for products that don't
// have an uploaded image yet (seed data ships with none). Keeps cards looking
// intentional rather than broken before real photography lands.
export default function BrownieImage({
  src,
  alt,
  className = '',
  priority = false,
  widths = DEFAULT_WIDTHS,
  sizes,
}: BrownieImageProps) {
  // If a CDN-transformed candidate fails to load (e.g. the flag is on but the
  // Supabase plan doesn't support transforms), drop the srcset so the browser
  // reloads the untouched original — an image never ends up broken.
  const [transformFailed, setTransformFailed] = useState(false)

  if (src) {
    const srcSet = transformFailed ? undefined : imageSrcSet(src, widths)
    return (
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? (sizes ?? '100vw') : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'auto' : 'async'}
        onError={srcSet ? () => setTransformFailed(true) : undefined}
        className={`object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-pink-light to-[#f7d0da] ${className}`}
      aria-label={alt}
      role="img"
    >
      <span className="text-3xl opacity-70" aria-hidden>
        🍫
      </span>
    </div>
  )
}
