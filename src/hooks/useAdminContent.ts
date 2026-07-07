import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchContent, updateContent } from '../lib/adminContent'
import type { SiteContent } from '../types/content'

export function useAdminContent() {
  return useQuery({ queryKey: ['admin', 'content'], queryFn: fetchContent, staleTime: 15_000 })
}

export function useUpdateContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: SiteContent) => updateContent(content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'content'] }),
  })
}
