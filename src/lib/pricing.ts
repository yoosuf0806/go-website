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
  /**
   * For a normal line this is price_per_piece; for a slab line (isSlab) it is
   * the chosen flavour's flat per-product price.
   */
  unitPrice: number
  addons: CartAddon[]
  /**
   * True for a standalone slab product line. Slabs are priced per product (flat
   * flavour price, NOT × pieceCount) and contribute 0 to the delivery piece
   * count, but a cart containing any slab pays at least the base delivery tier.
   */
  isSlab?: boolean
  /** The chosen flavour name, for slab lines (also mirrored to packageLabel). */
  flavor?: string
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
 * Normal line: `(price_per_piece × piece_count + add-on prices) × box_qty`
 * (spec §6.1). Slab line: `(flat flavour price + add-on prices) × box_qty` —
 * a slab is priced per product, not per piece, so pieceCount is not a factor.
 * Add-ons are charged PER BOX: a line with box_qty = 3 and a ribbon carries
 * three ribbons, since identical (product + package + add-ons) configs merge
 * into one line via box_qty (spec §8). Confirmed with the owner.
 */
export function lineTotal(item: CartItem): number {
  const base = item.isSlab ? item.unitPrice : item.unitPrice * item.pieceCount
  return (base + addonsTotal(item)) * item.boxQty
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
  // Slab lines contribute 0 pieces (they're priced per product, not per piece).
  const totalPieces = items.reduce((n, i) => n + (i.isSlab ? 0 : i.pieceCount) * i.boxQty, 0)
  const subtotal = items.reduce((n, i) => n + lineTotal(i), 0)
  const pieceTier = findTier(totalPieces, tiers)
  let deliveryFee = pieceTier?.fee ?? 0
  let warnAdmin = pieceTier?.warnAdmin ?? false

  // A cart containing any slab always pays at least the base delivery tier,
  // even if the piece-based tiers would charge nothing (e.g. a slab-only cart
  // has 0 delivery pieces). Mirrors the create_order() RPC.
  const hasSlab = items.some((i) => i.isSlab)
  if (hasSlab) {
    const baseTier = findTier(1, tiers)
    if (baseTier && baseTier.fee > deliveryFee) {
      deliveryFee = baseTier.fee
      // only adopt the base tier's warn flag when it's the one actually charged
      if (!pieceTier) warnAdmin = baseTier.warnAdmin
    }
  }

  return {
    totalPieces,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    warnAdmin,
  }
}

/** Order total after a flat gift-voucher discount, clamped so it never goes below zero. */
export function totalAfterVoucher(total: number, discount: number): number {
  return Math.max(0, total - discount)
}
