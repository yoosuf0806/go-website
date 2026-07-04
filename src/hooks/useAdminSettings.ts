import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchSettings,
  updateSetting,
  type SiteSettings,
} from '../lib/adminSettings'

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchSettings,
    staleTime: 15_000,
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: keyof SiteSettings; value: SiteSettings[keyof SiteSettings] }) =>
      updateSetting(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  })
}
