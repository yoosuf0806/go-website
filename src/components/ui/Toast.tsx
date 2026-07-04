import { useEffect } from 'react'

interface ToastProps {
  message: string
  onDismiss: () => void
  /** Auto-dismiss after this many ms (default 4000). */
  duration?: number
}

// Minimal self-dismissing toast (spec §6.6 success toast, reused in Phase 10).
// Fixed to the bottom-centre; not a queue — one toast at a time is enough here.
export default function Toast({ message, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration)
    return () => clearTimeout(id)
  }, [onDismiss, duration])

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  )
}
