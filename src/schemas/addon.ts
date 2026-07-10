import { z } from 'zod'

// Add-on input limits — the single source of truth (spec §8). The storefront
// UI and the checkout zod validation read these, so the topper line limits and
// 100-char gift message are defined once, here.

/**
 * Letter topper: always 3 lines, free and built-in (PR #2 — no longer the
 * paid `letter_topper` addon). The per-line character limit now varies by
 * PACKAGE (packages[].letter_max_chars), not a single global constant:
 *   15pc slab → 7  |  12pc slab → 7  |  15pc box → 5  |  12pc box → 4  |  9pc box → 0 (none)
 * TOPPER_LINES is the one constant that's still fixed across every package.
 */
export const TOPPER_LINES = 3

/** Gift message: free text, 100-char hard limit (§6.2). */
export const GIFT_MESSAGE_MAX = 100

/** One topper line schema for a given per-package char limit, uppercased. Empty is allowed (a blank line). */
export function topperLineSchema(maxCharsPerLine: number) {
  return z
    .string()
    .transform((s) => s.toUpperCase())
    .refine((s) => s.length <= maxCharsPerLine, {
      message: `Max ${maxCharsPerLine} characters per line`,
    })
}

/** Up to 3 topper lines, each within the given package's char limit. */
export function topperLinesSchema(maxCharsPerLine: number) {
  return z.array(topperLineSchema(maxCharsPerLine)).max(TOPPER_LINES, { message: `Max ${TOPPER_LINES} lines` })
}

export const giftMessageSchema = z
  .string()
  .max(GIFT_MESSAGE_MAX, { message: `Max ${GIFT_MESSAGE_MAX} characters` })

/** True if a single topper line is within the given package's character limit. */
export function isValidTopperLine(line: string, maxCharsPerLine: number): boolean {
  return line.length <= maxCharsPerLine
}
