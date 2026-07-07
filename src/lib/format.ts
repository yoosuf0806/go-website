// Formatting helpers: LKR currency, dates, Sri Lankan phone normalisation.
// A single formatLKR() (spec §8, "Rs. 1,250.00" style) is used everywhere,
// including WhatsApp messages, so on-screen and messaged amounts never diverge.

/** Format a number as LKR, e.g. 1250 -> "Rs. 1,250.00". */
export function formatLKR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0
  return `Rs. ${safe.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Format an ISO date (or Date) as a readable delivery date, e.g. "5 Jul 2026".
 * Built from UTC parts so it's locale- and timezone-independent (an ISO
 * date-only string parses as UTC midnight; using UTC avoids an off-by-one day).
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/**
 * Normalise a Sri Lankan phone number to E.164 (`+94XXXXXXXXX`), or return null
 * if it isn't a valid SL number. Accepts local (`07X XXX XXXX` / `0XX…`),
 * `94…`, and `+94…` forms, ignoring spaces, dashes, and brackets.
 * SL subscriber numbers are 9 digits after the country/trunk code.
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null
  const digits = input.replace(/[^\d+]/g, '')

  let national: string
  if (digits.startsWith('+94')) national = digits.slice(3)
  else if (digits.startsWith('94')) national = digits.slice(2)
  else if (digits.startsWith('0')) national = digits.slice(1)
  else national = digits

  // A valid SL subscriber number is 9 digits and (for our uses) starts 1-9.
  if (!/^[1-9]\d{8}$/.test(national)) return null
  return `+94${national}`
}

/** WhatsApp deep links want digits only, no '+': e.g. "94771234567". */
export function toWhatsAppNumber(input: string): string | null {
  const normalised = normalizePhone(input)
  return normalised ? normalised.replace('+', '') : null
}
