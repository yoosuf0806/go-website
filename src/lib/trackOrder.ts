// Customer-facing order tracking. Reads through the lookup_order() SECURITY
// DEFINER RPC (migration 028) because anon has no direct SELECT on orders — the
// RPC returns only the safe, customer-entered fields for a single order number.
import { supabase } from './supabase'

export interface TrackedOrderItem {
  product_name: string
  package_label: string
  piece_count: number
  box_qty: number
}

export interface TrackedOrder {
  order_no: number
  status: string
  payment_status: string | null
  customer_name: string
  phone: string
  address: string | null
  delivery_date: string | null
  is_gift: boolean
  recipient_name: string | null
  recipient_phone: string | null
  items: TrackedOrderItem[]
}

/** Look up one order by its number. Returns null when the number doesn't exist. */
export async function lookupOrder(orderNo: number): Promise<TrackedOrder | null> {
  const { data, error } = await supabase.rpc('lookup_order', { p_order_no: orderNo })
  if (error) throw new Error(error.message)
  return (data as TrackedOrder | null) ?? null
}
