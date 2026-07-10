import { describe, it, expect } from 'vitest'
import {
  topperLineSchema,
  topperLinesSchema,
  giftMessageSchema,
  isValidTopperLine,
  TOPPER_LINES,
  GIFT_MESSAGE_MAX,
} from './addon'

// PR #2: the topper is free/built-in and its per-line limit now varies by
// package (packages[].letter_max_chars) — exercised here at 5 chars (15pc
// box) and 4 chars (12pc box) to cover two different package limits.
describe('topper line limits (per-package, PR #2)', () => {
  it('uppercases and accepts up to the package limit', () => {
    expect(topperLineSchema(5).parse('abc')).toBe('ABC')
    expect(topperLineSchema(5).parse('happy')).toBe('HAPPY') // exactly 5
  })

  it('rejects lines longer than the package limit', () => {
    expect(topperLineSchema(5).safeParse('sixchr').success).toBe(false)
    expect(isValidTopperLine('sixchr', 5)).toBe(false)
    expect(isValidTopperLine('five5', 5)).toBe(true)
  })

  it('applies a different limit per package (4 chars for 12pc box)', () => {
    expect(topperLineSchema(4).safeParse('four').success).toBe(true)
    expect(topperLineSchema(4).safeParse('fives').success).toBe(false)
    expect(isValidTopperLine('four', 4)).toBe(true)
    expect(isValidTopperLine('fives', 4)).toBe(false)
  })

  it('rejects more than 3 lines regardless of package', () => {
    expect(topperLinesSchema(7).safeParse(['A', 'B', 'C']).success).toBe(true)
    expect(topperLinesSchema(7).safeParse(['A', 'B', 'C', 'D']).success).toBe(false)
    expect(TOPPER_LINES).toBe(3)
  })
})

describe('gift message limit (spec §6.2)', () => {
  it('accepts up to 100 chars', () => {
    expect(giftMessageSchema.safeParse('a'.repeat(100)).success).toBe(true)
  })
  it('rejects over 100 chars', () => {
    expect(giftMessageSchema.safeParse('a'.repeat(101)).success).toBe(false)
    expect(GIFT_MESSAGE_MAX).toBe(100)
  })
})
