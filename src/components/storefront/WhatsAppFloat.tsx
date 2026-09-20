import { useEffect, useState } from 'react'
import WhatsAppIcon from '../ui/WhatsAppIcon'

// Floating WhatsApp button shown on every storefront page. It sits as a compact
// green circle, and periodically animates open to reveal an "Inquire via
// WhatsApp" label before collapsing again — a gentle nudge to start a chat. It
// also expands on hover/focus so the label is reachable on demand.
export default function WhatsAppFloat({
  waNumber,
  liftForMiniCart,
}: {
  waNumber: string
  /** Raise the button so it clears the floating mini-cart bar when it's shown. */
  liftForMiniCart: boolean
}) {
  const [pulsing, setPulsing] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Pulse open ~3s shortly after load, then again on a slow loop. Cleaned up on
  // unmount so no timer leaks between route changes.
  useEffect(() => {
    let collapse: ReturnType<typeof setTimeout>
    const pulse = () => {
      setPulsing(true)
      collapse = setTimeout(() => setPulsing(false), 3200)
    }
    const initial = setTimeout(pulse, 1600)
    const loop = setInterval(pulse, 12000)
    return () => {
      clearTimeout(initial)
      clearTimeout(collapse)
      clearInterval(loop)
    }
  }, [])

  const open = pulsing || hovered

  return (
    <a
      href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to inquire about an order.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Inquire via WhatsApp"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="fixed right-7 z-40 flex h-14 items-center rounded-full bg-[#25d366] text-white shadow-lg shadow-[#25d366]/40 transition-transform duration-300 hover:scale-105"
      style={{
        bottom: liftForMiniCart
          ? 'calc(env(safe-area-inset-bottom) + 76px)'
          : 'max(1.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center">
        <WhatsAppIcon className="h-7 w-7" />
      </span>
      <span
        className={`overflow-hidden whitespace-nowrap text-[15px] font-bold transition-all duration-300 ${
          open ? 'max-w-[220px] pr-5 opacity-100' : 'max-w-0 pr-0 opacity-0'
        }`}
      >
        Inquire via WhatsApp
      </span>
    </a>
  )
}
