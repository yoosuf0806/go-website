// Kitchen-facing order reads/writes. The RLS policy from migration 018 limits
// the kitchen role to source='web' orders only — the DB enforces this, so we
// don't need a client-side filter, but we do filter out cancelled orders.
import { supabase } from './supabase'
import type { CartAddon } from './pricing'
import type { OrderStatus } from './orderStatus'

export interface KitchenOrderItem {
  id: string
  product_name: string
  package_label: string
  piece_count: number
  box_qty: number
  addons: CartAddon[]
}

export interface KitchenOrder {
  id: string
  order_no: number
  status: OrderStatus
  customer_name: string
  address: string | null
  delivery_date: string | null
  note: string | null
  total_pieces: number
  order_items: KitchenOrderItem[]
}

// Button variant styling for the single advance action on each card.
export type KitchenButtonVariant = 'pink' | 'green' | 'navy'

// Statuses the kitchen can advance to, the button label, and its colour.
export const KITCHEN_NEXT: Partial<
  Record<OrderStatus, { to: OrderStatus; label: string; variant: KitchenButtonVariant }>
> = {
  pending: { to: 'baking', label: 'Start baking', variant: 'pink' },
  confirmed: { to: 'baking', label: 'Start baking', variant: 'pink' },
  baking: { to: 'ready', label: 'Mark ready to deliver', variant: 'green' },
  ready: { to: 'completed', label: 'Mark delivered', variant: 'navy' },
}

export const KITCHEN_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  baking: 'Baking',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// Kitchen-friendly status badge: pending/confirmed collapse into "To bake".
export function kitchenBadge(status: OrderStatus): { label: string; className: string } {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return { label: 'To bake', className: 'text-orange-400' }
    case 'baking':
      return { label: 'Baking', className: 'text-sky-400' }
    case 'ready':
      return { label: 'Ready', className: 'text-green-400' }
    case 'out_for_delivery':
      return { label: 'Out for delivery', className: 'text-sky-400' }
    case 'completed':
      return { label: 'Delivered', className: 'text-neutral-500' }
    default:
      return { label: KITCHEN_STATUS_LABEL[status], className: 'text-neutral-500' }
  }
}

// A short human line for an addon, e.g. `Letter topper: "MAYA"`, `Gift Ribbon: Gold`.
export function describeAddon(addon: CartAddon): string {
  const d = addon.detail
  if (d && 'lines' in d) {
    const text = d.lines.filter(Boolean).join(' ')
    return text ? `Letter topper: "${text}"` : addon.label
  }
  if (d && 'color' in d) return `${addon.label}: ${d.color}`
  if (d && 'message' in d) return `${addon.label}: "${d.message}"`
  return addon.label
}

/** Returns an ISO date string offset by `days` from today (negative = past). */
export function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function fetchKitchenOrders(deliveryDate: string): Promise<KitchenOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, customer_name, address, delivery_date, note, total_pieces, order_items(id, product_name, package_label, piece_count, box_qty, addons)',
    )
    .eq('delivery_date', deliveryDate)
    .neq('status', 'cancelled')
    .order('order_no', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as KitchenOrder[]
}

export async function advanceKitchenStatus(id: string, to: OrderStatus): Promise<void> {
  const { error } = await supabase.from('orders').update({ status: to }).eq('id', id)
  if (error) throw new Error(error.message)
}
