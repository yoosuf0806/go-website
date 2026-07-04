import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CartAddon, CartItem } from '../lib/pricing'

// Zustand cart store, persisted to localStorage under a versioned key. Items
// are keyed by productId + packageId + hash(addons) so identical configs
// merge into box_qty increments instead of duplicating lines (spec §8).

export interface CartLine extends CartItem {
  key: string
}

function addonsFingerprint(addons: CartAddon[]): string {
  return addons
    .map((a) => `${a.id}:${JSON.stringify(a.detail ?? null)}`)
    .sort()
    .join('|')
}

export function cartLineKey(productId: string, packageId: string, addons: CartAddon[]): string {
  return `${productId}::${packageId}::${addonsFingerprint(addons)}`
}

// No localStorage in Node (SSR / Vitest); fall back to an in-memory no-op so
// importing this module never throws outside a browser.
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

interface CartState {
  items: CartLine[]
  addItem: (item: CartItem) => void
  incrementBoxQty: (key: string, delta: number) => void
  removeItem: (key: string) => void
  clear: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const key = cartLineKey(item.productId, item.packageId, item.addons)
          const existing = state.items.find((line) => line.key === key)
          if (existing) {
            return {
              items: state.items.map((line) =>
                line.key === key ? { ...line, boxQty: line.boxQty + item.boxQty } : line,
              ),
            }
          }
          return { items: [...state.items, { ...item, key }] }
        }),
      incrementBoxQty: (key, delta) =>
        set((state) => ({
          items: state.items
            .map((line) => (line.key === key ? { ...line, boxQty: line.boxQty + delta } : line))
            .filter((line) => line.boxQty > 0),
        })),
      removeItem: (key) => set((state) => ({ items: state.items.filter((line) => line.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'golden-oven-cart-v1',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? noopStorage : window.localStorage)),
    },
  ),
)
