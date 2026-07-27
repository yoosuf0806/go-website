import { useEffect, useState } from 'react'
import { useCatalog } from '../../contexts/CatalogContext'

// Slim promo strip at the very top. Rotates through one message at a time
// (cross-fade) instead of a continuous scrolling wall of text. Messages come
// from the editable content blob. Pauses under prefers-reduced-motion.
export default function PromoTicker() {
  const { catalog } = useCatalog()
  const messages = catalog.content.promoMessages
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 4000)
    return () => clearInterval(id)
  }, [messages.length])

  if (messages.length === 0) return null

  return (
    <div className="relative h-9 overflow-hidden bg-pink text-[13px] font-semibold tracking-wide text-white">
      {messages.map((msg, i) => (
        <p
          key={i}
          aria-hidden={i !== index}
          className={`absolute inset-0 flex items-center justify-center px-6 text-center transition-opacity duration-500 motion-reduce:transition-none ${
            i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {msg}
        </p>
      ))}
    </div>
  )
}
