import { describe, it, expect } from 'vitest'
import {
  addonsTotal,
  lineTotal,
  findTier,
  cartTotals,
  type CartItem,
  type DeliveryTier,
} from './pricing'

// Base tier from the seed/migrations: flat Rs. 580 for 1+ pieces (spec §12.1).
const baseTiers: DeliveryTier[] = [
  { minPieces: 1, maxPieces: null, fee: 580, warnAdmin: false },
]

// A hypothetical multi-tier config to exercise boundaries + heavy-order warning.
const multiTiers: DeliveryTier[] = [
  { minPieces: 1, maxPieces: 12, fee: 400, warnAdmin: false },
  { minPieces: 13, maxPieces: 30, fee: 580, warnAdmin: false },
  { minPieces: 31, maxPieces: null, fee: 900, warnAdmin: true },
]

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'p1',
    packageId: 'box-12',
    productName: 'Naked Brownie',
    packageLabel: '12 Pieces',
    pieceCount: 12,
    boxQty: 1,
    unitPrice: 150,
    addons: [],
    ...overrides,
  }
}

describe('addonsTotal / lineTotal', () => {
  it('line total = unitPrice × pieceCount × boxQty with no addons', () => {
    expect(lineTotal(item())).toBe(150 * 12 * 1)
    expect(lineTotal(item({ boxQty: 3 }))).toBe(150 * 12 * 3)
  })

  it('adds add-on prices once per line (spec §6.1 literal formula)', () => {
    const withAddons = item({
      boxQty: 2,
      addons: [
        { id: 'gift_ribbon', label: 'Gift Ribbon', price: 150, detail: { color: 'Gold' } },
        { id: 'gift_message', label: 'Gift Message', price: 100, detail: { message: 'Happy Birthday' } },
      ],
    })
    expect(addonsTotal(withAddons)).toBe(250)
    // base 150*12*2 = 3600, + 250 addons once = 3850
    expect(lineTotal(withAddons)).toBe(3850)
  })
})

describe('findTier — boundaries', () => {
  it('matches the open-ended base tier for any positive count', () => {
    expect(findTier(1, baseTiers)?.fee).toBe(580)
    expect(findTier(999, baseTiers)?.fee).toBe(580)
  })

  it('selects the correct tier at exact boundaries', () => {
    expect(findTier(12, multiTiers)?.fee).toBe(400) // top of tier 1
    expect(findTier(13, multiTiers)?.fee).toBe(580) // bottom of tier 2
    expect(findTier(30, multiTiers)?.fee).toBe(580) // top of tier 2
    expect(findTier(31, multiTiers)?.fee).toBe(900) // bottom of open-ended tier
  })

  it('returns undefined when nothing matches (e.g. empty cart, 0 pieces)', () => {
    expect(findTier(0, multiTiers)).toBeUndefined()
  })
})

describe('cartTotals — combined delivery rule (spec §6.3)', () => {
  it('computes delivery ONCE from the combined piece count, not per line', () => {
    const items = [
      item({ pieceCount: 9, packageId: 'box-9', boxQty: 1, unitPrice: 150 }), // 9 pcs
      item({ pieceCount: 12, packageId: 'box-12', boxQty: 2, unitPrice: 150 }), // 24 pcs
    ]
    const totals = cartTotals(items, baseTiers)
    expect(totals.totalPieces).toBe(9 + 24) // 33
    expect(totals.subtotal).toBe(150 * 9 + 150 * 12 * 2) // 1350 + 3600 = 4950
    expect(totals.deliveryFee).toBe(580) // charged ONCE, not per line
    expect(totals.total).toBe(4950 + 580)
    expect(totals.warnAdmin).toBe(false)
  })

  it('crosses into a heavy tier by COMBINED pieces and flags warnAdmin', () => {
    const items = [
      item({ pieceCount: 15, packageId: 'box-15', boxQty: 1 }), // 15
      item({ pieceCount: 12, packageId: 'slab-12', boxQty: 2 }), // 24 -> total 39
    ]
    const totals = cartTotals(items, multiTiers)
    expect(totals.totalPieces).toBe(39)
    expect(totals.deliveryFee).toBe(900)
    expect(totals.warnAdmin).toBe(true)
  })

  it('empty cart: zero everything, no delivery fee', () => {
    const totals = cartTotals([], baseTiers)
    expect(totals).toEqual({
      totalPieces: 0,
      subtotal: 0,
      deliveryFee: 0,
      total: 0,
      warnAdmin: false,
    })
  })
})
