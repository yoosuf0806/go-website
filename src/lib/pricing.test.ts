import { describe, it, expect } from 'vitest'
import {
  addonsTotal,
  lineTotal,
  findTier,
  cartTotals,
  totalAfterVoucher,
  voucherDiscount,
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

  it('charges add-on prices per box (spec §6.1, box_qty > 1)', () => {
    const withAddons = item({
      boxQty: 2,
      addons: [
        { id: 'gift_ribbon', label: 'Gift Ribbon', price: 150, detail: { color: 'Gold' } },
        { id: 'gift_message', label: 'Gift Message', price: 100, detail: { message: 'Happy Birthday' } },
      ],
    })
    expect(addonsTotal(withAddons)).toBe(250) // per-box add-on cost
    // (150*12 + 250) × 2 boxes = (1800 + 250) × 2 = 4100
    expect(lineTotal(withAddons)).toBe(4100)
  })
})

describe('lineTotal — slab (flat, per-product) pricing', () => {
  // A slab line is priced per product (flat flavour price), NOT × pieceCount.
  const slab = (overrides: Partial<CartItem> = {}): CartItem =>
    item({
      packageId: 'slab:Classic',
      packageLabel: 'Classic',
      pieceCount: 0,
      unitPrice: 2300,
      isSlab: true,
      flavor: 'Classic',
      ...overrides,
    })

  it('flat price × boxQty, ignoring pieceCount', () => {
    expect(lineTotal(slab())).toBe(2300)
    expect(lineTotal(slab({ boxQty: 3 }))).toBe(2300 * 3)
  })

  it('adds per-box add-on prices on top of the flat price', () => {
    const withRibbon = slab({
      boxQty: 2,
      addons: [{ id: 'gift_ribbon', label: 'Gift Ribbon', price: 150, detail: { color: 'White' } }],
    })
    // (2300 + 150) × 2 = 4900
    expect(lineTotal(withRibbon)).toBe(4900)
  })
})

describe('cartTotals — slab lines and base delivery', () => {
  const slab = (overrides: Partial<CartItem> = {}): CartItem =>
    item({ packageId: 'slab:Classic', pieceCount: 0, unitPrice: 2300, isSlab: true, flavor: 'Classic', ...overrides })

  it('slab-only cart: 0 pieces but still pays the base delivery tier', () => {
    const totals = cartTotals([slab()], baseTiers)
    expect(totals.totalPieces).toBe(0)
    expect(totals.subtotal).toBe(2300)
    expect(totals.deliveryFee).toBe(580) // base tier, even at 0 pieces
    expect(totals.total).toBe(2300 + 580)
  })

  it('mixed cart: pieces come from boxes only; delivery is the higher of the two', () => {
    const items = [
      item({ pieceCount: 9, packageId: 'box-9', boxQty: 1, unitPrice: 150 }), // 9 pcs, Rs 1350
      slab({ boxQty: 1 }), // 0 pcs, Rs 2300
    ]
    const totals = cartTotals(items, multiTiers)
    expect(totals.totalPieces).toBe(9) // slab contributes 0
    expect(totals.subtotal).toBe(150 * 9 + 2300)
    expect(totals.deliveryFee).toBe(400) // tier for 9 pcs (400) > base (400) — same here
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

describe('voucherDiscount', () => {
  it('fixed voucher: the value is the discount', () => {
    expect(voucherDiscount(3000, 'fixed', 500)).toBe(500)
  })

  it('fixed voucher: never exceeds the total', () => {
    expect(voucherDiscount(300, 'fixed', 500)).toBe(300)
  })

  it('percent voucher: rounds a percentage of the total to whole rupees', () => {
    expect(voucherDiscount(3330, 'percent', 10)).toBe(333)
    expect(voucherDiscount(2895, 'percent', 10)).toBe(290) // 289.5 → 290 (round half up)
  })

  it('percent voucher: 100% caps at the total, 0/negative value is no discount', () => {
    expect(voucherDiscount(2000, 'percent', 100)).toBe(2000)
    expect(voucherDiscount(2000, 'percent', 0)).toBe(0)
    expect(voucherDiscount(2000, 'fixed', -5)).toBe(0)
  })
})

describe('totalAfterVoucher', () => {
  it('subtracts a flat discount from the total', () => {
    expect(totalAfterVoucher(5000, 500)).toBe(4500)
  })

  it('clamps at zero when the discount exceeds the total', () => {
    expect(totalAfterVoucher(300, 500)).toBe(0)
  })

  it('is a no-op with a zero discount', () => {
    expect(totalAfterVoucher(1200, 0)).toBe(1200)
  })
})
