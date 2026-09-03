export type VoucherStatus = 'ok' | 'invalid' | 'used' | 'expired'  // add 'expired'
export type VoucherDiscountType = 'fixed' | 'percent'

export interface VoucherValidation {
  status: VoucherStatus
  amount: number | null
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
