import type { SyntheticEvent } from 'react'

// Central image-URL helper. Golden Oven's product and content images are served
// from Supabase Storage public URLs. On a PAID Supabase plan you can serve
// right-sized, compressed variants straight from the CDN (Shopify-style
// `?width=` responsive images) by setting VITE_IMAGE_CDN=supabase in the deploy
// env — a grid tile then downloads a ~400px image instead of the full 1600px
// upload, which is the single biggest first-load win.
//
// It is OFF by default because Supabase's image-transform endpoint is a paid
// feature: on the Free plan those URLs return an error, so we serve the original
// public URL untouched. BrownieImage (and the hero/slideshow images) also fall
// back to the original URL if a transform ever fails, so flipping the flag on
// can never leave an image broken — worst case it serves the full-size original.
const CDN_ENABLED = import.meta.env.VITE_IMAGE_CDN === 'supabase'

// Optional image CDN in front of Supabase Storage (e.g. Cloudflare). When
// VITE_IMAGE_CDN_BASE is set to your CDN origin (e.g. https://cdn.example.com),
// every storage URL is rewritten to be served THROUGH that host instead of
// hitting Supabase directly — so the CDN's edge cache absorbs the traffic and
// it no longer counts against the Supabase project's egress. The CDN must
// reverse-proxy `/storage/v1/*` to the Supabase project (see
// docs/cloudflare-image-cdn.md). Unset → images are served straight from
// Supabase, unchanged.
const CDN_BASE = (import.meta.env.VITE_IMAGE_CDN_BASE as string | undefined)?.replace(/\/+$/, '')
const STORAGE_SEGMENT = '/storage/v1/'

// Same-origin image proxy (api/img.ts). Product & content images live in
// Supabase Storage on a DIFFERENT host (…supabase.co). That split origin is why
// some visitors see the whole page but no pictures: ad blockers, privacy
// browsers, and some ISP/corporate/mobile networks block the third-party
// Supabase host while the site's own domain loads fine — and serving straight
// from Supabase also burns the project's storage-egress quota, after which
// Supabase returns errors for everyone. So in production, when no explicit CDN
// host is configured, we rewrite storage URLs to `/api/img?path=…` — served from
// the site's OWN origin (no third-party request) and cached hard at Vercel's
// edge, which also collapses Supabase egress. If the proxy ever fails, `imgError`
// below reloads the untouched Supabase URL, so an image can never end up broken.
//
// Left off in dev/preview (no serverless functions there) — images load direct.
const PROXY_PATH = '/api/img'
const USE_PROXY = import.meta.env.PROD && !CDN_BASE

/**
 * Route a Supabase storage URL through the configured image host. Precedence:
 *   1. VITE_IMAGE_CDN_BASE (an external CDN, e.g. Cloudflare) if set;
 *   2. otherwise the same-origin `/api/img` proxy in production;
 *   3. otherwise the untouched URL (dev, or non-storage/nullish values).
 */
export function cdnUrl(src: string): string
export function cdnUrl(src: null | undefined): null | undefined
export function cdnUrl(src: string | null | undefined): string | null | undefined {
  if (typeof src !== 'string') return src
  const i = src.indexOf(STORAGE_SEGMENT)
  if (i === -1) return src
  if (CDN_BASE) return CDN_BASE + src.slice(i)
  if (USE_PROXY) return `${PROXY_PATH}?path=${encodeURIComponent(src.slice(i + STORAGE_SEGMENT.length))}`
  return src
}

/**
 * `<img onError>` handler for any image whose `src` came from `cdnUrl`. It first
 * drops a failed responsive `srcSet` so the browser retries the base `src`; if
 * that also fails and a `data-fallback-src` (the original, un-proxied Supabase
 * URL) is present, it reloads from there. Net effect: a broken CDN/proxy can
 * never leave a blank image — it degrades to serving straight from Supabase.
 */
export function imgError(e: SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget
  if (img.srcset) {
    img.srcset = ''
    img.sizes = ''
    return
  }
  const fallback = img.getAttribute('data-fallback-src')
  if (fallback && img.dataset.fellBack !== '1' && img.src !== fallback) {
    img.dataset.fellBack = '1'
    img.src = fallback
  }
}

// Supabase public object URLs look like:
//   https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
// The on-the-fly transform endpoint is the same path with `object` → `render/image`:
//   https://<proj>.supabase.co/storage/v1/render/image/public/<bucket>/<path>?width=…
const PUBLIC_SEGMENT = '/storage/v1/object/public/'
const RENDER_SEGMENT = '/storage/v1/render/image/public/'

/** True when `src` is a Supabase public-storage URL we know how to transform. */
export function canTransform(src: string | null | undefined): src is string {
  return CDN_ENABLED && typeof src === 'string' && src.includes(PUBLIC_SEGMENT)
}

/** A single resized variant URL (returns the original untouched when CDN is off). */
export function imageUrl(src: string, width: number, quality = 70): string {
  if (!canTransform(src)) return cdnUrl(src)
  const base = src.replace(PUBLIC_SEGMENT, RENDER_SEGMENT)
  const join = base.includes('?') ? '&' : '?'
  return cdnUrl(`${base}${join}width=${width}&quality=${quality}`)
}

/** A `srcset` string across the given widths, or undefined when CDN is off. */
export function imageSrcSet(
  src: string | null | undefined,
  widths: number[],
  quality = 70,
): string | undefined {
  if (!canTransform(src)) return undefined
  return widths.map((w) => `${imageUrl(src, w, quality)} ${w}w`).join(', ')
}
