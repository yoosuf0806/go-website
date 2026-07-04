// Admin reviews — live CRUD for curated Google reviews (spec §7 Reviews, §4
// migration 008). No API sync in v1; admins add and toggle featured/hidden.
import { supabase } from './supabase'

export interface AdminReview {
  id: string
  author: string
  rating: number
  body: string
  source: string
  is_featured: boolean
  is_hidden: boolean
  created_at: string
}

export interface NewReview {
  author: string
  rating: number
  body: string
}

export async function fetchReviews(): Promise<AdminReview[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminReview[]
}

export async function addReview(review: NewReview): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    author: review.author,
    rating: review.rating,
    body: review.body,
    source: 'google',
    is_featured: true,
  })
  if (error) throw new Error(error.message)
}

export async function updateReview(
  id: string,
  patch: Partial<Pick<AdminReview, 'is_featured' | 'is_hidden'>>,
): Promise<void> {
  const { error } = await supabase.from('reviews').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
