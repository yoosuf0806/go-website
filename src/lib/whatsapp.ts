// WhatsApp deep-link message builders (spec §6.5). Two first-class templates:
// order confirmation and corporate/wedding inquiry. Amounts come from formatLKR
// and the caller's cartTotals() output, so the message never diverges from the
// cart/checkout UI (a real prototype bug class). Encoded with encodeURIComponent;
// `\n` line breaks become %0A in the link.
import { formatLKR, formatDate, toWhatsAppNumber } from './format'
import { lineTotal, type CartItem, type CartTotals } from './pricing'

export interface OrderCustomer {
  name: string
  phone: string
  address?: string
  deliveryDate?: string | null
  note?: string
}

export interface OrderMessageInput {
  orderNo: number | string
  items: CartItem[]
  /** The SAME totals shown in the cart/checkout — do not recompute here. */
  totals: CartTotals
  customer: OrderCustomer
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

/** Human-readable add-on summary for one line, or '' if the line has none. */
function addonSummary(item: CartItem): string {
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
  const { orderNo, items, totals, customer } = input
  const lines: string[] = []

  lines.push(`🍫 *Golden Oven — New Order #${orderNo}*`)
  lines.push('')

  for (const item of items) {
    lines.push(`• ${item.productName} — ${item.packageLabel} × ${item.boxQty}`)
    const addons = addonSummary(item)
    if (addons) lines.push(`  ↳ ${addons}`)
    lines.push(`  ${formatLKR(lineTotal(item))}`)
  }

  lines.push('')
  lines.push(`Subtotal: ${formatLKR(totals.subtotal)}`)
  lines.push(`Delivery (${totals.totalPieces} pcs): ${formatLKR(totals.deliveryFee)}`)
  lines.push(`*Total: ${formatLKR(totals.total)}*`)
  lines.push('')
  lines.push(`👤 ${customer.name} | 📞 ${customer.phone}`)
  if (customer.address) lines.push(`📍 ${customer.address}`)
  if (customer.deliveryDate) lines.push(`🗓 Delivery: ${formatDate(customer.deliveryDate)}`)
  if (customer.note) lines.push(`📝 ${customer.note}`)

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

export function inquiryWhatsAppLink(businessNumber: string, input: InquiryMessageInput): string {
  return whatsAppLink(businessNumber, buildInquiryMessage(input))
}
