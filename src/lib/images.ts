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
  if (!canTransform(src)) return src
  const base = src.replace(PUBLIC_SEGMENT, RENDER_SEGMENT)
  const join = base.includes('?') ? '&' : '?'
  return `${base}${join}width=${width}&quality=${quality}`
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
