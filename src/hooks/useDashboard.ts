import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../lib/adminDashboard'
import { deliveryTiers } from '../data/catalog'

// Live dashboard stats (spec §8 admin uses React Query live). Delivery tiers
// come from the build-time snapshot — they change rarely and only via a rebuild.
export function useDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => fetchDashboardStats(deliveryTiers),
    staleTime: 15_000,
  })
}
