// WhatsApp deep-link message builders (spec §6.5). Two first-class templates:
// order confirmation and corporate/wedding inquiry. Amounts come from formatLKR
// and the caller's cartTotals() output, so the message never diverges from the
// cart/checkout UI (a real prototype bug class). Encoded with encodeURIComponent;
// `\n` line breaks become %0A in the link.
import { formatLKR, formatDate, toWhatsAppNumber, normalizePhone } from './format'
import { slotShort, slotLabel } from './deliverySlots'
import { lineTotal, totalAfterVoucher, type CartAddon, type CartItem, type CartTotals } from './pricing'

export interface OrderCustomer {
  name: string
  phone: string
  email?: string
  altPhone?: string | null
  address?: string
  deliveryDate?: string | null
  deliverySlot?: string | null
  note?: string
  isGift?: boolean
  recipientName?: string | null
  recipientPhone?: string | null
}

export interface OrderMessageInput {
  orderNo: number | string
  items: CartItem[]
  /** The SAME totals shown in the cart/checkout — do not recompute here. */
  totals: CartTotals
  customer: OrderCustomer
  /** An applied gift voucher, if any — mirrors what was sent to create_order(). */
  voucher?: { code: string; discount: number } | null
}

export type InquiryCategory = 'corporate' | 'wedding'

export interface InquiryMessageInput {
  category: InquiryCategory
  name: string
  phone: string
  email?: string
  eventDate?: string | null
  guestCount?: number | null
  message?: string
}

/**
 * Human-readable add-on summary for one line, or '' if the line has none.
 * Takes only the add-ons array so the cart drawer, checkout review step, and
 * admin order rows all render the same summary text that ends up in the
 * WhatsApp message. Any object with an `addons` array satisfies it.
 */
export function addonSummary(item: { addons: CartAddon[] }): string {
  const parts: string[] = []
  for (const addon of item.addons) {
    const detail = addon.detail
    if (detail && 'lines' in detail) {
      const text = detail.lines.filter((l) => l.trim() !== '').join(' / ')
      if (text) parts.push(`Topper: "${text}"`)
    } else if (detail && 'color' in detail) {
      parts.push(`Ribbon: ${detail.color}`)
    } else if (detail && 'message' in detail) {
      parts.push(`Msg: "${detail.message}"`)
    } else {
      parts.push(addon.label)
    }
  }
  return parts.join(' | ')
}

/** Build the order confirmation message body (spec §6.5 order template). */
export function buildOrderMessage(input: OrderMessageInput): string {
  const { orderNo, items, totals, customer, voucher } = input
  const lines: string[] = []

  // Plain text with WhatsApp bold (*…*) only — no emojis/icons.
  lines.push(`*Golden Oven — New Order #${orderNo}*`)
  lines.push('')

  for (const item of items) {
    lines.push(`${item.productName} — ${item.packageLabel} × ${item.boxQty}`)
    const addons = addonSummary(item)
    if (addons) lines.push(`  ${addons}`)
    lines.push(`  ${formatLKR(lineTotal(item))}`)
  }

  lines.push('')
  lines.push(`Subtotal: ${formatLKR(totals.subtotal)}`)
  lines.push(`Delivery (${totals.totalPieces} pcs): ${formatLKR(totals.deliveryFee)}`)
  if (voucher && voucher.discount > 0) {
    lines.push(`Voucher (${voucher.code}): −${formatLKR(voucher.discount)}`)
  }
  const finalTotal = voucher ? totalAfterVoucher(totals.total, voucher.discount) : totals.total
  lines.push(`*Total: ${formatLKR(finalTotal)}*`)
  lines.push('')
  lines.push(`Name: ${customer.name}`)
  lines.push(`Phone: ${customer.phone}`)
  if (customer.altPhone) lines.push(`Alt phone: ${customer.altPhone}`)
  if (customer.email) lines.push(`Email: ${customer.email}`)
  if (customer.address) lines.push(`Address: ${customer.address}`)
  if (customer.deliveryDate)
    lines.push(
      `Delivery: ${formatDate(customer.deliveryDate)}` +
        (customer.deliverySlot ? ` (${slotShort(customer.deliverySlot)})` : ''),
    )
  if (customer.isGift && customer.recipientName) {
    lines.push(`Gift for: ${customer.recipientName}${customer.recipientPhone ? ` (${customer.recipientPhone})` : ''}`)
  }
  if (customer.note) lines.push(`Note: ${customer.note}`)

  return lines.join('\n')
}

/**
 * One line item on the delivery-confirmation message, e.g.
 * "- Cashew Brownie — Brownie Slab (12 pcs) x 1".
 */
export interface ConfirmationItem {
  product_name: string
  package_label: string
  box_qty: number
}

export interface DeliveryConfirmationInput {
  orderNo: number | string
  /** Customer's phone (E.164 or local) — this is where the message is sent. */
  phone: string
  address?: string | null
  deliveryDate?: string | null
  deliverySlot?: string | null
  isGift?: boolean
  recipientName?: string | null
  recipientPhone?: string | null
  items: ConfirmationItem[]
}

/**
 * Order-confirmed message the admin sends to the CUSTOMER after verifying their
 * bank-transfer payment. Deliberately plain, professional text — no emojis or
 * icons — every field pulled from the order so it can't diverge from the system.
 */
export function buildDeliveryConfirmationMessage(input: DeliveryConfirmationInput): string {
  const lines: string[] = []
  lines.push('Dear Customer,')
  lines.push('')
  lines.push('Your payment has been verified and your order has been placed for delivery.')
  lines.push('')
  lines.push(`Order #${input.orderNo}`)
  lines.push('')
  lines.push('Items:')
  for (const item of input.items) {
    lines.push(`- ${item.product_name} — ${item.package_label} x ${item.box_qty}`)
  }
  lines.push('')
  if (input.deliveryDate)
    lines.push(
      `Delivery date: ${formatDate(input.deliveryDate)}` +
        (input.deliverySlot ? ` (${slotShort(input.deliverySlot)})` : ''),
    )
  if (input.address) lines.push(`Delivery address: ${input.address}`)
  lines.push(`Contact number: ${input.phone}`)
  if (input.isGift && input.recipientName) {
    const rp = input.recipientPhone ? ` (${input.recipientPhone})` : ''
    lines.push(`Gift recipient: ${input.recipientName}${rp}`)
  }
  lines.push('')
  lines.push('Thank you for ordering with Golden Oven.')
  return lines.join('\n')
}

/** wa.me deep link to the customer's number carrying the confirmation message. */
export function deliveryConfirmationWaLink(input: DeliveryConfirmationInput): string {
  return whatsAppLink(input.phone, buildDeliveryConfirmationMessage(input))
}

export interface OrderInquiryInput {
  orderNo: number | string
  deliveryDate?: string | null
  deliverySlot?: string | null
  address?: string | null
  phone: string
  items: ConfirmationItem[]
}

/**
 * Message a customer sends to care from the "Track your order" page: a friendly
 * opener followed by their order details (pulled from the system) so support
 * has the context immediately. Plain text, no emojis.
 */
export function buildOrderInquiryMessage(input: OrderInquiryInput): string {
  const lines: string[] = []
  lines.push("Hi! I'd like to inquire about my order.")
  lines.push('')
  lines.push(`Order #${input.orderNo}`)
  lines.push('Items:')
  for (const item of input.items) {
    lines.push(`- ${item.product_name} — ${item.package_label} x ${item.box_qty}`)
  }
  if (input.deliveryDate)
    lines.push(
      `Delivery date: ${formatDate(input.deliveryDate)}` +
        (input.deliverySlot ? ` (${slotShort(input.deliverySlot)})` : ''),
    )
  if (input.address) lines.push(`Delivery address: ${input.address}`)
  lines.push(`Contact number: ${input.phone}`)
  return lines.join('\n')
}

/** Build the corporate/wedding inquiry message body (spec §6.5 inquiry template). */
export function buildInquiryMessage(input: InquiryMessageInput): string {
  const label = input.category === 'wedding' ? 'Wedding' : 'Corporate'
  const lines: string[] = []

  lines.push(`💼 *Golden Oven — ${label} Inquiry*`)
  lines.push(
    `👤 ${input.name} | 📞 ${input.phone}${input.email ? ` | ✉️ ${input.email}` : ''}`,
  )

  const eventBits: string[] = []
  if (input.eventDate) eventBits.push(`🗓 Event: ${formatDate(input.eventDate)}`)
  if (input.guestCount != null) eventBits.push(`👥 Guests: ${input.guestCount}`)
  if (eventBits.length) lines.push(eventBits.join(' | '))

  if (input.message) lines.push(`📝 ${input.message}`)

  return lines.join('\n')
}

/** Wrap a message body into a wa.me deep link to the given number. */
export function whatsAppLink(businessNumber: string, body: string): string {
  const number = toWhatsAppNumber(businessNumber) ?? businessNumber.replace(/[^\d]/g, '')
  return `https://wa.me/${number}?text=${encodeURIComponent(body)}`
}

export function orderWhatsAppLink(businessNumber: string, input: OrderMessageInput): string {
  return whatsAppLink(businessNumber, buildOrderMessage(input))
}

// US-style date "Sep 15, 2026" from an ISO date-only string, built from UTC
// parts so an ISO midnight never rolls to the previous day. Empty for no date.
const US_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
function formatUsDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${US_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

// Group a Sri Lankan number for display, e.g. +94769970226 -> "+94 76 997 0226".
// Falls back to the raw input if it isn't a normalisable SL number.
function formatPhoneDisplay(phone: string): string {
  const norm = normalizePhone(phone)
  if (!norm) return phone
  const n = norm.slice(3) // 9 national digits
  return `+94 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`
}

// One "Order Details" line: "1x Name (detail)". For a build-your-own box the
// detail is its flavour composition; for other lines it's the package label and
// any add-ons.
function paymentRequestItemLine(item: CartItem): string {
  const detailParts: string[] = []
  if (item.isBox && item.boxItems && item.boxItems.length > 0) {
    detailParts.push(
      item.boxItems
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => `${f.count}x ${f.name}`)
        .join(', '),
    )
  } else if (item.packageLabel) {
    detailParts.push(item.packageLabel)
  }
  const addons = addonSummary(item)
  if (addons) detailParts.push(addons)
  const detail = detailParts.length > 0 ? ` (${detailParts.join(' · ')})` : ''
  return `* ${item.boxQty}x ${item.productName}${detail}`
}

/**
 * "Pay with WhatsApp" message — sent BY the customer TO the business to request
 * payment details. Structured into Order Details / Billing Summary / Customer &
 * Delivery Info sections. Amounts come from the same cartTotals() the checkout
 * shows, so the message never diverges from what the customer saw.
 */
export function buildOrderPaymentRequestMessage(input: OrderMessageInput): string {
  const { orderNo, items, totals, customer, voucher } = input
  const finalTotal = voucher ? totalAfterVoucher(totals.total, voucher.discount) : totals.total
  const lines: string[] = []

  // Plain text with WhatsApp bold (*…*) only — no emojis/icons.
  lines.push(`*New Order #${orderNo} — Payment Pending*`)
  lines.push('Please send your payment details so I can complete the payment for this order.')

  // Order Details
  lines.push('*Order Details*')
  lines.push('')
  for (const item of items) lines.push(paymentRequestItemLine(item))
  lines.push('')

  // Billing Summary
  lines.push('*Billing Summary*')
  lines.push('')
  lines.push(`* Subtotal: ${formatLKR(totals.subtotal)}`)
  lines.push(`* Delivery: ${formatLKR(totals.deliveryFee)}`)
  if (voucher && voucher.discount > 0) {
    lines.push(`* Voucher (${voucher.code}): −${formatLKR(voucher.discount)}`)
  }
  lines.push(`* Total: ${formatLKR(finalTotal)}`)
  lines.push('')

  // Customer & Delivery Info
  lines.push('*Customer & Delivery Info*')
  lines.push('')
  lines.push(`* Name: ${customer.name}`)
  lines.push(`* Phone: ${formatPhoneDisplay(customer.phone)}`)
  if (customer.altPhone) lines.push(`* Alt Phone: ${formatPhoneDisplay(customer.altPhone)}`)
  if (customer.email) lines.push(`* Email: ${customer.email}`)
  if (customer.address) lines.push(`* Address: ${customer.address}`)
  if (customer.deliveryDate) {
    const slot = customer.deliverySlot ? ` (${slotLabel(customer.deliverySlot)})` : ''
    lines.push(`* Delivery Time: ${formatUsDate(customer.deliveryDate)}${slot}`)
  }
  if (customer.isGift && customer.recipientName) {
    lines.push(
      `* Gift for: ${customer.recipientName}` +
        (customer.recipientPhone ? ` (${formatPhoneDisplay(customer.recipientPhone)})` : ''),
    )
  }
  if (customer.note) lines.push(`* Note: ${customer.note}`)
  lines.push('')

  lines.push('Thank you!')

  return lines.join('\n')
}

export function orderPaymentRequestWaLink(businessNumber: string, input: OrderMessageInput): string {
  return whatsAppLink(businessNumber, buildOrderPaymentRequestMessage(input))
}

// PromptXpress has a single tracking page; the customer looks their item up
// there with the tracking number. PickMe Flash gives a per-order link instead.
export const PROMPTXPRESS_TRACK_URL = 'https://www.promptxpress.lk/TrackItem.aspx'

export interface DispatchMessageInput {
  provider: 'promptxpress' | 'pickme_flash'
  orderNo: number | string
  /** PromptXpress tracking number. */
  trackingNumber?: string | null
  /** PickMe Flash tracking link. */
  trackingUrl?: string | null
}

/**
 * Dispatch/tracking message sent TO the customer when an order goes out for
 * delivery. Plain text, no icons. Two templates — PromptXpress carries a
 * tracking number + the fixed tracking page; PickMe Flash carries a link.
 */
export function buildDispatchMessage(input: DispatchMessageInput): string {
  const lines: string[] = []
  if (input.provider === 'promptxpress') {
    lines.push('Golden Oven Delivery Update!')
    lines.push('')
    lines.push(
      `Hi there! Your order #${input.orderNo} has been dispatched and is scheduled for delivery tomorrow.`,
    )
    lines.push('')
    lines.push(`Tracking Number: ${input.trackingNumber ?? ''}`)
    lines.push(`Track your package: ${PROMPTXPRESS_TRACK_URL}`)
  } else {
    lines.push('Golden Oven Delivery Update')
    lines.push('')
    lines.push(
      `Hi there! Your order #${input.orderNo} has been dispatched and is scheduled for delivery tomorrow.`,
    )
    lines.push('')
    lines.push(`Track your package: ${input.trackingUrl ?? ''}`)
  }
  lines.push('')
  lines.push('If you have any questions about your delivery, feel free to reply directly to this message!')
  return lines.join('\n')
}

/** wa.me link to the CUSTOMER carrying the dispatch/tracking message. */
export function dispatchWaLink(customerPhone: string, input: DispatchMessageInput): string {
  return whatsAppLink(customerPhone, buildDispatchMessage(input))
}

export function inquiryWhatsAppLink(businessNumber: string, input: InquiryMessageInput): string {
  return whatsAppLink(businessNumber, buildInquiryMessage(input))
}
