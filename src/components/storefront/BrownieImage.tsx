interface BrownieImageProps {
  src: string | null
  alt: string
  className?: string
}

// Product image with a graceful blush-gradient fallback for products that don't
// have an uploaded image yet (seed data ships with none). Keeps cards looking
// intentional rather than broken before real photography lands.
export default function BrownieImage({ src, alt, className = '' }: BrownieImageProps) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
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
