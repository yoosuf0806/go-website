/**
 * Build-time catalogue snapshot (spec §2, §8).
 *
 * Reads all catalogue data and writes it to src/data/catalog.json, which the
 * storefront imports directly — zero DB reads while a customer browses.
 *
 * Two modes:
 *   • Supabase  — when SUPABASE_URL + SUPABASE_SERVICE_KEY are set (the Vercel
 *                 prebuild). Reads live catalogue rows with the service key.
 *                 If Supabase is unreachable, the build FAILS LOUDLY rather than
 *                 shipping an empty catalogue.
 *   • Seed      — no service key present (local dev). Builds the snapshot from
 *                 scripts/seed-data.ts so `npm run dev` / `npm run build` work
 *                 offline (spec §10.2: "verify a local build produces a valid
 *                 catalog.json from seed data").
 *
 * Run: `npm run snapshot` (also wired into predev / prebuild).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { seedData } from './seed-data.ts'
import type {
  RawAddon,
  RawCategory,
  RawDeliveryTier,
  RawPackage,
  RawProduct,
  RawProductPackageStock,
  RawProductPackageAvailability,
  RawReview,
  SeedData,
} from './seed-data.ts'
import type {
  Catalog,
  CatalogSettings,
  BannerSetting,
  FeaturesSetting,
  BusinessSetting,
  BankTransferSetting,
  ProductPackageStockMap,
  ProductPackageAvailabilityMap,
} from '../src/types/catalog.ts'
import { stockKey } from '../src/types/catalog.ts'
import { mergeContent, type SiteContent } from '../src/types/content.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '../src/data/catalog.json')

// ── DB → catalog transforms (snake_case rows → camelCase catalog) ──────────────
// The SAME transforms run over Supabase rows and seed rows.

function mapCategories(rows: RawCategory[]): Catalog['categories'] {
  return rows
    .filter((r) => r.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({ id: r.id, name: r.name, slug: r.slug, sortOrder: r.sort_order }))
}

function mapProducts(rows: RawProduct[]): Catalog['products'] {
  return rows
    .filter((r) => r.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      pricePerPiece: Number(r.price_per_piece),
      // imageUrl is derived (media[0], falling back to the legacy column) so
      // tiles/SEO/JSON-LD keep working unchanged for anything reading it.
      imageUrl: r.media?.[0]?.url ?? r.image_url,
      media: r.media ?? [],
      inStock: r.in_stock,
      stockQty: r.stock_qty,
      isSlabAvailable: r.is_slab_available,
      isSlab15Available: r.is_slab_15_available,
      isSlabProduct: r.is_slab_product ?? false,
      flavors: (r.flavors ?? []).map((f) => ({ name: f.name, price: Number(f.price) })),
      allowsLetterTopper: r.allows_letter_topper,
      slabLetterMaxChars: r.slab_letter_max_chars ?? 7,
      isHotPick: r.is_hot_pick,
      isCorporate: r.is_corporate ?? false,
      sortOrder: r.sort_order,
    }))
}

function mapPackages(rows: RawPackage[]): Catalog['packages'] {
  return rows
    .filter((r) => r.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      id: r.id,
      label: r.label,
      pieceCount: r.piece_count,
      isSlab: r.is_slab,
      letterMaxChars: r.letter_max_chars,
      sortOrder: r.sort_order,
    }))
}

/** No row = in stock; only out-of-stock overrides need to appear in the map. */
function mapProductPackageStock(rows: RawProductPackageStock[]): ProductPackageStockMap {
  const map: ProductPackageStockMap = {}
  for (const r of rows) {
    if (!r.in_stock) map[stockKey(r.product_id, r.package_id)] = false
  }
  return map
}

/** No row = available; only hidden overrides need to appear in the map. */
function mapProductPackageAvailability(
  rows: RawProductPackageAvailability[],
): ProductPackageAvailabilityMap {
  const map: ProductPackageAvailabilityMap = {}
  for (const r of rows) {
    if (!r.is_available) map[stockKey(r.product_id, r.package_id)] = false
  }
  return map
}

function mapAddons(rows: RawAddon[]): Catalog['addons'] {
  return rows
    .filter((r) => r.is_enabled)
    .map((r) => ({
      id: r.id,
      label: r.label,
      price: Number(r.price),
      config: r.config,
    }))
}

function mapDeliveryTiers(rows: RawDeliveryTier[]): Catalog['deliveryTiers'] {
  return rows
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      minPieces: r.min_pieces,
      maxPieces: r.max_pieces,
      fee: Number(r.fee),
      warnAdmin: r.warn_admin,
      sortOrder: r.sort_order,
    }))
}

function mapReviews(rows: RawReview[]): Catalog['reviews'] {
  return rows
    .filter((r) => r.is_featured && !r.is_hidden)
    .map((r) => ({
      id: r.id,
      author: r.author,
      rating: r.rating,
      body: r.body,
      source: r.source,
    }))
}

function mapSettings(raw: SeedData['settings']): CatalogSettings {
  return {
    banner: raw.banner as unknown as BannerSetting,
    features: raw.features as unknown as FeaturesSetting,
    business: raw.business as unknown as BusinessSetting,
    bankTransfer: raw.bankTransfer as unknown as BankTransferSetting,
  }
}

function buildCatalog(data: SeedData, source: Catalog['source']): Catalog {
  return {
    generatedAt: new Date().toISOString(),
    source,
    categories: mapCategories(data.categories),
    products: mapProducts(data.products),
    packages: mapPackages(data.packages),
    addons: mapAddons(data.addons),
    deliveryTiers: mapDeliveryTiers(data.deliveryTiers),
    reviews: mapReviews(data.reviews),
    google: null, // filled in main() from the Google Places API when configured
    settings: mapSettings(data.settings),
    content: mergeContent(data.settings.content as Partial<SiteContent> | undefined),
    productPackageStock: mapProductPackageStock(data.productPackageStock),
    productPackageAvailability: mapProductPackageAvailability(data.productPackageAvailability),
  }
}

// ── Google reviews (build-time) ─────────────────────────────────────────────────
// Fetch live reviews from the Google Places API (New) at build time and bake
// them into the snapshot, so the API key never reaches the browser. Enabled
// only when both env vars are set; otherwise returns null and the storefront
// falls back to the curated reviews.
//   GOOGLE_PLACES_API_KEY   — a Google Cloud key with the Places API (New) enabled
//   GOOGLE_PLACES_PLACE_ID  — the business's Place ID (e.g. ChIJ...)
async function fetchGoogleReviews(): Promise<Catalog['google']> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const placeId = process.env.GOOGLE_PLACES_PLACE_ID
  if (!apiKey || !placeId) return null

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,rating,userRatingCount,googleMapsUri,reviews',
      },
    })
    if (!res.ok) {
      console.warn(`[snapshot] Google Places fetch failed (${res.status}) — using curated reviews.`)
      return null
    }
    const data = (await res.json()) as {
      rating?: number
      userRatingCount?: number
      googleMapsUri?: string
      reviews?: Array<{
        name?: string
        rating?: number
        text?: { text?: string }
        originalText?: { text?: string }
        authorAttribution?: { displayName?: string }
      }>
    }

    const reviews: Catalog['reviews'] = (data.reviews ?? [])
      .map((r, i) => ({
        id: r.name ?? `google-${i}`,
        author: r.authorAttribution?.displayName ?? 'Google reviewer',
        rating: r.rating ?? 5,
        body: r.text?.text ?? r.originalText?.text ?? '',
        source: 'google',
      }))
      .filter((r) => r.body.trim() !== '')

    if (reviews.length === 0) return null

    return {
      rating: data.rating ?? 0,
      total: data.userRatingCount ?? 0,
      url: data.googleMapsUri ?? '',
      reviews,
    }
  } catch (err) {
    console.warn('[snapshot] Google Places fetch errored — using curated reviews:', err)
    return null
  }
}

// ── Supabase read ──────────────────────────────────────────────────────────────
async function fetchFromSupabase(url: string, serviceKey: string): Promise<SeedData> {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  const [
    categories,
    products,
    packages,
    addons,
    tiers,
    reviews,
    settings,
    productPackageStock,
    productPackageAvailability,
  ] = await Promise.all([
    supabase.from('categories').select('*'),
    supabase.from('products').select('*'),
    supabase.from('packages').select('*'),
    supabase.from('addons').select('*'),
    supabase.from('delivery_tiers').select('*'),
    supabase.from('reviews').select('*'),
    supabase.from('site_settings').select('*'),
    supabase.from('product_package_stock').select('*'),
    supabase.from('product_package_availability').select('*'),
  ])

  for (const res of [
    categories,
    products,
    packages,
    addons,
    tiers,
    reviews,
    settings,
    productPackageStock,
  ]) {
    if (res.error) {
      throw new Error(`Supabase read failed: ${res.error.message}`)
    }
  }

  // Availability is read tolerantly: if migration 033 hasn't run yet the table
  // won't exist, and a rebuild shouldn't hard-fail over it — treat it as "no
  // overrides" (every package available) until the migration is applied.
  if (productPackageAvailability.error) {
    console.warn(
      `[snapshot] product_package_availability read failed (${productPackageAvailability.error.message}) — treating all packages as available. Run migration 033.`,
    )
  }

  const settingsByKey = Object.fromEntries(
    (settings.data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]),
  )

  return {
    categories: (categories.data ?? []) as RawCategory[],
    products: (products.data ?? []) as RawProduct[],
    packages: (packages.data ?? []) as RawPackage[],
    addons: (addons.data ?? []) as RawAddon[],
    deliveryTiers: (tiers.data ?? []) as RawDeliveryTier[],
    reviews: (reviews.data ?? []) as RawReview[],
    settings: {
      banner: (settingsByKey.banner ?? {}) as Record<string, unknown>,
      features: (settingsByKey.features ?? {}) as Record<string, unknown>,
      business: (settingsByKey.business ?? {}) as Record<string, unknown>,
      bankTransfer: (settingsByKey.bank_transfer ?? {}) as Record<string, unknown>,
      content: (settingsByKey.content ?? undefined) as Record<string, unknown> | undefined,
    },
    productPackageStock: (productPackageStock.data ?? []) as RawProductPackageStock[],
    productPackageAvailability: (productPackageAvailability.data ??
      []) as RawProductPackageAvailability[],
  }
}

// ── main ────────────────────────────────────────────────────────────────────────
async function main() {
  // Accept both storefront and build-only env var names for the URL.
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  let catalog: Catalog

  if (url && serviceKey) {
    console.log('[snapshot] Reading catalogue from Supabase…')
    try {
      const data = await fetchFromSupabase(url, serviceKey)
      catalog = buildCatalog(data, 'supabase')
    } catch (err) {
      // Fail the build loudly rather than shipping an empty catalogue (spec §8).
      console.error('[snapshot] FAILED to read from Supabase.')
      console.error(err)
      process.exit(1)
    }
  } else {
    console.warn(
      '[snapshot] No SUPABASE_SERVICE_KEY set — building catalog.json from local seed data. ' +
        'Set SUPABASE_URL + SUPABASE_SERVICE_KEY for a live snapshot.',
    )
    catalog = buildCatalog(seedData, 'seed')
  }

  const google = await fetchGoogleReviews()
  if (google) {
    catalog.google = google
    console.log(`[snapshot] Google reviews: ${google.reviews.length} (rating ${google.rating}, ${google.total} total).`)
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8')

  console.log(
    `[snapshot] Wrote ${OUT_PATH} (source: ${catalog.source}) — ` +
      `${catalog.products.length} products, ${catalog.reviews.length} reviews.`,
  )
}

main()
