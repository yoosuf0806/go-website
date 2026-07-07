// Admin dashboard stats (spec §7 Dashboard). The fetch reads live from
// Supabase; the aggregation is a pure function so it can be unit-tested without
// a DB. "This week" = the rolling last 7 days (incl. today).
import { supabase } from './supabase'
import { findTier, type DeliveryTier } from './pricing'
import type { OrderStatus } from './orderStatus'

export interface DashboardOrderRow {
  status: OrderStatus
  total: number
  total_pieces: number
  created_at: string
}

export interface DashboardInquiryRow {
  status: string
}

export interface DashboardStats {
  todayOrders: number
  pendingOrders: number
  revenueThisWeek: number
  newInquiries: number
  lowPieceOrders: number
  heavyOrders: number
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function computeDashboardStats(
  orders: DashboardOrderRow[],
  inquiries: DashboardInquiryRow[],
  tiers: DeliveryTier[],
  now: Date = new Date(),
): DashboardStats {
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  let todayOrders = 0
  let pendingOrders = 0
  let revenueThisWeek = 0
  let lowPieceOrders = 0
  let heavyOrders = 0

  for (const order of orders) {
    const created = new Date(order.created_at)
    if (isSameLocalDay(created, now)) todayOrders++
    if (order.status === 'pending') pendingOrders++

    const cancelled = order.status === 'cancelled'
    if (!cancelled && created >= weekAgo) revenueThisWeek += order.total

    // Heavy vs low-piece breakdown excludes cancelled orders.
    if (!cancelled) {
      const tier = findTier(order.total_pieces, tiers)
      if (tier?.warnAdmin) heavyOrders++
      else lowPieceOrders++
    }
  }

  const newInquiries = inquiries.filter((i) => i.status === 'new').length

  return { todayOrders, pendingOrders, revenueThisWeek, newInquiries, lowPieceOrders, heavyOrders }
}

export async function fetchDashboardStats(tiers: DeliveryTier[]): Promise<DashboardStats> {
  const [ordersRes, inquiriesRes] = await Promise.all([
    supabase.from('orders').select('status, total, total_pieces, created_at'),
    supabase.from('inquiries').select('status'),
  ])

  if (ordersRes.error) throw new Error(ordersRes.error.message)
  if (inquiriesRes.error) throw new Error(inquiriesRes.error.message)

  return computeDashboardStats(
    (ordersRes.data ?? []) as DashboardOrderRow[],
    (inquiriesRes.data ?? []) as DashboardInquiryRow[],
    tiers,
  )
}
