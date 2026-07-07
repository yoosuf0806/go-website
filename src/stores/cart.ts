import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CartAddon, CartItem } from '../lib/pricing'
import { products, packages, addons as catalogAddons } from '../data/catalog'

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

/**
 * Re-price a persisted line against the CURRENT catalog snapshot, or drop it if
 * its product/package no longer exists. Cart lines cache unitPrice + add-on
 * prices in localStorage, so without this a returning customer could check out
 * at prices that are stale after a Publish rebuild (PR review). Add-on *details*
 * (topper text, ribbon colour) are preserved; only prices/labels refresh.
 */
export function repriceLine(line: CartLine): CartLine | null {
  const product = products.find((p) => p.id === line.productId)
  const pkg = packages.find((p) => p.id === line.packageId)
  if (!product || !pkg) return null

  const repricedAddons = line.addons.map((a) => {
    const current = catalogAddons.find((ca) => ca.id === a.id)
    return current ? { ...a, price: current.price, label: current.label } : a
  })

  const item: CartItem = {
    ...line,
    productName: product.name,
    packageLabel: pkg.label,
    pieceCount: pkg.pieceCount,
    unitPrice: product.pricePerPiece,
    addons: repricedAddons,
  }
  return { ...item, key: cartLineKey(item.productId, item.packageId, item.addons) }
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
      // Reprice persisted lines from the current catalog on load; drop lines
      // whose product/package is gone. Prevents stale-price checkout after a
      // Publish rebuild.
      merge: (persisted, current) => {
        const saved = (persisted as { items?: CartLine[] } | undefined)?.items ?? []
        const items = saved
          .map(repriceLine)
          .filter((line): line is CartLine => line !== null)
        return { ...current, items }
      },
    },
  ),
)
