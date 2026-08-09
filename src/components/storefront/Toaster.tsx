import { useEffect, useState } from 'react'
import { useToastStore } from '../../stores/toast'

// Bottom-centre transient toast. Watches the toast store's incrementing id so a
// repeat of the same message restarts the 2-second dismiss timer. Rendered once
// at the storefront layout root.
export default function Toaster() {
  const id = useToastStore((s) => s.id)
  const message = useToastStore((s) => s.message)
  const clear = useToastStore((s) => s.clear)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const hide = setTimeout(() => setVisible(false), 2000)
    // Clear the store shortly after the fade-out so the node can unmount clean.
    const wipe = setTimeout(() => clear(), 2250)
    return () => {
      clearTimeout(hide)
      clearTimeout(wipe)
    }
    // id changes on every show(), restarting the timer even for a repeat message.
  }, [id, message, clear])

  if (!message) return null

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
    >
      <div
        className={`rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        {message}
      </div>
    </div>
  )
}
