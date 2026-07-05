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
    <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
      {reviews.map((review) => (
        <figure
          key={review.id}
          className="flex w-72 shrink-0 flex-col rounded-2xl bg-blush-50 p-5"
        >
          <div className="text-wine" aria-label={`${review.rating} out of 5 stars`}>
            {'★'.repeat(review.rating)}
            <span className="text-blush-300">{'★'.repeat(Math.max(0, 5 - review.rating))}</span>
          </div>
          <blockquote className="mt-3 flex-1 text-sm text-ink/80">“{review.body}”</blockquote>
          <figcaption className="mt-4 text-sm font-semibold">
            {review.author}
            <span className="ml-2 font-normal text-ink/50">Verified customer</span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
