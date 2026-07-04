// Order insert chain (spec §6.4 step 3): insert order → insert items with the
// returned order id. unit_cost is intentionally omitted — a DB trigger fills
// it from the recipe-costing tables once they exist (spec §4 order_items,
// cross-system contract with Spec B).
//
// Hand-rolled row shapes, not generated types — types/db.ts is a placeholder
// until `supabase gen types typescript` can run against the live project.
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
  orderNo: number
  phone: string
}

export async function createOrder({ items, totals, details }: CreateOrderInput): Promise<CreatedOrder> {
  const phone = normalizePhone(details.phone)
  if (!phone) throw new Error('Invalid phone number')

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
      source: 'web',
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

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  return { orderNo: order.order_no, phone }
}
