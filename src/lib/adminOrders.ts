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
  delivery_slot: string | null
  note: string | null
  kitchen_note: string | null
  delivery_provider: 'promptxpress' | 'pickme_flash' | null
  tracking_number: string | null
  tracking_url: string | null
  is_gift?: boolean
  recipient_name?: string | null
  recipient_phone?: string | null
  payment_method?: string | null
  payment_status?: string | null
  payment_ref?: string | null
  slip_url?: string | null
  subtotal: number
  delivery_fee: number
  total: number
  voucher_discount?: number | null
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
      'id, order_no, status, customer_name, phone, email, alt_phone, address, delivery_date, delivery_slot, note, kitchen_note, delivery_provider, tracking_number, tracking_url, is_gift, recipient_name, recipient_phone, payment_method, payment_status, payment_ref, slip_url, subtotal, delivery_fee, total, voucher_discount, total_pieces, source, created_at, order_items(id, product_name, package_label, piece_count, box_qty, unit_price, addons, line_total)',
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

// Mark a bank-transfer order's payment as confirmed after the admin has
// checked the slip. Setting payment_status='paid' releases it to the kitchen.
export async function confirmOrderPayment(id: string): Promise<void> {
  const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', id)
  if (error) throw new Error(error.message)
}

// One line as the admin edits it. `id` is present for existing lines (updated
// in place) and absent for new manual lines. box_qty is the quantity, unit_price
// the per-box price the admin types; the server derives line_total = unit_price
// × box_qty and recomputes the order totals.
export interface OrderItemEdit {
  id?: string
  product_name: string
  package_label: string
  piece_count: number
  box_qty: number
  unit_price: number
}

// Admin manual override of an order's line items (qty + unit price, add/remove
// lines). Goes through the admin_update_order_items RPC, which is gated on
// is_admin() and recomputes subtotal/total/total_pieces server-side.
export async function updateOrderItems(
  orderId: string,
  items: OrderItemEdit[],
  deliveryFee: number,
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_order_items', {
    p_order_id: orderId,
    p_items: items,
    p_delivery_fee: deliveryFee,
  })
  if (error) throw new Error(error.message)
}

// Set (or clear) the admin's private note to the kitchen for one order. An
// empty string is stored as NULL so "no note" is unambiguous.
export async function updateKitchenNote(id: string, note: string): Promise<void> {
  const trimmed = note.trim()
  const { error } = await supabase
    .from('orders')
    .update({ kitchen_note: trimmed === '' ? null : trimmed })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
