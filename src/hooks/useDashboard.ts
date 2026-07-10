import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../lib/adminDashboard'
import { useCatalog } from '../contexts/CatalogContext'

// Live dashboard stats (spec §8 admin uses React Query live). Delivery tiers
// come from the live catalogue via CatalogProvider.
export function useDashboard() {
  const { catalog } = useCatalog()
  const deliveryTiers = catalog.deliveryTiers
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => fetchDashboardStats(deliveryTiers),
    staleTime: 15_000,
  })
}
