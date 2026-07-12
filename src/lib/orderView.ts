// Pure helpers for the admin Orders view (3-tab layout + row flags). Kept
// separate from the React component so the tab-bucketing, letter-topper
// detection, and repeat-customer logic can be unit-tested and reused.
import type { AdminOrder } from './adminOrders'
import type { OrderStatus } from './orderStatus'
import { normalizePhone } from './format'

export type OrderTab = 'baking_today' | 'upcoming' | 'all'

// Orders in these states are "closed" — they only appear under the All tab.
const CLOSED_STATUSES: OrderStatus[] = ['completed', 'cancelled']

export function isClosed(order: AdminOrder): boolean {
  return CLOSED_STATUSES.includes(order.status)
}

/** YYYY-MM-DD for a Date, in local time (matches the date input / delivery_date column). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Tomorrow's date as YYYY-MM-DD, relative to `today` (defaults to now). */
export function tomorrowIso(today: Date = new Date()): string {
  const t = new Date(today)
  t.setDate(t.getDate() + 1)
  return isoDate(t)
}

/**
 * "Baking today" = orders whose delivery is TOMORROW (a bakery bakes the day
 * before delivery) and that aren't already closed. `todayIso`/`tomorrow` are
 * injectable for testing.
 */
export function isBakingToday(order: AdminOrder, today: Date = new Date()): boolean {
  if (isClosed(order)) return false
  return order.delivery_date === tomorrowIso(today)
}

/** "Upcoming" = not closed, and delivery is strictly after tomorrow (or undated). */
export function isUpcoming(order: AdminOrder, today: Date = new Date()): boolean {
  if (isClosed(order)) return false
  if (!order.delivery_date) return true // undated open orders still need attention
  return order.delivery_date > tomorrowIso(today)
}

/** Which orders belong under a given tab. */
export function ordersForTab(orders: AdminOrder[], tab: OrderTab, today: Date = new Date()): AdminOrder[] {
  if (tab === 'all') return orders
  if (tab === 'baking_today') return orders.filter((o) => isBakingToday(o, today))
  return orders.filter((o) => isUpcoming(o, today))
}

/** True when any line on the order carries letter-topper text. */
export function orderHasTopper(order: AdminOrder): boolean {
  return order.order_items.some((item) =>
    item.addons.some((a) => {
      const d = a.detail
      return !!d && 'lines' in d && d.lines.some((l) => l.trim() !== '')
    }),
  )
}

/** The non-empty topper lines for a single item (for display in the expanded row). */
export function itemTopperLines(item: AdminOrder['order_items'][number]): string[] {
  for (const a of item.addons) {
    const d = a.detail
    if (d && 'lines' in d) return d.lines.filter((l) => l.trim() !== '')
  }
  return []
}

function normPhone(p: string | null): string {
  if (!p) return ''
  // Canonicalise to +94… so "+94771234567" and "077 123 4567" match. Falls
  // back to a bare digit strip for anything that isn't a valid SL number
  // (e.g. an unusual manual/inquiry-entered value) so those still self-match.
  return normalizePhone(p) ?? p.replace(/\D/g, '')
}
function normEmail(e: string | null): string {
  return (e ?? '').trim().toLowerCase()
}

/**
 * A customer is "repeat" if any OTHER order (by a different id) shares their
 * phone or email. Matching is on either identifier since a customer may reuse
 * one but not the other. O(n²) over the order list, which is fine for a small
 * business's volume and keeps this a client-side-only computation (no schema
 * change). Compares against the whole list, not just earlier orders, so the
 * flag is symmetric — every order from a returning customer shows it.
 */
export function isRepeatCustomer(order: AdminOrder, allOrders: AdminOrder[]): boolean {
  const phone = normPhone(order.phone)
  const email = normEmail(order.email)
  return allOrders.some((o) => {
    if (o.id === order.id) return false
    const samePhone = phone.length > 0 && normPhone(o.phone) === phone
    const sameEmail = email.length > 0 && normEmail(o.email) === email
    return samePhone || sameEmail
  })
}

/** How many prior orders this customer has (for a "3rd order" style hint). */
export function priorOrderCount(order: AdminOrder, allOrders: AdminOrder[]): number {
  const phone = normPhone(order.phone)
  const email = normEmail(order.email)
  return allOrders.filter((o) => {
    if (o.id === order.id) return false
    const samePhone = phone.length > 0 && normPhone(o.phone) === phone
    const sameEmail = email.length > 0 && normEmail(o.email) === email
    return samePhone || sameEmail
  }).length
}
