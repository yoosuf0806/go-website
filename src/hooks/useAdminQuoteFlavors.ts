import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchQuoteFlavors,
  createQuoteFlavor,
  updateQuoteFlavor,
  deleteQuoteFlavor,
  type QuoteFlavorInput,
} from '../lib/adminQuoteFlavors'

export function useAdminQuoteFlavors() {
  return useQuery({
    queryKey: ['admin', 'quote-flavors'],
    queryFn: fetchQuoteFlavors,
    staleTime: 15_000,
  })
}

export function useQuoteFlavorMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'quote-flavors'] })

  const add = useMutation({ mutationFn: (input: QuoteFlavorInput) => createQuoteFlavor(input), onSuccess: invalidate })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<QuoteFlavorInput> }) => updateQuoteFlavor(id, patch),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteQuoteFlavor(id), onSuccess: invalidate })

  return { add, update, remove }
}
