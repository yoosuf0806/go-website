// Admin CRUD for gift_vouchers (migration 021). Live Supabase reads/writes,
// same pattern as adminReviews — the storefront only ever calls the
// validate_gift_voucher() RPC, never this table directly.
import { supabase } from './supabase'

export type VoucherDiscountType = 'fixed' | 'percent'

export interface AdminGiftVoucher {
  id: string
  code: string
  /** LKR for a 'fixed' voucher, or the percentage for a 'percent' voucher. */
  amount: number
  discount_type: VoucherDiscountType
  is_active: boolean
  /** Optional validity window (timestamptz ISO strings). null = unbounded. */
  valid_from: string | null
  valid_until: string | null
  used_at: string | null
  used_by_order_id: string | null
  created_at: string
}

export interface NewGiftVoucher {
  code: string
  amount: number
  discount_type: VoucherDiscountType
  valid_from: string | null
  valid_until: string | null
}

export async function fetchGiftVouchers(): Promise<AdminGiftVoucher[]> {
  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminGiftVoucher[]
}

export async function addGiftVoucher(input: NewGiftVoucher): Promise<void> {
  const { error } = await supabase.from('gift_vouchers').insert({
    code: input.code.trim().toUpperCase(),
    amount: input.amount,
    discount_type: input.discount_type,
    valid_from: input.valid_from || null,
    valid_until: input.valid_until || null,
  })
  if (error) throw new Error(error.message)
}

export async function setGiftVoucherActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase.from('gift_vouchers').update({ is_active }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteGiftVoucher(id: string): Promise<void> {
  const { error } = await supabase.from('gift_vouchers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
