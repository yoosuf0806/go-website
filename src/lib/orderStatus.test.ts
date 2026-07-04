import { describe, it, expect } from 'vitest'
import { nextStatus, canCancel, ORDER_STATUSES } from './orderStatus'

describe('order status flow (spec §7)', () => {
  it('advances pending → confirmed → baking → ready → out_for_delivery → completed', () => {
    expect(nextStatus('pending')).toBe('confirmed')
    expect(nextStatus('confirmed')).toBe('baking')
    expect(nextStatus('baking')).toBe('ready')
    expect(nextStatus('ready')).toBe('out_for_delivery')
    expect(nextStatus('out_for_delivery')).toBe('completed')
  })

  it('has no next status past completed or from cancelled', () => {
    expect(nextStatus('completed')).toBeNull()
    expect(nextStatus('cancelled')).toBeNull()
  })

  it('allows cancel from any non-terminal state only', () => {
    expect(canCancel('pending')).toBe(true)
    expect(canCancel('out_for_delivery')).toBe(true)
    expect(canCancel('completed')).toBe(false)
    expect(canCancel('cancelled')).toBe(false)
  })

  it('enum covers all seven statuses', () => {
    expect(ORDER_STATUSES).toHaveLength(7)
  })
})
