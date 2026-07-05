const MESSAGES = [
  'Just dropped: July Brownie Mix 🍫',
  'Handmade in Sri Lanka',
  'Order on WhatsApp — no online payment needed',
  'Free delivery over Rs. 10,000',
  'Personalise a letter-topper slab 🎂',
]

// Slim scrolling promo strip at the very top of the storefront (browniegod-style
// ticker). Doubled content + 50% marquee gives a seamless loop; pauses under
// prefers-reduced-motion (see index.css).
export default function PromoTicker() {
  const row = [...MESSAGES, ...MESSAGES]
  return (
    <div className="overflow-hidden border-b border-ink/10 bg-ink py-2 text-xs font-medium text-cream">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap pr-10">
        {row.map((msg, i) => (
          <span key={i} className="flex items-center gap-10">
            {msg}
            <span aria-hidden className="text-blush-300">
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
