// Delivery schedule: the data shape and date maths behind the calendar views
// in Admin and Kitchen. Pure functions only — no Supabase, no React — so the
// month-grid and grouping rules are unit-testable.

import { slotRank } from './deliverySlots'

/** The slice of an order a schedule cell needs. */
export interface ScheduleOrder {
  id: string
  order_no: number
  customer_name: string
  delivery_date: string | null
  delivery_slot: string | null
  status: string
  total_pieces: number
  address?: string | null
}

// An order still "pending to deliver" is anything not finished and not called
// off. Completed/cancelled orders stay out of the schedule so the calendar
// shows work remaining, not history.
const CLOSED_STATUSES = new Set(['completed', 'cancelled'])

export function isPendingDelivery(o: { status: string }): boolean {
  return !CLOSED_STATUSES.has(o.status)
}

// ── Local-date helpers ──────────────────────────────────────────────────────
// Everything is done on local calendar days. Deliberately NOT using
// toISOString(), which converts to UTC and can shift the date across midnight
// for timezones ahead of UTC — Sri Lanka is UTC+5:30, so that bug would show a
// delivery on the wrong day for half the evening.

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

export interface DayCell {
  /** YYYY-MM-DD */
  date: string
  /** False for the leading/trailing days that pad the grid to whole weeks. */
  inMonth: boolean
  isToday: boolean
  isPast: boolean
  /** 0 = Monday … 6 = Sunday. */
  weekday: number
}

/**
 * A whole-weeks grid for the given month, Monday-first (deliveries are a
 * weekday-driven business, and Monday-first keeps Sat/Sun together at the end).
 * Always returns complete weeks so the calendar renders as a clean rectangle.
 */
export function monthGrid(year: number, month: number, now: Date = new Date()): DayCell[] {
  const today = toISODate(now)
  const first = new Date(year, month, 1)
  // getDay(): 0=Sun..6=Sat → shift so Monday is 0.
  const leading = (first.getDay() + 6) % 7

  const start = new Date(year, month, 1 - leading)
  const cells: DayCell[] = []
  // 6 weeks covers every possible month layout; trailing empty weeks are
  // trimmed below so a short month doesn't render a blank final row.
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const iso = toISODate(d)
    cells.push({
      date: iso,
      inMonth: d.getMonth() === month && d.getFullYear() === year,
      isToday: iso === today,
      isPast: iso < today,
      weekday: (d.getDay() + 6) % 7,
    })
  }
  const lastUsed = cells.reduce((last, c, i) => (c.inMonth ? i : last), 0)
  const weeksNeeded = Math.ceil((lastUsed + 1) / 7)
  return cells.slice(0, weeksNeeded * 7)
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function monthTitle(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function formatDayLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// ── Grouping ────────────────────────────────────────────────────────────────

/**
 * Bucket pending deliveries by date, each day's list in delivery order:
 * morning slot, then afternoon, then anything with no slot, then order number.
 */
export function groupByDate<T extends ScheduleOrder>(orders: T[]): Map<string, T[]> {
  const byDate = new Map<string, T[]>()
  for (const o of orders) {
    if (!o.delivery_date || !isPendingDelivery(o)) continue
    const list = byDate.get(o.delivery_date)
    if (list) list.push(o)
    else byDate.set(o.delivery_date, [o])
  }
  for (const list of byDate.values()) {
    list.sort(
      (a, b) => slotRank(a.delivery_slot) - slotRank(b.delivery_slot) || a.order_no - b.order_no,
    )
  }
  return byDate
}

/** Total pieces due on a day — the number the kitchen actually plans around. */
export function piecesOn(orders: ScheduleOrder[]): number {
  return orders.reduce((n, o) => n + (o.total_pieces || 0), 0)
}
