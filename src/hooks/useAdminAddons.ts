import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAddons, updateAddon, type AdminAddon } from '../lib/adminAddons'

export function useAdminAddons() {
  return useQuery({
    queryKey: ['admin', 'addons'],
    queryFn: fetchAddons,
    staleTime: 15_000,
  })
}

export function useUpdateAddon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<AdminAddon, 'price' | 'is_enabled' | 'config'>> }) =>
      updateAddon(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'addons'] }),
  })
}
