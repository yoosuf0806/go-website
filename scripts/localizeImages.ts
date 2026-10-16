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

/** Download one URL to OUT_DIR, returning its local public path (or null on failure). */
async function download(url: string): Promise<string | null> {
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
    return `${PUBLIC_PREFIX}/${file}`
  } catch (err) {
    console.warn(
      `[localize-images] skip ${path} — ${err instanceof Error ? err.message : String(err)}`,
    )
    return null
  }
}

/**
 * Download every Supabase storage image referenced in `catalog` and rewrite the
 * catalogue (in place) to point at the local copies. Returns how many distinct
 * images were localised. No-ops (returns 0) when the catalogue has no storage
 * URLs — e.g. the seed-data build used for local dev.
 */
export async function localizeImages(catalog: unknown): Promise<number> {
  const urls = new Set<string>()
  walkStrings(catalog, (s) => {
    if (s.includes(STORAGE_SEGMENT)) urls.add(s)
  })
  if (urls.size === 0) return 0

  mkdirSync(OUT_DIR, { recursive: true })

  const mapping = new Map<string, string>()
  const queue = [...urls]
  async function worker() {
    for (let url = queue.pop(); url !== undefined; url = queue.pop()) {
      const local = await download(url)
      if (local) mapping.set(url, local)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

  rewriteStrings(catalog, mapping)
  return mapping.size
}
