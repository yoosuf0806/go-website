import type { CatalogReview } from '../../types/catalog'

interface ReviewCarouselProps {
  reviews: CatalogReview[]
}

// Featured-review strip (spec §7 Reviews — manual Google-review curation).
// A horizontally scrollable row rather than a JS carousel library — the
// review set is small and this needs no autoplay/index state.
export default function ReviewCarousel({ reviews }: ReviewCarouselProps) {
  if (reviews.length === 0) return null

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="w-72 shrink-0 rounded-lg border border-neutral-200 p-4"
        >
          <div className="text-amber-500" aria-label={`${review.rating} out of 5 stars`}>
            {'★'.repeat(review.rating)}
            {'☆'.repeat(Math.max(0, 5 - review.rating))}
          </div>
          <p className="mt-2 text-sm text-neutral-700">{review.body}</p>
          <p className="mt-2 text-sm font-medium">{review.author}</p>
        </div>
      ))}
    </div>
  )
}
