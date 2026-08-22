import { describe, it, expect } from 'vitest'
import {
  addMonths,
  groupByDate,
  isPendingDelivery,
  monthGrid,
  monthTitle,
  piecesOn,
  toISODate,
  type ScheduleOrder,
} from './deliverySchedule'

function order(p: Partial<ScheduleOrder> & { id: string; order_no: number }): ScheduleOrder {
  return {
    customer_name: 'Test',
    delivery_date: '2026-09-10',
    delivery_slot: '10-11',
    status: 'confirmed',
    total_pieces: 10,
    ...p,
  }
}

describe('toISODate', () => {
  it('uses the LOCAL calendar day, not UTC', () => {
    // 00:30 local on the 10th. toISOString() would report the 9th anywhere
    // ahead of UTC (Sri Lanka is UTC+5:30) — that off-by-one would put a
    // delivery on the wrong calendar day.
    const d = new Date(2026, 8, 10, 0, 30)
    expect(toISODate(d)).toBe('2026-09-10')
  })

  it('zero-pads month and day', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('monthGrid', () => {
  it('starts on Monday and covers whole weeks', () => {
    const grid = monthGrid(2026, 8, new Date(2026, 8, 15)) // September 2026
    expect(grid.length % 7).toBe(0)
    expect(grid[0].weekday).toBe(0) // Monday
    expect(grid[grid.length - 1].weekday).toBe(6) // Sunday
  })

  it('includes every day of the month exactly once', () => {
    const grid = monthGrid(2026, 8, new Date(2026, 8, 15))
    const inMonth = grid.filter((c) => c.inMonth).map((c) => c.date)
    expect(inMonth).toHaveLength(30) // September
    expect(inMonth[0]).toBe('2026-09-01')
    expect(inMonth[29]).toBe('2026-09-30')
    expect(new Set(inMonth).size).toBe(30)
  })

  it('pads with adjacent days marked out-of-month', () => {
    // 1 Sep 2026 is a Tuesday, so exactly one leading pad day (Mon 31 Aug).
    const grid = monthGrid(2026, 8, new Date(2026, 8, 15))
    expect(grid[0]).toMatchObject({ date: '2026-08-31', inMonth: false })
  })

  it('flags today and past days', () => {
    const grid = monthGrid(2026, 8, new Date(2026, 8, 15))
    const today = grid.find((c) => c.date === '2026-09-15')
    expect(today).toMatchObject({ isToday: true, isPast: false })
    expect(grid.find((c) => c.date === '2026-09-14')?.isPast).toBe(true)
    expect(grid.find((c) => c.date === '2026-09-16')?.isPast).toBe(false)
  })

  it('does not emit a trailing all-padding week', () => {
    // February 2027 starts on a Monday and has 28 days — exactly 4 weeks.
    const grid = monthGrid(2027, 1, new Date(2027, 1, 10))
    expect(grid).toHaveLength(28)
  })
})

describe('addMonths / monthTitle', () => {
  it('rolls across a year boundary in both directions', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })

  it('titles the month', () => {
    expect(monthTitle(2026, 8)).toBe('September 2026')
  })
})

describe('isPendingDelivery', () => {
  it('keeps open orders and drops finished ones', () => {
    expect(isPendingDelivery({ status: 'pending' })).toBe(true)
    expect(isPendingDelivery({ status: 'baking' })).toBe(true)
    expect(isPendingDelivery({ status: 'out_for_delivery' })).toBe(true)
    expect(isPendingDelivery({ status: 'completed' })).toBe(false)
    expect(isPendingDelivery({ status: 'cancelled' })).toBe(false)
  })
})

describe('groupByDate', () => {
  it('buckets by delivery date', () => {
    const grouped = groupByDate([
      order({ id: 'a', order_no: 1, delivery_date: '2026-09-10' }),
      order({ id: 'b', order_no: 2, delivery_date: '2026-09-11' }),
      order({ id: 'c', order_no: 3, delivery_date: '2026-09-10' }),
    ])
    expect([...grouped.keys()].sort()).toEqual(['2026-09-10', '2026-09-11'])
    expect(grouped.get('2026-09-10')).toHaveLength(2)
  })

  it('sorts a day chronologically: morning, afternoon, then no-slot', () => {
    const grouped = groupByDate([
      order({ id: 'none', order_no: 1, delivery_slot: null }),
      order({ id: 'pm', order_no: 2, delivery_slot: '16-18' }),
      order({ id: 'am', order_no: 3, delivery_slot: '10-11' }),
    ])
    expect(grouped.get('2026-09-10')!.map((o) => o.id)).toEqual(['am', 'pm', 'none'])
  })

  it('breaks slot ties by order number', () => {
    const grouped = groupByDate([
      order({ id: 'second', order_no: 20, delivery_slot: '10-11' }),
      order({ id: 'first', order_no: 10, delivery_slot: '10-11' }),
    ])
    expect(grouped.get('2026-09-10')!.map((o) => o.id)).toEqual(['first', 'second'])
  })

  it('excludes completed/cancelled and orders with no date', () => {
    const grouped = groupByDate([
      order({ id: 'done', order_no: 1, status: 'completed' }),
      order({ id: 'void', order_no: 2, status: 'cancelled' }),
      order({ id: 'undated', order_no: 3, delivery_date: null }),
      order({ id: 'live', order_no: 4 }),
    ])
    expect([...grouped.values()].flat().map((o) => o.id)).toEqual(['live'])
  })
})

describe('piecesOn', () => {
  it('totals the pieces due', () => {
    expect(
      piecesOn([
        order({ id: 'a', order_no: 1, total_pieces: 10 }),
        order({ id: 'b', order_no: 2, total_pieces: 25 }),
      ]),
    ).toBe(35)
  })
})
