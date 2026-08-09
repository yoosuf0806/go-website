import { describe, it, expect } from 'vitest'
import {
  buildOrderMessage,
  buildInquiryMessage,
  buildDeliveryConfirmationMessage,
  deliveryConfirmationWaLink,
  orderWhatsAppLink,
  type OrderMessageInput,
} from './whatsapp'
import { cartTotals, type CartItem, type DeliveryTier } from './pricing'

const tiers: DeliveryTier[] = [{ minPieces: 1, maxPieces: null, fee: 580, warnAdmin: false }]

const items: CartItem[] = [
  {
    productId: 'p1',
    packageId: 'slab-12',
    productName: 'Cashew Brownie',
    packageLabel: 'Brownie Slab (12 pcs)',
    pieceCount: 12,
    boxQty: 1,
    unitPrice: 190,
    addons: [
      { id: 'letter_topper', label: 'Letter Topper', price: 350, detail: { lines: ['HAPPY', 'BDAY', ''] } },
      { id: 'gift_ribbon', label: 'Gift Ribbon', price: 150, detail: { color: 'Gold' } },
    ],
  },
]

describe('buildOrderMessage', () => {
  const totals = cartTotals(items, tiers)
  const input: OrderMessageInput = {
    orderNo: 42,
    items,
    totals,
    customer: {
      name: 'Nadeesha',
      phone: '+94771234567',
      address: '12 Galle Rd, Colombo 03',
      deliveryDate: '2026-07-05',
      note: 'Ring the bell',
    },
  }

  it('includes email and alternative phone when present', () => {
    const msg = buildOrderMessage({
      ...input,
      customer: {
        ...input.customer,
        email: 'nadeesha@example.com',
        altPhone: '+94712223344',
      },
    })
    expect(msg).toContain('nadeesha@example.com')
    expect(msg).toContain('Alt: +94712223344')
  })

  it('includes the order number, line, addon summary, and line total', () => {
    const msg = buildOrderMessage(input)
    expect(msg).toContain('New Order #42')
    expect(msg).toContain('Cashew Brownie — Brownie Slab (12 pcs) × 1')
    expect(msg).toContain('Topper: "HAPPY / BDAY"') // empty 3rd line dropped
    expect(msg).toContain('Ribbon: Gold')
    expect(msg).toContain('Rs. 2,780.00') // 190*12 + 350 + 150 = 2780
  })

  it("delivery line matches cartTotals output exactly (spec §6.5)", () => {
    const msg = buildOrderMessage(input)
    expect(msg).toContain('Delivery (12 pcs): Rs. 580.00')
    expect(msg).toContain('*Total: Rs. 3,360.00*') // 2780 + 580
  })

  it('omits optional customer lines when absent', () => {
    const msg = buildOrderMessage({
      ...input,
      customer: { name: 'X', phone: '+94770000000' },
    })
    expect(msg).not.toContain('📍')
    expect(msg).not.toContain('🗓')
    expect(msg).not.toContain('📝')
  })

  it('shows the voucher line and discounts the total when a voucher is applied', () => {
    const msg = buildOrderMessage({ ...input, voucher: { code: 'GOLDEN500', discount: 500 } })
    expect(msg).toContain('Voucher (GOLDEN500): −Rs. 500.00')
    expect(msg).toContain('*Total: Rs. 2,860.00*') // 3360 - 500
  })

  it('omits the voucher line when no voucher is applied', () => {
    const msg = buildOrderMessage(input)
    expect(msg).not.toContain('Voucher')
  })
})

describe('buildInquiryMessage', () => {
  it('renders a corporate inquiry with event details', () => {
    const msg = buildInquiryMessage({
      category: 'corporate',
      name: 'Acme Ltd',
      phone: '+94112223344',
      email: 'events@acme.lk',
      eventDate: '2026-08-01',
      guestCount: 120,
      message: 'Need 200 boxes',
    })
    expect(msg).toContain('Corporate Inquiry')
    expect(msg).toContain('✉️ events@acme.lk')
    expect(msg).toContain('👥 Guests: 120')
  })

  it('labels weddings and tolerates missing optional fields', () => {
    const msg = buildInquiryMessage({ category: 'wedding', name: 'R & S', phone: '+94770000000' })
    expect(msg).toContain('Wedding Inquiry')
    expect(msg).not.toContain('✉️')
    expect(msg).not.toContain('👥')
  })
})

describe('buildDeliveryConfirmationMessage', () => {
  const base = {
    orderNo: 1024,
    phone: '+94771234567',
    address: '12 Galle Rd, Colombo 03',
    deliveryDate: '2026-07-05',
    items: [
      { product_name: 'Cashew Brownie', package_label: 'Brownie Slab (12 pcs)', box_qty: 2 },
    ],
  }

  it('is plain professional text with no emojis or icons', () => {
    const msg = buildDeliveryConfirmationMessage(base)
    // No emoji/pictographs anywhere in the body.
    expect(/\p{Extended_Pictographic}/u.test(msg)).toBe(false)
    expect(msg).toContain('Your payment has been verified')
    expect(msg).toContain('Order #1024')
    expect(msg).toContain('- Cashew Brownie — Brownie Slab (12 pcs) x 2')
    expect(msg).toContain('Delivery date: 5 Jul 2026')
    expect(msg).toContain('Delivery address: 12 Galle Rd, Colombo 03')
    expect(msg).toContain('Contact number: +94771234567')
    expect(msg).toContain('Thank you for ordering with Golden Oven.')
  })

  it('adds a recipient line only for gift orders', () => {
    expect(buildDeliveryConfirmationMessage(base)).not.toContain('Gift recipient')
    const gift = buildDeliveryConfirmationMessage({
      ...base,
      isGift: true,
      recipientName: 'Jane Doe',
      recipientPhone: '+94712223344',
    })
    expect(gift).toContain('Gift recipient: Jane Doe (+94712223344)')
  })

  it('links to the customer number with an encoded body', () => {
    const link = deliveryConfirmationWaLink(base)
    expect(link.startsWith('https://wa.me/94771234567?text=')).toBe(true)
    expect(decodeURIComponent(link.split('text=')[1])).toContain('Order #1024')
  })
})

describe('whatsAppLink', () => {
  it('produces an encoded wa.me deep link with %0A line breaks', () => {
    const totals = cartTotals(items, tiers)
    const link = orderWhatsAppLink('94771234567', { orderNo: 1, items, totals, customer: { name: 'X', phone: '+94770000000' } })
    expect(link.startsWith('https://wa.me/94771234567?text=')).toBe(true)
    expect(link).toContain('%0A') // encoded newline
    expect(decodeURIComponent(link.split('text=')[1])).toContain('New Order #1')
  })
})
