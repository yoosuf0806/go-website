// Storefront gift-voucher check at checkout (migration 021). Read-only — this
// does NOT mark a voucher used; that only happens atomically inside
// create_order() (migration 022) so a race between two checkouts can't both
// redeem the same code.
import { supabase } from './supabase'

export type VoucherStatus = 'ok' | 'invalid' | 'used'
export type VoucherDiscountType = 'fixed' | 'percent'

export interface VoucherValidation {
  status: VoucherStatus
  /**
   * The voucher value, present only when status === 'ok': LKR for a 'fixed'
   * voucher, or the percentage (e.g. 10 = 10%) for a 'percent' voucher.
   */
  amount: number | null
  /** How `amount` is applied. Defaults to 'fixed' for older vouchers. */
  discountType: VoucherDiscountType
}

export async function validateGiftVoucher(code: string): Promise<VoucherValidation> {
  const { data, error } = await supabase
    .rpc('validate_gift_voucher', { p_code: code.trim() })
    .single()

  if (error) throw new Error(error.message)

  const row = data as { status: VoucherStatus; amount: number | null; discount_type?: string }
  return {
    status: row.status,
    amount: row.amount != null ? Number(row.amount) : null,
    discountType: row.discount_type === 'percent' ? 'percent' : 'fixed',
  }
}
