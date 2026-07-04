import { z } from 'zod'

// Add-on input limits — the single source of truth (spec §8). The storefront
// UI, the checkout zod validation, and (ideally) a DB check all read these, so
// the 5-char topper line and 100-char gift message are defined once, here.

/** Letter topper: 3 lines, ≤5 chars each, uppercase, slab packages only (§6.2). */
export const TOPPER_LIMITS = {
  lines: 3,
  maxCharsPerLine: 5,
} as const

/** Gift message: free text, 100-char hard limit (§6.2). */
export const GIFT_MESSAGE_MAX = 100

/** One topper line: ≤5 chars, uppercased. Empty is allowed (a blank line). */
export const topperLineSchema = z
  .string()
  .transform((s) => s.toUpperCase())
  .refine((s) => s.length <= TOPPER_LIMITS.maxCharsPerLine, {
    message: `Max ${TOPPER_LIMITS.maxCharsPerLine} characters per line`,
  })

/** Up to 3 topper lines. */
export const topperLinesSchema = z
  .array(topperLineSchema)
  .max(TOPPER_LIMITS.lines, { message: `Max ${TOPPER_LIMITS.lines} lines` })

export const giftMessageSchema = z
  .string()
  .max(GIFT_MESSAGE_MAX, { message: `Max ${GIFT_MESSAGE_MAX} characters` })

/** True if a single topper line is within the character limit. */
export function isValidTopperLine(line: string): boolean {
  return line.length <= TOPPER_LIMITS.maxCharsPerLine
}
