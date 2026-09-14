import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchOrders,
  updateOrderStatus,
  confirmOrderPayment,
  updateKitchenNote,
  updateOrderItems,
  type OrderFilters,
  type OrderItemEdit,
} from '../lib/adminOrders'
import type { OrderStatus } from '../lib/orderStatus'

// Admin order list, live from Supabase with a short staleTime (spec §8). Status
// mutations invalidate the list so the admin UI stays fresh.
export function useAdminOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: () => fetchOrders(filters),
    staleTime: 15_000,
  })
}

// All orders, unfiltered — the 3-tab Orders view buckets them client-side and
// needs the full history to compute the repeat-customer flag.
export function useAllAdminOrders() {
  return useQuery({
    queryKey: ['admin', 'orders', 'all'],
    queryFn: () => fetchOrders({}),
    staleTime: 15_000,
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}

// Save the admin's private note to the kitchen for one order. Invalidates the
// kitchen board so the note appears there immediately.
export function useUpdateKitchenNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => updateKitchenNote(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}

// Save the admin's manual line-item edits (qty + unit price, add/remove lines).
// Recomputes order totals server-side; invalidates admin + kitchen views.
export function useUpdateOrderItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      items,
      deliveryFee,
    }: {
      orderId: string
      items: OrderItemEdit[]
      deliveryFee: number
    }) => updateOrderItems(orderId, items, deliveryFee),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}

// Confirm a bank-transfer payment (admin verified the slip). Invalidates the
// kitchen board too, since confirming payment is what surfaces the job there.
export function useConfirmOrderPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => confirmOrderPayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}
