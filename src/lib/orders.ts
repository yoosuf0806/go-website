// Storefront order creation (spec §6.4 step 3). Runs as the anon role, which
// has NO public SELECT on orders, so we can't `insert ... returning order_no`
// directly — instead we call the create_order() SECURITY DEFINER RPC (migration
// 011), which inserts the order + items atomically and returns the order number.
// unit_cost is left NULL for a DB trigger to fill later (cross-system contract).
import { supabase } from './supabase'
import { lineTotal, type CartTotals } from './pricing'
import type { CartLine } from '../stores/cart'
import type { CheckoutDetails } from '../schemas/checkout'
import { normalizePhone } from './format'

export interface CreateOrderInput {
  items: CartLine[]
  totals: CartTotals
  details: CheckoutDetails
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

export async function createOrder({ items, totals, details }: CreateOrderInput): Promise<CreatedOrder> {
  const phone = normalizePhone(details.phone)
  if (!phone) throw new Error('Invalid phone number')

  const { data, error } = await supabase
    .rpc('create_order', {
      p_customer_name: details.name,
      p_phone: phone,
      p_address: details.address,
      p_delivery_date: details.deliveryDate,
      p_note: details.note || null,
      p_subtotal: totals.subtotal,
      p_delivery_fee: totals.deliveryFee,
      p_total: totals.total,
      p_total_pieces: totals.totalPieces,
      p_items: orderItemsPayload(items),
    })
    .single()

  const row = data as { id: string; order_no: number } | null
  if (error || !row) {
    throw new Error(error?.message ?? 'Failed to create order')
  }

  return { id: row.id, orderNo: row.order_no, phone }
}
