import { describe, it, expect } from 'vitest'
import { paymentSchema } from './checkout'

describe('payment schema (PR-A: bank transfer requires ref + slip)', () => {
  it('accepts a complete bank transfer (ref + slip present)', () => {
    const r = paymentSchema.safeParse({
      method: 'bank_transfer',
      paymentRef: '9F3K2109',
      slipUrl: '2026-08-01/abc.jpg',
    })
    expect(r.success).toBe(true)
  })

  it('rejects a bank transfer with no reference', () => {
    const r = paymentSchema.safeParse({
      method: 'bank_transfer',
      paymentRef: '',
      slipUrl: '2026-08-01/abc.jpg',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === 'paymentRef')).toBe(true)
    }
  })

  it('rejects a bank transfer with no slip uploaded', () => {
    const r = paymentSchema.safeParse({
      method: 'bank_transfer',
      paymentRef: '9F3K2109',
      slipUrl: '',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === 'slipUrl')).toBe(true)
    }
  })

  it('rejects a bank transfer missing both ref and slip', () => {
    const r = paymentSchema.safeParse({ method: 'bank_transfer' })
    expect(r.success).toBe(false)
  })

  it('accepts a card payment without ref or slip (card has no manual proof)', () => {
    const r = paymentSchema.safeParse({ method: 'card' })
    expect(r.success).toBe(true)
  })

  it('rejects an unknown payment method', () => {
    const r = paymentSchema.safeParse({ method: 'crypto' })
    expect(r.success).toBe(false)
  })
})
