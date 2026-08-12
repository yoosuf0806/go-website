// Client-side image cropping for admin uploads. The admin picks a file, frames
// the visible area in ImageCropModal, and we render just that region to a canvas
// and hand back a File — which then flows through the normal resize + upload
// path (see adminProducts.uploadImage / uploadProductMedia).
//
// Cropping is skipped for SVG and GIF: rasterising a vector to a canvas throws
// away its scalability, and rasterising a GIF drops every frame but the first.
// Those pass straight through to upload, matching resizeImage's own passthrough.

/** A crop rectangle in the image's own natural pixels. */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** Longest edge of the cropped output. Uploads downscale again to 1600, but we
 *  cap here too so a huge source photo never allocates a giant canvas. */
const MAX_OUTPUT_EDGE = 1600
const WEBP_QUALITY = 0.9

/**
 * Recommended upload dimensions for a slot of the given aspect (width / height).
 * Uploads downscale the longest edge to MAX_OUTPUT_EDGE and re-encode, so a
 * larger source just gets shrunk — the sweet spot is exactly the long edge at
 * the slot's shape. Used to tell the admin the optimum size before they upload.
 */
export function recommendedSize(aspect: number): { width: number; height: number } {
  return aspect >= 1
    ? { width: MAX_OUTPUT_EDGE, height: Math.round(MAX_OUTPUT_EDGE / aspect) }
    : { width: Math.round(MAX_OUTPUT_EDGE * aspect), height: MAX_OUTPUT_EDGE }
}

/** Human label for the recommended size, e.g. "1600 × 900 px". */
export function recommendedSizeLabel(aspect: number): string {
  const { width, height } = recommendedSize(aspect)
  return `${width} × ${height} px`
}

/** True when the file is a raster image we can safely crop on a canvas. */
export function isCroppable(file: File): boolean {
  return (
    file.type.startsWith('image/') &&
    file.type !== 'image/svg+xml' &&
    file.type !== 'image/gif'
  )
}

/**
 * Crop `crop` (natural pixels) out of an already-loaded image and return it as a
 * WebP File. The output keeps the crop's aspect ratio, with its longest edge
 * capped at MAX_OUTPUT_EDGE.
 */
export function cropToFile(
  image: HTMLImageElement,
  crop: CropRect,
  fileName: string,
): Promise<File> {
  const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(crop.width, crop.height))
  const outW = Math.max(1, Math.round(crop.width * scale))
  const outH = Math.max(1, Math.round(crop.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Could not prepare image for cropping'))

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outW,
    outH,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode cropped image'))
          return
        }
        const base = fileName.replace(/\.[^.]+$/, '') || 'image'
        resolve(new File([blob], `${base}.webp`, { type: 'image/webp' }))
      },
      'image/webp',
      WEBP_QUALITY,
    )
  })
}
