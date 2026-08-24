// Regenerate the STOREFRONT favicons from public/logo.png (the wordmark).
//
// Not to be confused with gen-pwa-icons.mjs, which builds the separate
// home-screen icons for the Kitchen and Admin portals (public/icons/*) — those
// are deliberately different marks and this script does not touch them.
//
// Crops the logo tight to its ink, then centres it on a square canvas with a
// small even margin, so every size is the same crop rather than each one being
// scaled differently.
//
// One-off tooling — run after replacing public/logo.png:
//   npm i -D sharp && node scripts/gen-favicons.mjs
//
// Then bump the ?v= cache-buster on the icon links in index.html, or visitors
// keep seeing the previous mark: browsers cache favicons far longer than the
// 1-day Cache-Control that vercel.json sets on them.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'public/logo.png')
const OUT = resolve(ROOT, 'public')

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const PAD = 0.06 // margin as a fraction of the wordmark's long side

// Flatten onto white (the logo ships with transparency), then trim the uniform
// border down to the ink.
const ink = await sharp(SRC)
  .flatten({ background: WHITE })
  .trim({ threshold: 10 })
  .toBuffer({ resolveWithObject: true })

const { width, height } = ink.info
const side = Math.round(Math.max(width, height) * (1 + PAD * 2))

const square = await sharp({
  create: { width: side, height: side, channels: 4, background: WHITE },
})
  .composite([
    {
      input: ink.data,
      top: Math.round((side - height) / 2),
      left: Math.round((side - width) / 2),
    },
  ])
  .png()
  .toBuffer()

const sizes = {
  'icon-32.png': 32,
  'icon-48.png': 48,
  'icon-96.png': 96,
  'icon-192.png': 192,
  'icon-512.png': 512,
  'apple-touch-icon.png': 180,
}

// Flattened to RGB: the mark sits on an opaque white field regardless, and iOS
// renders an apple-touch-icon with an alpha channel unpredictably.
for (const [name, size] of Object.entries(sizes)) {
  await sharp(square).resize(size, size).flatten({ background: WHITE }).png().toFile(resolve(OUT, name))
}

// favicon.ico — sharp has no .ico encoder, so write a minimal ICO container
// wrapping 16/32/48 PNGs (the PNG-in-ICO form every current browser reads).
const entries = await Promise.all(
  [16, 32, 48].map(async (s) => ({ s, png: await sharp(square).resize(s, s).png().toBuffer() })),
)
const header = Buffer.alloc(6 + 16 * entries.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(entries.length, 4)
let offset = header.length
entries.forEach(({ s, png }, i) => {
  const d = 6 + 16 * i
  header.writeUInt8(s === 256 ? 0 : s, d)
  header.writeUInt8(s === 256 ? 0 : s, d + 1)
  header.writeUInt8(0, d + 2) // palette
  header.writeUInt8(0, d + 3) // reserved
  header.writeUInt16LE(1, d + 4) // colour planes
  header.writeUInt16LE(32, d + 6) // bits per pixel
  header.writeUInt32LE(png.length, d + 8)
  header.writeUInt32LE(offset, d + 12)
  offset += png.length
})
writeFileSync(resolve(OUT, 'favicon.ico'), Buffer.concat([header, ...entries.map((e) => e.png)]))

// icon.svg is what SVG-capable browsers prefer. It used to draw a "go" monogram
// as live text; embed the wordmark raster instead so it can't drift from the
// PNG set.
const b64 = readFileSync(resolve(OUT, 'icon-512.png')).toString('base64')
writeFileSync(
  resolve(OUT, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 512 512" width="512" height="512">
  <title>Golden Oven</title>
  <image x="0" y="0" width="512" height="512" xlink:href="data:image/png;base64,${b64}"/>
</svg>
`,
)

console.log(
  `[gen-favicons] wrote ${Object.keys(sizes).length} PNGs + favicon.ico + icon.svg ` +
    `from a ${width}x${height} wordmark on a ${side}px square.`,
)
