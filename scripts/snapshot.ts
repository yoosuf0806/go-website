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
  RawReview,
  SeedData,
} from './seed-data.ts'
import type {
  Catalog,
  CatalogSettings,
  BannerSetting,
  FeaturesSetting,
  BusinessSetting,
} from '../src/types/catalog.ts'

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
      imageUrl: r.image_url,
      inStock: r.in_stock,
      stockQty: r.stock_qty,
      isSlabAvailable: r.is_slab_available,
      allowsLetterTopper: r.allows_letter_topper,
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
      sortOrder: r.sort_order,
    }))
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
    settings: mapSettings(data.settings),
  }
}

// ── Supabase read ──────────────────────────────────────────────────────────────
async function fetchFromSupabase(url: string, serviceKey: string): Promise<SeedData> {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  const [categories, products, packages, addons, tiers, reviews, settings] =
    await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('products').select('*'),
      supabase.from('packages').select('*'),
      supabase.from('addons').select('*'),
      supabase.from('delivery_tiers').select('*'),
      supabase.from('reviews').select('*'),
      supabase.from('site_settings').select('*'),
    ])

  for (const res of [categories, products, packages, addons, tiers, reviews, settings]) {
    if (res.error) {
      throw new Error(`Supabase read failed: ${res.error.message}`)
    }
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
    },
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

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8')

  console.log(
    `[snapshot] Wrote ${OUT_PATH} (source: ${catalog.source}) — ` +
      `${catalog.products.length} products, ${catalog.reviews.length} reviews.`,
  )
}

main()
