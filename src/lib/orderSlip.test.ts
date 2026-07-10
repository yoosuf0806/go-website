import { describe, it, expect } from 'vitest'
import { buildOrderSlipHtml } from './orderSlip'
import type { AdminOrder } from './adminOrders'

const order: AdminOrder = {
  id: 'o1',
  order_no: 42,
  status: 'confirmed',
  customer_name: 'Nadeesha P.',
  phone: '+94771234567',
  email: 'nadeesha@example.com',
  alt_phone: '+94712223344',
  address: '123 Galle Rd, Colombo',
  delivery_date: '2026-07-10',
  note: 'Leave with security',
  subtotal: 2880,
  delivery_fee: 580,
  total: 3460,
  total_pieces: 18,
  source: 'web',
  created_at: '2026-07-04T10:00:00Z',
  order_items: [
    {
      id: 'i1',
      product_name: 'Naked Brownie',
      package_label: '9 Pieces',
      piece_count: 9,
      box_qty: 1,
      unit_price: 150,
      addons: [{ id: 'gift_ribbon', label: 'Gift Ribbon', price: 150, detail: { color: 'Gold' } }],
      line_total: 1500,
    },
  ],
}

describe('buildOrderSlipHtml (spec §7 Orders)', () => {
  const html = buildOrderSlipHtml(order)

  it('includes the order number, customer, and status', () => {
    expect(html).toContain('Order #42')
    expect(html).toContain('Nadeesha P.')
    expect(html).toContain('Confirmed')
  })

  it('renders line items with add-on detail and totals', () => {
    expect(html).toContain('Naked Brownie — 9 Pieces × 1')
    expect(html).toContain('Ribbon: Gold')
    expect(html).toContain('Rs. 3,460.00')
    expect(html).toContain('Delivery (18 pcs)')
  })

  it('escapes HTML in user-supplied fields', () => {
    const xss = buildOrderSlipHtml({
      ...order,
      customer_name: '<script>alert(1)</script>',
    })
    expect(xss).not.toContain('<script>alert(1)</script>')
    expect(xss).toContain('&lt;script&gt;')
  })
})

describe('order slip contact fields (PR: checkout contact redesign)', () => {
  it('renders email and alternative phone when present', () => {
    const html = buildOrderSlipHtml(order)
    expect(html).toContain('nadeesha@example.com')
    expect(html).toContain('+94712223344')
  })
})
