import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchReviews,
  addReview,
  updateReview,
  deleteReview,
  type AdminReview,
  type NewReview,
} from '../lib/adminReviews'

export function useAdminReviews() {
  return useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: fetchReviews,
    staleTime: 15_000,
  })
}

export function useReviewMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'reviews'] })

  const add = useMutation({ mutationFn: (review: NewReview) => addReview(review), onSuccess: invalidate })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<AdminReview, 'is_featured' | 'is_hidden'>> }) =>
      updateReview(id, patch),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteReview(id), onSuccess: invalidate })

  return { add, update, remove }
}
