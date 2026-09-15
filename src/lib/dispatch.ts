// Order dispatch: the courier list-of-values shared by the admin + kitchen
// dispatch modals, and the RPC call that records the courier + tracking and
// moves the order to 'out_for_delivery'. The DB (dispatch_order, migration 052)
// re-validates everything; this is the client half.
import { supabase } from './supabase'

export type DeliveryProvider = 'promptxpress' | 'pickme_flash'

// LOV for the delivery-method picker. `handle` names the field staff fill in
// for that courier: a tracking number vs a tracking link.
export const DELIVERY_PROVIDERS: {
  value: DeliveryProvider
  label: string
  handle: 'number' | 'url'
  inputLabel: string
  placeholder: string
}[] = [
  {
    value: 'promptxpress',
    label: 'PromptXpress',
    handle: 'number',
    inputLabel: 'Tracking number',
    placeholder: 'e.g. PX123456789',
  },
  {
    value: 'pickme_flash',
    label: 'PickMe Flash',
    handle: 'url',
    inputLabel: 'Tracking link',
    placeholder: 'https://…',
  },
]

export function providerLabel(provider: DeliveryProvider | null | undefined): string {
  return DELIVERY_PROVIDERS.find((p) => p.value === provider)?.label ?? ''
}

export interface DispatchInput {
  orderId: string
  provider: DeliveryProvider
  /** For PromptXpress. */
  trackingNumber?: string | null
  /** For PickMe Flash. */
  trackingUrl?: string | null
}

// Record the courier + tracking and move the order to 'out_for_delivery'. Goes
// through the dispatch_order RPC so both admin and kitchen can call it (kitchen
// has no direct UPDATE on orders — the split is enforced in the database).
export async function dispatchOrder(input: DispatchInput): Promise<void> {
  const { error } = await supabase.rpc('dispatch_order', {
    p_id: input.orderId,
    p_provider: input.provider,
    p_tracking_number: input.trackingNumber ?? null,
    p_tracking_url: input.trackingUrl ?? null,
  })
  if (error) throw new Error(error.message)
}
