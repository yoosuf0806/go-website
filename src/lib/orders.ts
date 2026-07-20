// Storefront order creation (spec §6.4 step 3). Runs as the anon role, which
// has NO public SELECT on orders, so we can't `insert ... returning order_no`
// directly — instead we call the create_order() SECURITY DEFINER RPC (migration
// 011), which inserts the order + items atomically and returns the order number.
// unit_cost is left NULL for a DB trigger to fill later (cross-system contract).
import { supabase } from './supabase'
import { lineTotal, totalAfterVoucher, type CartTotals } from './pricing'
import type { CartLine } from '../stores/cart'
import type { CheckoutDetails } from '../schemas/checkout'
import { normalizePhone } from './format'

/** An applied (validated 'ok') voucher, carried from CheckoutModal into the order RPC. */
export interface AppliedVoucher {
  code: string
  discount: number
}

export interface CreateOrderInput {
  items: CartLine[]
  totals: CartTotals
  details: CheckoutDetails
  voucher?: AppliedVoucher | null
}

export interface CreatedOrder {
  id: string
  orderNo: number
  phone: string
}

/** Cart lines → the jsonb item shape the create_order() RPC expects. */
export function orderItemsPayload(items: CartLine[]) {
  return items.map((item) => ({
    product_id: item.productId,
    product_name: item.productName,
    package_id: item.packageId,
    package_label: item.packageLabel,
    piece_count: item.pieceCount,
    box_qty: item.boxQty,
    unit_price: item.unitPrice,
    addons: item.addons,
    line_total: lineTotal(item),
  }))
}

export async function createOrder({ items, totals, details, voucher }: CreateOrderInput): Promise<CreatedOrder> {
  const phone = normalizePhone(details.phone)
  if (!phone) throw new Error('Invalid phone number')
  // Optional second number: normalise if given, otherwise omit.
  const altPhone = details.altPhone ? normalizePhone(details.altPhone) : null
  const total = voucher ? totalAfterVoucher(totals.total, voucher.discount) : totals.total

  const { data, error } = await supabase
    .rpc('create_order', {
      p_customer_name: details.name,
      p_phone: phone,
      p_email: details.email,
      p_alt_phone: altPhone,
      p_address: details.address,
      p_delivery_date: details.deliveryDate,
      p_note: details.note || null,
      p_subtotal: totals.subtotal,
      p_delivery_fee: totals.deliveryFee,
      p_total: total,
      p_total_pieces: totals.totalPieces,
      p_items: orderItemsPayload(items),
      p_voucher_code: voucher?.code ?? null,
      p_voucher_discount: voucher?.discount ?? 0,
    })
    .single()

  const row = data as { id: string; order_no: number } | null
  if (error || !row) {
    // create_order() raises these two markers when the voucher lost its race
    // (redeemed by another checkout between "Apply" and "Confirm order").
    if (error?.message.includes('VOUCHER_USED')) {
      throw new Error('This voucher was just used on another order. Remove it to continue.')
    }
    if (error?.message.includes('VOUCHER_INVALID')) {
      throw new Error('This voucher is no longer valid. Remove it to continue.')
    }
    throw new Error(error?.message ?? 'Failed to create order')
  }

  return { id: row.id, orderNo: row.order_no, phone }
}
