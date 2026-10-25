/**
 * Build-time image localisation.
 *
 * The storefront's product & content images live in Supabase Storage on a
 * different host. Loading them at runtime means every visitor's browser makes a
 * cross-origin request to Supabase — which adds latency (Supabase can be slow to
 * respond, especially cold) and burns the project's storage-egress quota.
 *
 * This module runs during the build-time snapshot (see snapshot.ts): it finds
 * every Supabase storage URL anywhere in the catalogue, downloads each one into
 * `public/catalog-images/`, and rewrites the URL in the catalogue to the local
 * path (`/catalog-images/<hash>.<ext>`). Those files are then bundled into the
 * deploy by Vite, so the browser loads images from the site's OWN origin —
 * served from Vercel's edge, never touching Supabase at runtime. Vercel Image
 * Optimization still right-sizes them per device (see src/lib/images.ts), so we
 * keep the responsive win on top of the no-Supabase win.
 *
 * Filenames are a content hash of the storage path, so an unchanged image keeps
 * the same local name across builds (stable, cacheable). The whole step is
 * best-effort per image: if a download fails, that one URL is left pointing at
 * Supabase (the existing proxy/optimizer fallback still handles it), so a single
 * bad asset can never fail the build.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Where downloaded images land. Under public/ so Vite copies them into dist/.
// Gitignored and regenerated on every snapshot, exactly like catalog.json.
const OUT_DIR = resolve(__dirname, '../public/catalog-images')
// The public URL prefix the storefront loads them from (must match OUT_DIR's
// path under public/ and the LOCAL_IMAGE_PREFIX in src/lib/images.ts).
const PUBLIC_PREFIX = '/catalog-images'

// Marks a Supabase Storage URL. Kept in sync with src/lib/images.ts.
const STORAGE_SEGMENT = '/storage/v1/'

// How many images to download at once.
const CONCURRENCY = 8

// Blur-up placeholder (LQIP): a tiny, heavily-compressed WebP of each image,
// inlined as a base64 data URI into the catalogue. The storefront paints it as
// a CSS background behind the real <img> (see src/lib/images.ts → blurDataUrl),
// so a blurred preview of every photo shows INSTANTLY — zero network, straight
// from the HTML/JS — and the full image sharpens in on top once it arrives.
// This is the "load like other sites" win: no blank/flat box while a photo
// downloads. Kept intentionally tiny (a ~24px-wide WebP is a few hundred bytes)
// so the data URIs baked into catalog.json stay cheap.
const PLACEHOLDER_WIDTH = 24
const PLACEHOLDER_QUALITY = 45

// Map a content-type to a file extension, used when the storage path has none.
const EXT_BY_TYPE: Record<string, string> = {
  'image/avif': '.avif',
  'image/webp': '.webp',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
}

/** The stable storage path of a URL (after `/storage/v1/`, query stripped). */
function storagePath(url: string): string | null {
  const i = url.indexOf(STORAGE_SEGMENT)
  if (i === -1) return null
  const rest = url.slice(i + STORAGE_SEGMENT.length)
  const q = rest.indexOf('?')
  return q === -1 ? rest : rest.slice(0, q)
}

/** Walk any JSON-ish value, calling `visit` on every string. */
function walkStrings(node: unknown, visit: (s: string) => void): void {
  if (typeof node === 'string') {
    visit(node)
  } else if (Array.isArray(node)) {
    for (const item of node) walkStrings(item, visit)
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) walkStrings(v, visit)
  }
}

/** Rewrite every string in `node` (in place) using `mapping`. Returns the node. */
function rewriteStrings<T>(node: T, mapping: Map<string, string>): T {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = rewriteStrings(node[i], mapping)
    return node
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    for (const key of Object.keys(obj)) obj[key] = rewriteStrings(obj[key], mapping)
    return node
  }
  if (typeof node === 'string' && mapping.has(node)) {
    return mapping.get(node) as unknown as T
  }
  return node
}

/**
 * A tiny blurred WebP data URI for `buf`, or null if it can't be rasterised
 * (e.g. an SVG icon or an unexpected file). Best-effort: a placeholder is a
 * nice-to-have, never a reason to fail the localisation of an otherwise-good
 * image.
 */
async function makePlaceholder(buf: Buffer): Promise<string | null> {
  try {
    const out = await sharp(buf)
      .resize(PLACEHOLDER_WIDTH, PLACEHOLDER_WIDTH, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: PLACEHOLDER_QUALITY })
      .toBuffer()
    return `data:image/webp;base64,${out.toString('base64')}`
  } catch {
    return null
  }
}

interface Localized {
  /** The site-origin path the catalogue is rewritten to (`/catalog-images/…`). */
  local: string
  /** The stable storage path (after `/storage/v1/`), used as a placeholder key. */
  storagePath: string
  /** Blur-up data URI, or null when the image couldn't be rasterised. */
  placeholder: string | null
}

/** Download one URL to OUT_DIR, returning its local path + blur placeholder (or null on failure). */
async function download(url: string): Promise<Localized | null> {
  const path = storagePath(url)
  if (!path) return null
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[localize-images] skip ${path} — HTTP ${res.status}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const hash = createHash('sha1').update(path).digest('hex').slice(0, 16)
    const ext =
      extname(path).toLowerCase() || EXT_BY_TYPE[res.headers.get('content-type') ?? ''] || '.img'
    const file = `${hash}${ext}`
    writeFileSync(resolve(OUT_DIR, file), buf)
    const placeholder = await makePlaceholder(buf)
    return { local: `${PUBLIC_PREFIX}/${file}`, storagePath: path, placeholder }
  } catch (err) {
    console.warn(
      `[localize-images] skip ${path} — ${err instanceof Error ? err.message : String(err)}`,
    )
    return null
  }
}

/** Outcome of localising a catalogue's images. */
export interface LocalizeResult {
  /** How many distinct images were downloaded and rewritten to a local path. */
  count: number
  /**
   * Blur-up placeholders, keyed by BOTH the baked local path (what the snapshot
   * rewrites the catalogue to, used on first paint) AND the stable storage path
   * (what a live Supabase URL resolves to after CatalogProvider swaps in current
   * data). Either key lets the storefront find the same placeholder. See
   * src/lib/images.ts → blurDataUrl.
   */
  placeholders: Record<string, string>
}

/**
 * Download every Supabase storage image referenced in `catalog` and rewrite the
 * catalogue (in place) to point at the local copies, building a blur-up
 * placeholder for each. No-ops (empty result) when the catalogue has no storage
 * URLs — e.g. the seed-data build used for local dev.
 */
export async function localizeImages(catalog: unknown): Promise<LocalizeResult> {
  const urls = new Set<string>()
  walkStrings(catalog, (s) => {
    if (s.includes(STORAGE_SEGMENT)) urls.add(s)
  })
  if (urls.size === 0) return { count: 0, placeholders: {} }

  mkdirSync(OUT_DIR, { recursive: true })

  const mapping = new Map<string, string>()
  const placeholders: Record<string, string> = {}
  const queue = [...urls]
  async function worker() {
    for (let url = queue.pop(); url !== undefined; url = queue.pop()) {
      const result = await download(url)
      if (!result) continue
      mapping.set(url, result.local)
      if (result.placeholder) {
        // Key by both forms the URL can take at runtime so a lookup hits
        // regardless of whether the catalogue was served from the bake or
        // refetched live from Supabase.
        placeholders[result.local] = result.placeholder
        placeholders[result.storagePath] = result.placeholder
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

  rewriteStrings(catalog, mapping)
  return { count: mapping.size, placeholders }
}
