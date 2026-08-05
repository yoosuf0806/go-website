// Regenerate public/logo-mark.png from public/logo.png by trimming the uniform
// white border down to the wordmark and re-padding with a small even margin,
// so the header can render it with a plain object-contain (cleanly centered).
//
// One-off tooling — run after replacing public/logo.png:
//   npm i -D sharp && node scripts/trim-logo.mjs
import sharp from 'sharp'

const SRC = 'public/logo.png'
const OUT = 'public/logo-mark.png'

const trimmed = await sharp(SRC).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true })
const margin = Math.round(trimmed.info.height * 0.12)

await sharp(trimmed.data)
  .extend({ top: margin, bottom: margin, left: margin, right: margin, background: { r: 255, g: 255, b: 255 } })
  .toFile(OUT)

console.log(`[trim-logo] wrote ${OUT}`)
