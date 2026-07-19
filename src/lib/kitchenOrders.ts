// Kitchen-facing order reads/writes. The RLS policy from migration 018 limits
// the kitchen role to source='web' orders only — the DB enforces this, so we
// don't need a client-side filter, but we do filter to avoid cancelled orders.
import { supabase } from './supabase'
import type { OrderStatus } from './orderStatus'

export interface KitchenOrderItem {
  id: string
  product_name: string
  package_label: string
  piece_count: number
  box_qty: number
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

// Statuses the kitchen can advance to, and the button label for each source state.
export const KITCHEN_NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: 'baking', label: 'Start baking' },
  confirmed: { to: 'baking', label: 'Start baking' },
  baking: { to: 'ready', label: 'Mark ready to deliver' },
  ready: { to: 'completed', label: 'Mark delivered' },
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
      'id, order_no, status, customer_name, address, delivery_date, note, total_pieces, order_items(id, product_name, package_label, piece_count, box_qty)',
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
