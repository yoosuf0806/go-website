export type VoucherDiscountType = 'fixed' | 'percent'

export interface AdminGiftVoucher {
  id: string
  code: string
  amount: number
  discount_type: VoucherDiscountType
  is_active: boolean
  valid_from: string | null   // ISO timestamptz
  valid_until: string | null  // ISO timestamptz
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

// setGiftVoucherActive and deleteGiftVoucher stay the same
