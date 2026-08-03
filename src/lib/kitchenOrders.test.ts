import { describe, it, expect } from 'vitest'
import { kitchenVisible } from './kitchenOrders'

describe('kitchenVisible (payment + processing gate for the kitchen board)', () => {
  it('shows a paid bank-transfer order', () => {
    expect(kitchenVisible({ payment_status: 'paid', payment_method: 'bank_transfer', source: 'web', status: 'pending' })).toBe(true)
  })

  it('hides an unverified bank-transfer order', () => {
    expect(kitchenVisible({ payment_status: 'awaiting_verification', payment_method: 'bank_transfer', source: 'web', status: 'pending' })).toBe(false)
  })

  it('shows a paid card order (PayHere auto-confirmed)', () => {
    expect(kitchenVisible({ payment_status: 'paid', payment_method: 'card', source: 'web', status: 'pending' })).toBe(true)
  })

  it('hides an unpaid card order', () => {
    expect(kitchenVisible({ payment_status: 'unpaid', payment_method: 'card', source: 'web', status: 'pending' })).toBe(false)
  })

  it('hides a corporate/wedding conversion still at pending (not yet processed)', () => {
    expect(kitchenVisible({ source: 'inquiry_conversion', status: 'pending', payment_method: null })).toBe(false)
  })

  it('shows a corporate/wedding conversion once admin advances it past pending', () => {
    expect(kitchenVisible({ source: 'inquiry_conversion', status: 'confirmed', payment_method: null })).toBe(true)
    expect(kitchenVisible({ source: 'inquiry_conversion', status: 'baking', payment_method: null })).toBe(true)
  })

  it('shows a legacy web order with no payment method (pre-payment WhatsApp flow)', () => {
    expect(kitchenVisible({ source: 'web', payment_method: null, status: 'pending' })).toBe(true)
    expect(kitchenVisible({})).toBe(true)
  })
})
