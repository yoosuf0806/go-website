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
}

// Product image with a graceful blush-gradient fallback for products that don't
// have an uploaded image yet (seed data ships with none). Keeps cards looking
// intentional rather than broken before real photography lands.
export default function BrownieImage({ src, alt, className = '', priority = false }: BrownieImageProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
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
