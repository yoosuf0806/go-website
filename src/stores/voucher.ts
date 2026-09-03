// Wherever you map status → user-facing message:
const statusMessage: Record<string, string> = {
  invalid: 'That code doesn\'t exist or has been disabled.',
  used:    'That code has already been used.',
  expired: 'That voucher code has expired.',  // ← add this
}
