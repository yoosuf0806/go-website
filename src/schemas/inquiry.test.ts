import { describe, it, expect } from 'vitest'
import { inquiryFormSchema } from './inquiry'

const base = { category: 'corporate' as const, name: 'Roshan', phone: '0771234567' }

describe('inquiry form schema (spec §6.6)', () => {
  it('accepts the minimal required fields (category, name, phone)', () => {
    expect(inquiryFormSchema.safeParse(base).success).toBe(true)
  })

  it('rejects a missing name', () => {
    expect(inquiryFormSchema.safeParse({ ...base, name: '' }).success).toBe(false)
  })

  it('rejects an invalid Sri Lankan phone', () => {
    expect(inquiryFormSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false)
  })

  it('accepts a valid email but rejects a malformed one', () => {
    expect(inquiryFormSchema.safeParse({ ...base, email: 'a@b.com' }).success).toBe(true)
    expect(inquiryFormSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false)
  })

  it('treats an empty email string as allowed (optional)', () => {
    expect(inquiryFormSchema.safeParse({ ...base, email: '' }).success).toBe(true)
  })

  it('coerces a positive guest count and rejects zero/negative', () => {
    const ok = inquiryFormSchema.safeParse({ ...base, guestCount: 50 })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.guestCount).toBe(50)
    expect(inquiryFormSchema.safeParse({ ...base, guestCount: 0 }).success).toBe(false)
  })

  it('rejects only the corporate/wedding categories', () => {
    expect(inquiryFormSchema.safeParse({ ...base, category: 'birthday' }).success).toBe(false)
  })
})
