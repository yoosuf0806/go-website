import { describe, it, expect } from 'vitest'
import type { AdminOrder } from './adminOrders'
import {
  isBakingToday,
  isUpcoming,
  ordersForTab,
  orderHasTopper,
  itemTopperLines,
  isRepeatCustomer,
  priorOrderCount,
  tomorrowIso,
} from './orderView'

// A fixed "now" so the tomorrow-based tab logic is deterministic.
const NOW = new Date('2026-07-11T09:00:00')
const TOMORROW = '2026-07-12'
const LATER = '2026-07-20'

function order(partial: Partial<AdminOrder>): AdminOrder {
  return {
    id: 'o1',
    order_no: 1,
    status: 'confirmed',
    customer_name: 'Test',
    phone: '+94771234567',
    email: 'a@b.com',
    alt_phone: null,
    address: '1 Main St',
    delivery_date: TOMORROW,
    note: null,
    subtotal: 100,
    delivery_fee: 580,
    total: 680,
    total_pieces: 9,
    source: 'web',
    created_at: '2026-07-10T10:00:00Z',
    order_items: [],
    ...partial,
  }
}

const topperItem = {
  id: 'i1',
  product_name: 'Naked Brownie',
  package_label: 'Brownie Slab (12 pcs)',
  piece_count: 12,
  box_qty: 1,
  unit_price: 150,
  addons: [{ id: 'letter_topper', label: 'Letter Topper', price: 0, detail: { lines: ['HAPPY', 'BDAY', ''] } }],
  line_total: 1800,
}

describe('tab bucketing (baking today = delivery tomorrow)', () => {
  it('puts tomorrow-delivery open orders in "baking today"', () => {
    expect(isBakingToday(order({ delivery_date: TOMORROW }), NOW)).toBe(true)
    expect(isUpcoming(order({ delivery_date: TOMORROW }), NOW)).toBe(false)
  })

  it('puts later-delivery open orders in "upcoming"', () => {
    expect(isUpcoming(order({ delivery_date: LATER }), NOW)).toBe(true)
    expect(isBakingToday(order({ delivery_date: LATER }), NOW)).toBe(false)
  })

  it('excludes closed orders from both working tabs', () => {
    expect(isBakingToday(order({ delivery_date: TOMORROW, status: 'completed' }), NOW)).toBe(false)
    expect(isUpcoming(order({ delivery_date: LATER, status: 'cancelled' }), NOW)).toBe(false)
  })

  it('ordersForTab: all includes closed, working tabs do not', () => {
    const orders = [
      order({ id: 'a', delivery_date: TOMORROW }),
      order({ id: 'b', delivery_date: LATER }),
      order({ id: 'c', delivery_date: TOMORROW, status: 'completed' }),
    ]
    expect(ordersForTab(orders, 'baking_today', NOW).map((o) => o.id)).toEqual(['a'])
    expect(ordersForTab(orders, 'upcoming', NOW).map((o) => o.id)).toEqual(['b'])
    expect(ordersForTab(orders, 'all', NOW)).toHaveLength(3)
  })

  it('tomorrowIso is the day after the given date', () => {
    expect(tomorrowIso(NOW)).toBe(TOMORROW)
  })
})

describe('letter-topper detection', () => {
  it('flags an order with topper text', () => {
    expect(orderHasTopper(order({ order_items: [topperItem] }))).toBe(true)
  })
  it('does not flag when topper lines are all blank', () => {
    const blank = { ...topperItem, addons: [{ ...topperItem.addons[0], detail: { lines: ['', '', ''] } }] }
    expect(orderHasTopper(order({ order_items: [blank] }))).toBe(false)
  })
  it('returns only the non-empty topper lines for display', () => {
    expect(itemTopperLines(topperItem)).toEqual(['HAPPY', 'BDAY'])
  })
})

describe('repeat-customer detection (phone OR email)', () => {
  const a = order({ id: 'a', phone: '+94771234567', email: 'x@y.com' })
  const bSamePhone = order({ id: 'b', phone: '077 123 4567', email: 'other@y.com' })
  const cSameEmail = order({ id: 'c', phone: '+94770000000', email: 'X@Y.COM' })
  const dNew = order({ id: 'd', phone: '+94769999999', email: 'new@z.com' })
  const all = [a, bSamePhone, cSameEmail, dNew]

  it('matches on phone even with different formatting', () => {
    expect(isRepeatCustomer(a, all)).toBe(true)
    expect(isRepeatCustomer(bSamePhone, all)).toBe(true)
  })
  it('matches on email case-insensitively', () => {
    expect(isRepeatCustomer(cSameEmail, all)).toBe(true)
  })
  it('does not flag a genuinely new customer', () => {
    expect(isRepeatCustomer(dNew, all)).toBe(false)
  })
  it('counts prior orders from the same customer', () => {
    // a matches b (phone) and c (email) → 2 others
    expect(priorOrderCount(a, all)).toBe(2)
    expect(priorOrderCount(dNew, all)).toBe(0)
  })
})
