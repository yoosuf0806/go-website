// Order status progression (spec §7 Orders, migration 006 order_status enum).
// Linear flow with a cancel available from any non-terminal state. Kept pure so
// the admin UI and tests share one definition of "what comes next".

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'baking',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

// The forward progression, excluding the terminal 'cancelled'/'completed'.
const FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'baking',
  'ready',
  'out_for_delivery',
  'completed',
]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  baking: 'Baking',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** The next status in the forward flow, or null if there is none (completed/cancelled). */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = FLOW.indexOf(status)
  if (i === -1 || i === FLOW.length - 1) return null
  return FLOW[i + 1]
}

/** An order can be cancelled from any state that isn't already terminal. */
export function canCancel(status: OrderStatus): boolean {
  return status !== 'completed' && status !== 'cancelled'
}
