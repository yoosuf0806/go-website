/// <reference types="node" />
// Same-origin image proxy (see src/lib/images.ts for the why).
//
// Product & content images live in Supabase Storage on a different host
// (…supabase.co). Serving them from there means (a) a third-party request that
// some visitors' networks/browsers block — they see the page but no images — and
// (b) every view burns the Supabase project's storage-egress quota, after which
// Supabase returns errors for everyone. This endpoint re-serves those objects
// from the site's OWN origin and lets Vercel's edge cache absorb the traffic.
//
// It only ever fetches OUR Supabase project: the caller passes the object path
// (everything after `/storage/v1/`) and we append it to the server-configured
// SUPABASE_URL, so this can't be turned into an open proxy.
export const config = { runtime: 'edge' }

const ONE_YEAR = 60 * 60 * 24 * 365

export default async function handler(req: Request): Promise<Response> {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.replace(/\/+$/, '')
  if (!supabaseUrl) return new Response('Image proxy not configured', { status: 500 })

  const url = new URL(req.url)
  // e.g. "object/public/product-images/content/<uuid>.webp"
  const path = url.searchParams.get('path') ?? ''
  if (!path || path.startsWith('/') || path.includes('..')) {
    return new Response('Bad request', { status: 400 })
  }

  // Forward only the safe Supabase image-transform params; ignore anything else.
  const forwarded = new URLSearchParams()
  for (const key of ['width', 'height', 'quality', 'resize', 'format']) {
    const v = url.searchParams.get(key)
    if (v) forwarded.set(key, v)
  }
  const qs = forwarded.toString()
  const target = `${supabaseUrl}/storage/v1/${path}${qs ? `?${qs}` : ''}`

  let upstream: Response
  try {
    upstream = await fetch(target, { headers: { accept: req.headers.get('accept') ?? 'image/*,*/*' } })
  } catch {
    return new Response('Upstream fetch failed', { status: 502 })
  }
  if (!upstream.ok || !upstream.body) {
    return new Response('Image not found', { status: upstream.status || 502 })
  }

  const headers = new Headers()
  headers.set('content-type', upstream.headers.get('content-type') ?? 'image/webp')
  // Objects are content-hashed (UUID filenames) and effectively immutable, so
  // cache hard in the browser AND at the Vercel edge — repeat views then never
  // touch Supabase again.
  headers.set('cache-control', `public, max-age=${ONE_YEAR}, s-maxage=${ONE_YEAR}, immutable`)
  const len = upstream.headers.get('content-length')
  if (len) headers.set('content-length', len)
  return new Response(upstream.body, { status: 200, headers })
}
