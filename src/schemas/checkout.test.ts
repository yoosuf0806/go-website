import { describe, it, expect } from 'vitest'
import { checkoutDetailsSchema, adminOrderDetailsSchema } from './checkout'

const base = {
  name: 'Shiro Perera',
  phone: '+94706960947',
  altPhone: '',
  address: '57/3, Rajasinghe Mawatha, Colombo',
  deliveryDate: '2026-10-02',
  deliverySlot: '10-11',
  note: '',
  isGift: false,
}

describe('checkout details — email requirement', () => {
  it('storefront checkout REQUIRES an email', () => {
    const r = checkoutDetailsSchema.safeParse({ ...base, email: '' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === 'email')).toBe(true)
  })

  it('admin conversion allows a BLANK email', () => {
    const r = adminOrderDetailsSchema.safeParse({ ...base, email: '', deliverySlot: '' })
    expect(r.success).toBe(true)
  })

  it('a non-blank email must still be valid, on both schemas', () => {
    expect(checkoutDetailsSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false)
    expect(adminOrderDetailsSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false)
    expect(checkoutDetailsSchema.safeParse({ ...base, email: 'a@b.com' }).success).toBe(true)
  })
})
