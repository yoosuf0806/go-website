// Admin CRUD for gift_vouchers (migration 021). Live Supabase reads/writes,
// same pattern as adminReviews — the storefront only ever calls the
// validate_gift_voucher() RPC, never this table directly.
import { supabase } from './supabase'

export interface AdminGiftVoucher {
  id: string
  code: string
  amount: number
  is_active: boolean
  used_at: string | null
  used_by_order_id: string | null
  created_at: string
}

export interface NewGiftVoucher {
  code: string
  amount: number
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
