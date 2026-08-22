// Delivery time slots (migration 038).
//
// The DB stores stable codes ('10-11' | '16-18'), never display text, so the
// wording below can change without a data migration and so slots sort
// chronologically by code. Everything that shows a slot — checkout, admin,
// kitchen, the schedule calendars — reads its label from here, so there is one
// source of truth for the times we promise customers.

export const DELIVERY_SLOTS = [
  { code: '10-11', label: '10:00 AM – 11:00 AM', short: '10–11 AM' },
  { code: '16-18', label: '4:00 PM – 6:00 PM', short: '4–6 PM' },
] as const

export type DeliverySlotCode = (typeof DELIVERY_SLOTS)[number]['code']

export const DELIVERY_SLOT_CODES = DELIVERY_SLOTS.map((s) => s.code) as readonly DeliverySlotCode[]

// Shown under the slot picker at checkout, and worth repeating anywhere we ask
// for a slot: outstation deliveries can't hold to a slot window.
export const OUT_OF_COLOMBO_NOTE =
  'Out of Colombo orders will be delivered on or before 6pm on the requested date, on weekdays.'

export function isDeliverySlot(v: string | null | undefined): v is DeliverySlotCode {
  return !!v && (DELIVERY_SLOT_CODES as readonly string[]).includes(v)
}

/** Full label, e.g. "4:00 PM – 6:00 PM". Falls back to a dash for no slot. */
export function slotLabel(code: string | null | undefined): string {
  return DELIVERY_SLOTS.find((s) => s.code === code)?.label ?? '—'
}

/** Compact label for dense UI (calendar cells, chips), e.g. "4–6 PM". */
export function slotShort(code: string | null | undefined): string {
  return DELIVERY_SLOTS.find((s) => s.code === code)?.short ?? 'No time set'
}

/**
 * Sort key so a day's deliveries read in chronological order. Orders with no
 * slot (placed before slots existed, or created by admin) sort last rather
 * than silently jumping to the top.
 */
export function slotRank(code: string | null | undefined): number {
  const i = DELIVERY_SLOTS.findIndex((s) => s.code === code)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}
