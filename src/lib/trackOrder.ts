// Customer-facing order tracking. Reads through the lookup_order() SECURITY
// DEFINER RPC (migration 028) because anon has no direct SELECT on orders — the
// RPC returns only the safe, customer-entered fields for a single order number.
import { supabase } from './supabase'
import { normalizePhone } from './format'

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

/**
 * Look up one order by its number AND the delivery contact number that placed
 * it — the phone gate stops order numbers from being enumerated. Returns null
 * when the number/phone pair doesn't match, or the phone isn't a valid SL
 * number. The phone is normalised to E.164 to match how create_order stores it.
 */
export async function lookupOrder(orderNo: number, phone: string): Promise<TrackedOrder | null> {
  const normalised = normalizePhone(phone)
  if (!normalised) return null
  const { data, error } = await supabase.rpc('lookup_order', {
    p_order_no: orderNo,
    p_phone: normalised,
  })
  if (error) throw new Error(error.message)
  return (data as TrackedOrder | null) ?? null
}
