import { useState } from 'react'
import { useAdminReviews, useReviewMutations } from '../../hooks/useAdminReviews'
import { useAdminSettings } from '../../hooks/useAdminSettings'
import type { AdminReview } from '../../lib/adminReviews'

// Admin Reviews (spec §7): manual Google-review curation — add, toggle
// featured/hidden, and link out to Google My Business.
export default function Reviews() {
  const { data: reviews, isLoading, isError, error } = useAdminReviews()
  const { data: settings } = useAdminSettings()
  const { add, update, remove } = useReviewMutations()

  const [author, setAuthor] = useState('')
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')

  const googleUrl = settings?.business.google_business_url

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!author.trim() || !body.trim()) return
    add.mutate(
      { author: author.trim(), rating, body: body.trim() },
      {
        onSuccess: () => {
          setAuthor('')
          setBody('')
          setRating(5)
        },
      },
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reviews</h1>
        {googleUrl && (
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-700 hover:underline"
          >
            Google My Business ↗
          </a>
        )}
      </div>

      <form onSubmit={handleAdd} className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Add a review</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
            />
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="rounded border border-neutral-300 px-2 py-2 text-sm"
              aria-label="Rating"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} ★
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Review text"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          {add.isError && <p className="text-sm text-red-600">{add.error.message}</p>}
          <button
            type="submit"
            disabled={add.isPending}
            className="self-start rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {add.isPending ? 'Adding…' : 'Add review'}
          </button>
        </div>
      </form>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading reviews…</p>}
      {isError && (
        <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load reviews: {error.message}
        </p>
      )}

      {reviews && reviews.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {reviews.map((review) => (
            <ReviewRow
              key={review.id}
              review={review}
              onToggle={(patch) => update.mutate({ id: review.id, patch })}
              onDelete={() => remove.mutate(review.id)}
              busy={update.isPending || remove.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ReviewRow({
  review,
  onToggle,
  onDelete,
  busy,
}: {
  review: AdminReview
  onToggle: (patch: Partial<Pick<AdminReview, 'is_featured' | 'is_hidden'>>) => void
  onDelete: () => void
  busy: boolean
}) {
  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-amber-500">
            {'★'.repeat(review.rating)}
            {'☆'.repeat(Math.max(0, 5 - review.rating))}
          </p>
          <p className="mt-1 text-sm text-neutral-700">{review.body}</p>
          <p className="mt-1 text-sm font-medium">{review.author}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle({ is_featured: !review.is_featured })}
          className={`rounded border px-2 py-1 text-xs disabled:opacity-50 ${
            review.is_featured
              ? 'border-amber-600 bg-amber-600 text-white'
              : 'border-neutral-300 hover:bg-neutral-100'
          }`}
        >
          {review.is_featured ? 'Featured' : 'Not featured'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle({ is_hidden: !review.is_hidden })}
          className={`rounded border px-2 py-1 text-xs disabled:opacity-50 ${
            review.is_hidden
              ? 'border-neutral-600 bg-neutral-600 text-white'
              : 'border-neutral-300 hover:bg-neutral-100'
          }`}
        >
          {review.is_hidden ? 'Hidden' : 'Visible'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded border border-neutral-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  )
}
