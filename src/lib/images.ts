import type { SyntheticEvent } from 'react'

// Central image-URL helper. Golden Oven's product and content images are stored
// in Supabase Storage. This module decides the URL the browser actually loads:
//   • responsive, right-sized AVIF/WebP variants via Vercel Image Optimization
//     (imageUrl / imageSrcSet), the big load-time win — see below;
//   • a same-origin proxy for the base `src` (cdnUrl), so images are never a
//     blockable third-party request and Supabase egress is offloaded;
//   • a graceful onError fallback (imgError) so a broken variant/proxy can never
//     leave an image blank — it degrades to serving straight from Supabase.

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

// Vercel Image Optimization endpoint. On the deployed site this fetches the
// source image (our Supabase storage URL, allow-listed in vercel.json's
// `images.remotePatterns`), resizes it to the requested width, serves it as
// AVIF/WebP, and caches every variant at Vercel's edge. This is what makes a
// grid tile download a ~400px image instead of the full 1280px upload — the
// single biggest load-time win — and it also collapses Supabase egress because
// Vercel fetches each source only once. Uploads are still stored at up to
// 1280px (see adminProducts.resizeImage); this shrinks them per-device on read.
//
// Enabled only on the real deployment (the endpoint doesn't exist in dev/preview)
// and only when no explicit external CDN base is configured. When off,
// imageSrcSet returns undefined and the browser just loads the base `src`
// (the same-origin proxy / original), so nothing breaks locally. `q` is left to
// Vercel's default so we don't depend on an image-quality allow-list.
const OPTIMIZER_PATH = '/_vercel/image'
const USE_OPTIMIZER = import.meta.env.PROD && !CDN_BASE

/** True when `src` is a storage image we can route through the Vercel optimizer. */
export function canTransform(src: string | null | undefined): src is string {
  return USE_OPTIMIZER && typeof src === 'string' && src.includes(STORAGE_SEGMENT)
}

/** A single resized variant URL (returns the un-resized proxied/original URL when off). */
export function imageUrl(src: string, width: number): string {
  if (!canTransform(src)) return cdnUrl(src)
  return `${OPTIMIZER_PATH}?url=${encodeURIComponent(src)}&w=${width}`
}

/** A `srcset` string across the given widths, or undefined when optimization is off. */
export function imageSrcSet(src: string | null | undefined, widths: number[]): string | undefined {
  if (!canTransform(src)) return undefined
  return widths.map((w) => `${imageUrl(src, w)} ${w}w`).join(', ')
}
