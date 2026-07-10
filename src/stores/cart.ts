import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CartAddon, CartItem } from '../lib/pricing'
import type { Catalog } from '../types/catalog'

// Zustand cart store, persisted to localStorage under a versioned key. Items
// are keyed by productId + packageId + hash(addons) so identical configs
// merge into box_qty increments instead of duplicating lines (spec §8).
//
// Repricing is now LIVE-catalog driven: the store no longer imports the
// build-time snapshot. A component inside CatalogProvider calls repriceAll()
// once the live catalogue loads (and whenever it changes), so cart lines are
// validated against current products — dropping lines whose product/package no
// longer exists. This also prevents the order_items FK error at checkout, since
// a deleted product can never remain in the cart.

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
 * Re-price a persisted line against the given (live) catalogue, or drop it if
 * its product/package no longer exists. Cart lines cache unitPrice + add-on
 * prices in localStorage, so without this a returning customer could check out
 * at stale prices, or reference a deleted product (order_items FK error).
 * Add-on *details* (topper text, ribbon colour) are preserved; only
 * prices/labels refresh.
 */
export function repriceLine(line: CartLine, catalog: Catalog): CartLine | null {
  const product = catalog.products.find((p) => p.id === line.productId)
  const pkg = catalog.packages.find((p) => p.id === line.packageId)
  if (!product || !pkg) return null

  const repricedAddons = line.addons.map((a) => {
    const current = catalog.addons.find((ca) => ca.id === a.id)
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
  /** Reprice + prune all lines against the live catalogue. Called by CartSync. */
  repriceAll: (catalog: Catalog) => void
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
      repriceAll: (catalog) =>
        set((state) => ({
          items: state.items
            .map((line) => repriceLine(line, catalog))
            .filter((line): line is CartLine => line !== null),
        })),
    }),
    {
      name: 'golden-oven-cart-v1',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? noopStorage : window.localStorage)),
    },
  ),
)
