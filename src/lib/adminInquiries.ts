// Admin-side inquiry reads/writes — live Supabase (spec §7 Inquiries, §8).
import { supabase } from './supabase'
import { createOrder } from './orders'
import type { CartLine } from '../stores/cart'
import type { CartTotals } from './pricing'
import type { CheckoutDetails } from '../schemas/checkout'
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
 */
export async function convertInquiryToOrder({
  inquiry,
  items,
  totals,
  details,
}: ConvertInquiryInput): Promise<{ orderNo: number }> {
  const order = await createOrder({
    items,
    totals,
    details,
    source: 'inquiry_conversion',
    inquiryId: inquiry.id,
  })

  const { error } = await supabase
    .from('inquiries')
    .update({ status: 'converted', converted_order_id: order.id })
    .eq('id', inquiry.id)
  if (error) throw new Error(error.message)

  return { orderNo: order.orderNo }
}
