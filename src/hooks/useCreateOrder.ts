import { useMutation } from '@tanstack/react-query'
import { createOrder, type CreateOrderInput, type CreatedOrder } from '../lib/orders'

// The storefront's only two runtime writes are this order insert and the
// inquiry insert (Phase 6) — everything else is read from catalog.json (spec §8).
export function useCreateOrder() {
  return useMutation<CreatedOrder, Error, CreateOrderInput>({
    mutationFn: createOrder,
  })
}
