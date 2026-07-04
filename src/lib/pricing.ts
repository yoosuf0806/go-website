// Pure pricing functions: line totals, combined delivery fee, cart totals.
// This is the SINGLE source of pricing math (spec §6.3, §11): every price/total
// on screen and in the WhatsApp message comes from cartTotals(). No component
// may compute totals independently.

export interface TopperDetail {
  lines: string[] // up to 3 lines, ≤5 chars each, uppercase (validated in schemas)
}
export interface RibbonDetail {
  color: string
}
export interface MessageDetail {
  message: string
}
export type AddonDetail = TopperDetail | RibbonDetail | MessageDetail

export interface CartAddon {
  id: string
  label: string
  price: number
  detail?: AddonDetail
}

export interface CartItem {
  productId: string
  packageId: string
  productName: string
  packageLabel: string
  pieceCount: number
  boxQty: number
  /** price_per_piece snapshot from the catalogue. */
  unitPrice: number
  addons: CartAddon[]
}

export interface DeliveryTier {
  minPieces: number
  maxPieces: number | null // null = open-ended top tier
  fee: number
  warnAdmin: boolean
}

export interface CartTotals {
  totalPieces: number
  subtotal: number
  deliveryFee: number
  total: number
  warnAdmin: boolean
}

/** Sum of a line's add-on prices. */
export function addonsTotal(item: CartItem): number {
  return item.addons.reduce((sum, a) => sum + a.price, 0)
}

/**
 * Line total for one cart line.
 *
 * `(price_per_piece × piece_count + add-on prices) × box_qty` (spec §6.1).
 * Add-ons are charged PER BOX: a line with box_qty = 3 and a ribbon carries
 * three ribbons, since identical (product + package + add-ons) configs merge
 * into one line via box_qty (spec §8). Confirmed with the owner.
 */
export function lineTotal(item: CartItem): number {
  return (item.unitPrice * item.pieceCount + addonsTotal(item)) * item.boxQty
}

/**
 * The delivery tier matching a combined piece count. Tiers are half-open at the
 * top (maxPieces null = open-ended). Returns undefined if no tier matches.
 */
export function findTier(totalPieces: number, tiers: DeliveryTier[]): DeliveryTier | undefined {
  return tiers.find(
    (t) => totalPieces >= t.minPieces && (t.maxPieces == null || totalPieces <= t.maxPieces),
  )
}

/**
 * Cart totals — the one function every total renders from (cart drawer, checkout
 * review, WhatsApp message, stored order row).
 *
 * Delivery is computed ONCE per cart from the COMBINED piece count of every item
 * (Σ pieceCount × boxQty), matched against delivery_tiers — never per line item
 * (spec §6.3, the single most important rule).
 */
export function cartTotals(items: CartItem[], tiers: DeliveryTier[]): CartTotals {
  const totalPieces = items.reduce((n, i) => n + i.pieceCount * i.boxQty, 0)
  const subtotal = items.reduce((n, i) => n + lineTotal(i), 0)
  const tier = findTier(totalPieces, tiers)
  const deliveryFee = tier?.fee ?? 0
  return {
    totalPieces,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    warnAdmin: tier?.warnAdmin ?? false,
  }
}
