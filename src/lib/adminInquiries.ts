// Admin-side inquiry reads/writes — live Supabase (spec §7 Inquiries, §8).
import { supabase } from './supabase'
import { lineTotal, type CartTotals } from './pricing'
import type { CartLine } from '../stores/cart'
import type { CheckoutDetails } from '../schemas/checkout'
import { normalizePhone } from './format'
import type { InquiryCategory } from '../schemas/inquiry'

export const INQUIRY_STATUSES = ['new', 'contacted', 'quoted', 'converted', 'closed'] as const
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number]

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  converted: 'Converted',
  closed: 'Closed',
}

export interface AdminInquiry {
  id: string
  category: InquiryCategory
  status: InquiryStatus
  name: string
  phone: string
  email: string | null
  event_date: string | null
  guest_count: number | null
  message: string | null
  converted_order_id: string | null
  created_at: string
}

export async function fetchInquiries(): Promise<AdminInquiry[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminInquiry[]
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  const { error } = await supabase.from('inquiries').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export interface ConvertInquiryInput {
  inquiry: AdminInquiry
  items: CartLine[]
  totals: CartTotals
  details: CheckoutDetails
}

/**
 * Convert an inquiry into an order (spec §7): create the order with
 * source='inquiry_conversion' linked to the inquiry, then link the inquiry back
 * (converted_order_id) and set its status to 'converted'.
 *
 * Runs as an authenticated admin (the "admin manage orders" ALL policy), so
 * unlike the anon storefront path this can insert directly and read back the
 * order number via RETURNING — no RPC needed here.
 */
export async function convertInquiryToOrder({
  inquiry,
  items,
  totals,
  details,
}: ConvertInquiryInput): Promise<{ orderNo: number }> {
  const phone = normalizePhone(details.phone) ?? details.phone

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: details.name,
      phone,
      address: details.address,
      delivery_date: details.deliveryDate,
      note: details.note || null,
      subtotal: totals.subtotal,
      delivery_fee: totals.deliveryFee,
      total: totals.total,
      total_pieces: totals.totalPieces,
      source: 'inquiry_conversion',
      inquiry_id: inquiry.id,
    })
    .select('id, order_no')
    .single()

  if (orderError || !order) {
    throw new Error(orderError?.message ?? 'Failed to create order')
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      package_id: item.packageId,
      package_label: item.packageLabel,
      piece_count: item.pieceCount,
      box_qty: item.boxQty,
      unit_price: item.unitPrice,
      addons: item.addons,
      line_total: lineTotal(item),
    })),
  )
  if (itemsError) throw new Error(itemsError.message)

  const { error } = await supabase
    .from('inquiries')
    .update({ status: 'converted', converted_order_id: order.id })
    .eq('id', inquiry.id)
  if (error) throw new Error(error.message)

  return { orderNo: order.order_no }
}
