const MESSAGES = [
  '🚚 Next day delivery available!',
  '🍰 Islandwide delivery across Sri Lanka',
  "🎁 Gift something they'll actually love",
  '🍫 Freshly baked to order, never pre-made',
  '♥️ 100% Halal Certified',
]

// Slim scrolling promo strip at the very top (reference-matched pink marquee).
// Doubled content + 50% marquee gives a seamless loop; pauses under
// prefers-reduced-motion (see index.css).
export default function PromoTicker() {
  const row = [...MESSAGES, ...MESSAGES]
  return (
    <div className="overflow-hidden bg-pink py-2.5 text-[13px] font-semibold tracking-wide text-white">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {row.map((msg, i) => (
          <span key={i} className="px-12">
            {msg}
          </span>
        ))}
      </div>
    </div>
  )
}
