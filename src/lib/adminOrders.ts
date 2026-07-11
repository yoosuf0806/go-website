// Admin-side order reads/writes — LIVE Supabase, not the snapshot (spec §8:
// "Admin uses React Query live"). Row shapes are hand-declared here because
// types/db.ts is a placeholder until `supabase gen types` can run.
import { supabase } from './supabase'
import type { CartAddon } from './pricing'
import type { OrderStatus } from './orderStatus'

export interface AdminOrderItem {
  id: string
  product_name: string
  package_label: string
  piece_count: number
  box_qty: number
  unit_price: number
  addons: CartAddon[]
  line_total: number
}

export interface AdminOrder {
  id: string
  order_no: number
  status: OrderStatus
  customer_name: string
  phone: string
  email: string | null
  alt_phone: string | null
  address: string | null
  delivery_date: string | null
  note: string | null
  subtotal: number
  delivery_fee: number
  total: number
  total_pieces: number
  source: string
  created_at: string
  order_items: AdminOrderItem[]
}

export interface OrderFilters {
  status?: OrderStatus | 'all'
  /** ISO date (YYYY-MM-DD) matched against delivery_date. */
  deliveryDate?: string
}

export async function fetchOrders(filters: OrderFilters = {}): Promise<AdminOrder[]> {
  let query = supabase
    .from('orders')
    .select(
      'id, order_no, status, customer_name, phone, email, alt_phone, address, delivery_date, note, subtotal, delivery_fee, total, total_pieces, source, created_at, order_items(id, product_name, package_label, piece_count, box_qty, unit_price, addons, line_total)',
    )
    .order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.deliveryDate) {
    query = query.eq('delivery_date', filters.deliveryDate)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminOrder[]
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}
