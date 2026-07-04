import { describe, it, expect } from 'vitest'
import {
  topperLineSchema,
  topperLinesSchema,
  giftMessageSchema,
  isValidTopperLine,
  TOPPER_LIMITS,
  GIFT_MESSAGE_MAX,
} from './addon'

describe('topper line limits (spec §6.2)', () => {
  it('uppercases and accepts ≤5 chars', () => {
    expect(topperLineSchema.parse('abc')).toBe('ABC')
    expect(topperLineSchema.parse('happy')).toBe('HAPPY') // exactly 5
  })

  it('rejects >5 chars', () => {
    expect(topperLineSchema.safeParse('sixchr').success).toBe(false)
    expect(isValidTopperLine('sixchr')).toBe(false)
    expect(isValidTopperLine('five5')).toBe(true)
  })

  it('rejects more than 3 lines', () => {
    expect(topperLinesSchema.safeParse(['A', 'B', 'C']).success).toBe(true)
    expect(topperLinesSchema.safeParse(['A', 'B', 'C', 'D']).success).toBe(false)
    expect(TOPPER_LIMITS.lines).toBe(3)
  })
})

describe('gift message limit (spec §6.2)', () => {
  it('accepts up to 100 chars, rejects 101', () => {
    expect(giftMessageSchema.safeParse('x'.repeat(GIFT_MESSAGE_MAX)).success).toBe(true)
    expect(giftMessageSchema.safeParse('x'.repeat(GIFT_MESSAGE_MAX + 1)).success).toBe(false)
  })
})
