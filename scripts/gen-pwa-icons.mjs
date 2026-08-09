// Generate PWA icons for the two installable portals (Kitchen, Admin).
// Distinct colours so the two home-screen apps are told apart at a glance:
//   Kitchen — pink background   Admin — navy background
// Each app gets a 192 + 512 "any" icon and a 512 "maskable" icon (extra safe
// padding so Android's mask can't clip the wordmark). Run: node scripts/gen-pwa-icons.mjs
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/icons')
mkdirSync(OUT, { recursive: true })

const PINK = '#d92d56'
const NAVY = '#1a0a00'

// safeScale: fraction of the canvas the text block occupies (maskable uses a
// smaller block so the mask's safe zone never clips it).
function svg({ bg, fg, accent, label, safeScale }) {
  const s = 512
  const eyebrowSize = 44 * safeScale
  const labelSize = 96 * safeScale
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="${bg}"/>
  <g text-anchor="middle" font-family="Georgia, 'Times New Roman', serif">
    <text x="${s / 2}" y="${s / 2 - 34}" fill="${accent}" font-size="${eyebrowSize}" font-style="italic" letter-spacing="2">golden oven</text>
    <text x="${s / 2}" y="${s / 2 + 62}" fill="${fg}" font-size="${labelSize}" font-weight="700" letter-spacing="3">${label}</text>
  </g>
</svg>`
}

const apps = [
  { name: 'kitchen', bg: PINK, fg: '#ffffff', accent: 'rgba(255,255,255,0.85)', label: 'KITCHEN' },
  { name: 'admin', bg: NAVY, fg: '#ffffff', accent: PINK, label: 'ADMIN' },
]

for (const app of apps) {
  const any = Buffer.from(svg({ ...app, safeScale: 1 }))
  const maskable = Buffer.from(svg({ ...app, safeScale: 0.72 }))
  await sharp(any).resize(192, 192).png().toFile(resolve(OUT, `${app.name}-192.png`))
  await sharp(any).resize(512, 512).png().toFile(resolve(OUT, `${app.name}-512.png`))
  await sharp(maskable).resize(512, 512).png().toFile(resolve(OUT, `${app.name}-maskable-512.png`))
  console.log(`[pwa-icons] wrote ${app.name} icons`)
}
