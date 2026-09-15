import { describe, it, expect } from 'vitest'
import {
  buildOrderMessage,
  buildOrderPaymentRequestMessage,
  buildDispatchMessage,
  PROMPTXPRESS_TRACK_URL,
  buildInquiryMessage,
  buildDeliveryConfirmationMessage,
  deliveryConfirmationWaLink,
  buildOrderInquiryMessage,
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
    expect(msg).toContain('Alt phone: +94712223344')
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
    expect(msg).not.toContain('Address:')
    expect(msg).not.toContain('Email:')
    expect(msg).not.toContain('Note:')
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

describe('buildOrderPaymentRequestMessage (Pay with WhatsApp)', () => {
  const boxItems: CartItem[] = [
    {
      productId: 'make-your-own-box',
      packageId: 'box:sig',
      productName: 'Make Your Own Box (15 pcs)',
      packageLabel: '5x Assorted, 5x Cashew, 5x Naked',
      pieceCount: 15,
      boxQty: 1,
      unitPrice: 2750,
      isBox: true,
      boxItems: [
        { productId: 'c', name: 'Cashew', count: 5, pricePerPiece: 190 },
        { productId: 'a', name: 'Assorted', count: 5, pricePerPiece: 180 },
        { productId: 'n', name: 'Naked', count: 5, pricePerPiece: 180 },
      ],
      addons: [],
    },
  ]
  const totals = cartTotals(boxItems, tiers)
  const input: OrderMessageInput = {
    orderNo: 16,
    items: boxItems,
    totals,
    customer: {
      name: 'Afdhal',
      phone: '+94769970226',
      email: 'ahamedyoosuf20018@gmail.com',
      address: '57/3, Rajasinghe Mawatha, Borupona, Rathmalane',
      deliveryDate: '2026-09-15',
      deliverySlot: '10-11',
    },
  }

  it('leads with the payment-pending header and request line', () => {
    const msg = buildOrderPaymentRequestMessage(input)
    expect(msg.startsWith('*New Order #16 — Payment Pending*\n')).toBe(true)
    expect(msg).toContain('Please send your payment details so I can complete the payment for this order.')
    expect(msg.trimEnd().endsWith('Thank you!')).toBe(true)
  })

  it('renders the box line with its flavour composition (sorted by name)', () => {
    const msg = buildOrderPaymentRequestMessage(input)
    expect(msg).toContain('* 1x Make Your Own Box (15 pcs) (5x Assorted, 5x Cashew, 5x Naked)')
  })

  it('has Billing Summary with subtotal, delivery and total', () => {
    const msg = buildOrderPaymentRequestMessage(input)
    expect(msg).toContain('Billing Summary')
    expect(msg).toContain('* Subtotal: Rs. 2,750.00')
    expect(msg).toContain('* Delivery: Rs. 580.00')
    expect(msg).toContain('* Total: Rs. 3,330.00')
  })

  it('formats the phone and delivery time the way the business expects', () => {
    const msg = buildOrderPaymentRequestMessage(input)
    expect(msg).toContain('* Name: Afdhal')
    expect(msg).toContain('* Phone: +94 76 997 0226')
    expect(msg).toContain('* Email: ahamedyoosuf20018@gmail.com')
    expect(msg).toContain('* Delivery Time: Sep 15, 2026 (10:00 AM – 11:00 AM)')
  })
})

describe('buildDispatchMessage (delivery/tracking)', () => {
  it('PromptXpress: tracking number + the fixed tracking page, no icons', () => {
    const msg = buildDispatchMessage({ provider: 'promptxpress', orderNo: 42, trackingNumber: 'PX999' })
    expect(msg).toContain('Golden Oven Delivery Update!')
    expect(msg).toContain('Your order #42 has been dispatched')
    expect(msg).toContain('Tracking Number: PX999')
    expect(msg).toContain(`Track your package: ${PROMPTXPRESS_TRACK_URL}`)
    expect(msg).toContain('reply directly to this message')
    expect(/\p{Extended_Pictographic}/u.test(msg)).toBe(false)
  })

  it('PickMe Flash: the staff-entered link, no tracking-number line', () => {
    const msg = buildDispatchMessage({
      provider: 'pickme_flash',
      orderNo: 42,
      trackingUrl: 'https://pickme.lk/track/abc',
    })
    expect(msg).toContain('Golden Oven Delivery Update')
    expect(msg).not.toContain('Delivery Update!')
    expect(msg).not.toContain('Tracking Number:')
    expect(msg).toContain('Track your package: https://pickme.lk/track/abc')
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

describe('buildOrderInquiryMessage', () => {
  it('opens with the inquiry line then the order details, no emojis', () => {
    const msg = buildOrderInquiryMessage({
      orderNo: 1024,
      deliveryDate: '2026-07-05',
      address: '12 Galle Rd, Colombo 03',
      phone: '+94771234567',
      items: [{ product_name: 'Cashew Brownie', package_label: 'Slab (12 pcs)', box_qty: 1 }],
    })
    expect(msg.startsWith("Hi! I'd like to inquire about my order.")).toBe(true)
    expect(/\p{Extended_Pictographic}/u.test(msg)).toBe(false)
    expect(msg).toContain('Order #1024')
    expect(msg).toContain('- Cashew Brownie — Slab (12 pcs) x 1')
    expect(msg).toContain('Delivery date: 5 Jul 2026')
    expect(msg).toContain('Contact number: +94771234567')
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
