import { create } from 'zustand'

// Tiny transient-toast store. A single message with an incrementing id so
// repeated identical messages (e.g. "Added to cart" tapped twice) still
// re-trigger the show/auto-dismiss cycle. The Toaster component owns the timer.
interface ToastState {
  id: number
  message: string | null
  show: (message: string) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  id: 0,
  message: null,
  show: (message) => set((s) => ({ id: s.id + 1, message })),
  clear: () => set({ message: null }),
}))

/** Fire a toast from non-component code (e.g. the cart store). */
export function toast(message: string) {
  useToastStore.getState().show(message)
}
