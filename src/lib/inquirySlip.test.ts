import { describe, it, expect } from 'vitest'
import { buildQuotationHtml } from './inquirySlip'
import type { AdminInquiry } from './adminInquiries'

const inquiry: AdminInquiry = {
  id: 'q1',
  category: 'wedding',
  status: 'new',
  name: 'Ayesha F.',
  phone: '+94712223333',
  email: 'ayesha@example.com',
  event_date: '2026-08-15',
  guest_count: 120,
  message: 'Slab favours for 120 guests',
  converted_order_id: null,
  created_at: '2026-07-04T10:00:00Z',
}

describe('buildQuotationHtml (spec §7 Inquiries)', () => {
  it('renders the category, contact, and event details', () => {
    const html = buildQuotationHtml(inquiry)
    expect(html).toContain('Wedding Quotation')
    expect(html).toContain('Ayesha F.')
    expect(html).toContain('+94712223333')
    expect(html).toContain('Guests:</strong> 120')
    expect(html).toContain('15 Aug 2026')
  })

  it('escapes HTML in user-supplied fields', () => {
    const html = buildQuotationHtml({ ...inquiry, name: '<b>x</b>' })
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;b&gt;')
  })
})
