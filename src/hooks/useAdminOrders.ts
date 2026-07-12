import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchOrders, updateOrderStatus, type OrderFilters } from '../lib/adminOrders'
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

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}
