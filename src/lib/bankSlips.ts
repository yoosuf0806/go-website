// Bank transfer slip handling. Slips are customer financial documents, so they
// live in the PRIVATE `bank-slips` bucket (migration 026): anon may upload,
// only authenticated admins may read them back via a signed URL.
//
// Unlike product images (public bucket → getPublicUrl), we store the object
// PATH on the order (slip_url column), never a public URL — a public URL to a
// private bucket wouldn't resolve, and we don't want a guessable link anyway.
import { supabase } from './supabase'

const BUCKET = 'bank-slips'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB, matches the checkout hint
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export interface SlipUploadResult {
  /** Object path within the private bucket, stored on orders.slip_url. */
  path: string
}

/** Human-readable guard errors so the checkout UI can show them inline. */
export function validateSlipFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return 'Upload a JPG, PNG or WebP image.'
  if (file.size > MAX_BYTES) return 'File is too large — keep it under 5 MB.'
  return null
}

/**
 * Upload a slip to the private bucket. Returns the object path to store on the
 * order. Throws with a readable message on failure so checkout can offer retry.
 */
export async function uploadBankSlip(file: File): Promise<SlipUploadResult> {
  const guard = validateSlipFile(file)
  if (guard) throw new Error(guard)

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  // Date-prefixed folder keeps the bucket browsable in the Supabase dashboard.
  const day = new Date().toISOString().slice(0, 10)
  const path = `${day}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw new Error(error.message || 'Could not upload the slip. Please try again.')
  return { path }
}

/**
 * Admin-only: turn a stored slip path into a short-lived signed URL for viewing
 * in Admin › Orders. Returns null if there's no slip or the sign fails.
 */
export async function signedSlipUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10)
  if (error || !data) return null
  return data.signedUrl
}
