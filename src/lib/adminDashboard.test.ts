import { describe, it, expect } from 'vitest'
import { computeDashboardStats, type DashboardOrderRow } from './adminDashboard'
import type { DeliveryTier } from './pricing'

// Two tiers: a light base tier and a heavy tier flagged warnAdmin.
const tiers: DeliveryTier[] = [
  { minPieces: 1, maxPieces: 50, fee: 580, warnAdmin: false },
  { minPieces: 51, maxPieces: null, fee: 1200, warnAdmin: true },
]

const NOW = new Date('2026-07-04T12:00:00Z')

function order(overrides: Partial<DashboardOrderRow>): DashboardOrderRow {
  return { status: 'pending', total: 1000, total_pieces: 9, created_at: NOW.toISOString(), ...overrides }
}

describe('computeDashboardStats (spec §7 Dashboard)', () => {
  it('counts today orders, pending, and new inquiries', () => {
    const stats = computeDashboardStats(
      [
        order({ status: 'pending' }),
        order({ status: 'confirmed' }),
        order({ status: 'pending', created_at: '2026-06-01T00:00:00Z' }), // old, not today
      ],
      [{ status: 'new' }, { status: 'new' }, { status: 'contacted' }],
      tiers,
      NOW,
    )
    expect(stats.todayOrders).toBe(2)
    expect(stats.pendingOrders).toBe(2)
    expect(stats.newInquiries).toBe(2)
  })

  it('sums revenue this week excluding cancelled orders', () => {
    const stats = computeDashboardStats(
      [
        order({ total: 1000 }),
        order({ total: 500 }),
        order({ total: 999, status: 'cancelled' }), // excluded
        order({ total: 2000, created_at: '2026-06-01T00:00:00Z' }), // outside week
      ],
      [],
      tiers,
      NOW,
    )
    expect(stats.revenueThisWeek).toBe(1500)
  })

  it('splits low-piece vs heavy orders by the warnAdmin tier, ignoring cancelled', () => {
    const stats = computeDashboardStats(
      [
        order({ total_pieces: 9 }), // low
        order({ total_pieces: 60 }), // heavy (warnAdmin tier)
        order({ total_pieces: 80, status: 'cancelled' }), // excluded
      ],
      [],
      tiers,
      NOW,
    )
    expect(stats.lowPieceOrders).toBe(1)
    expect(stats.heavyOrders).toBe(1)
  })
})
