import { describe, it, expect } from 'vitest'
import { formatLKR, formatDate, formatDateTime, normalizePhone, toWhatsAppNumber } from './format'

describe('formatLKR', () => {
  it('formats with thousands separators and 2 decimals', () => {
    expect(formatLKR(1250)).toBe('Rs. 1,250.00')
    expect(formatLKR(580)).toBe('Rs. 580.00')
    expect(formatLKR(0)).toBe('Rs. 0.00')
    expect(formatLKR(1234567.5)).toBe('Rs. 1,234,567.50')
  })

  it('is resilient to non-finite input', () => {
    expect(formatLKR(NaN)).toBe('Rs. 0.00')
  })
})

describe('formatDate', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2026-07-05')).toBe('5 Jul 2026')
  })
  it('returns empty string for null/invalid', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate('not-a-date')).toBe('')
  })
})

describe('formatDateTime', () => {
  it('formats a timestamp as local date + 12-hour time', () => {
    // Construct a local Date so the assertion is timezone-independent.
    const d = new Date(2026, 8, 15, 14, 30) // 15 Sep 2026, 14:30 local
    expect(formatDateTime(d)).toBe('15 Sep 2026, 2:30 PM')
  })

  it('pads minutes and handles midnight/noon', () => {
    expect(formatDateTime(new Date(2026, 0, 1, 0, 5))).toBe('1 Jan 2026, 12:05 AM')
    expect(formatDateTime(new Date(2026, 0, 1, 12, 0))).toBe('1 Jan 2026, 12:00 PM')
  })

  it('returns empty for null/invalid', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime('not-a-date')).toBe('')
  })
})

describe('normalizePhone (Sri Lanka → +94)', () => {
  it('normalises local 0-prefixed mobile numbers', () => {
    expect(normalizePhone('0771234567')).toBe('+94771234567')
    expect(normalizePhone('077 123 4567')).toBe('+94771234567')
    expect(normalizePhone('077-123-4567')).toBe('+94771234567')
  })

  it('accepts 94… and +94… forms', () => {
    expect(normalizePhone('94771234567')).toBe('+94771234567')
    expect(normalizePhone('+94 77 123 4567')).toBe('+94771234567')
  })

  it('rejects invalid numbers', () => {
    expect(normalizePhone('123')).toBeNull()
    expect(normalizePhone('077123456')).toBeNull() // too short
    expect(normalizePhone('')).toBeNull()
  })
})

describe('toWhatsAppNumber', () => {
  it('produces a digits-only number with no +', () => {
    expect(toWhatsAppNumber('0771234567')).toBe('94771234567')
  })
  it('returns null for invalid input', () => {
    expect(toWhatsAppNumber('abc')).toBeNull()
  })
})
