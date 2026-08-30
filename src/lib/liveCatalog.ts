// Live catalogue fetch — the runtime counterpart to scripts/snapshot.ts.
//
// The storefront now reads catalogue data LIVE from Supabase in the browser
// (via CatalogProvider), so admin add/edit/delete is reflected on the next page
// load with no Publish/rebuild. The build-time snapshot (catalog.json) is still
// used to seed first paint and for the SEO prerender, but the browser refetches
// and overrides it with current data.
//
// This mirrors mapProducts/mapAddons/etc in scripts/snapshot.ts — same camelCase
// output shape — so every existing consumer keeps working unchanged.
import { supabase } from './supabase'
import type {
  Catalog,
  CatalogProduct,
  CatalogPackage,
  CatalogAddon,
  CatalogCategory,
  CatalogDeliveryTier,
  CatalogReview,
  ProductPackageStockMap,
  ProductPackageAvailabilityMap,
} from '../types/catalog'
import { stockKey } from '../types/catalog'
import { mergeContent } from '../types/content'

interface RawMedia {
  url: string
  type: 'image' | 'video'
}

function mapProducts(rows: Record<string, unknown>[]): CatalogProduct[] {
  return rows
    .filter((r) => r.is_visible)
    .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
    .map((r) => {
      const media = (r.media as RawMedia[] | null) ?? []
      return {
        id: r.id as string,
        categoryId: (r.category_id as string | null) ?? null,
        name: r.name as string,
        slug: r.slug as string,
        description: (r.description as string | null) ?? null,
        pricePerPiece: Number(r.price_per_piece),
        imageUrl: media[0]?.url ?? (r.image_url as string | null) ?? null,
        media,
        inStock: r.in_stock as boolean,
        stockQty: (r.stock_qty as number | null) ?? null,
        isSlabAvailable: r.is_slab_available as boolean,
        isSlab15Available: r.is_slab_15_available as boolean,
        isSlabProduct: (r.is_slab_product as boolean) ?? false,
        flavors: ((r.flavors as { name: string; price: number }[] | null) ?? []).map((f) => ({
          name: f.name,
          price: Number(f.price),
        })),
        allowsLetterTopper: r.allows_letter_topper as boolean,
        slabLetterMaxChars: (r.slab_letter_max_chars as number | null) ?? 7,
        isHotPick: (r.is_hot_pick as boolean) ?? false,
        isCorporate: (r.is_corporate as boolean) ?? false,
        sortOrder: r.sort_order as number,
      }
    })
}

/** No row = in stock; only out-of-stock overrides need to appear in the map. */
function mapProductPackageStock(rows: Record<string, unknown>[]): ProductPackageStockMap {
  const map: ProductPackageStockMap = {}
  for (const r of rows) {
    if (r.in_stock === false) {
      map[stockKey(r.product_id as string, r.package_id as string)] = false
    }
  }
  return map
}

/** No row = available; only hidden overrides need to appear in the map. */
function mapProductPackageAvailability(
  rows: Record<string, unknown>[],
): ProductPackageAvailabilityMap {
  const map: ProductPackageAvailabilityMap = {}
  for (const r of rows) {
    if (r.is_available === false) {
      map[stockKey(r.product_id as string, r.package_id as string)] = false
    }
  }
  return map
}

/** Shape of the single JSON bundle returned by the get_catalog() RPC. */
interface CatalogBundle {
  products?: Record<string, unknown>[]
  packages?: Record<string, unknown>[]
  addons?: Record<string, unknown>[]
  categories?: Record<string, unknown>[]
  delivery_tiers?: Record<string, unknown>[]
  reviews?: Record<string, unknown>[]
  site_settings?: { key: string; value: unknown }[]
  product_package_stock?: Record<string, unknown>[]
  product_package_availability?: Record<string, unknown>[]
}

/**
 * Fetch the full catalogue from Supabase in ONE request via the get_catalog()
 * RPC (migration 037), instead of ~10 separate table reads — this is the big
 * lever on API-request count and egress for the storefront. Returns the same
 * shape as the baked snapshot. On any error (e.g. the RPC isn't deployed yet),
 * the caller keeps the snapshot seed — the site still shows the last-built
 * catalogue rather than going blank, and makes no further DB reads.
 */
export async function fetchLiveCatalog(seed: Catalog): Promise<Catalog> {
  const { data, error } = await supabase.rpc('get_catalog')

  if (error || !data) {
    console.warn('[catalog] live fetch failed, using snapshot seed:', error?.message ?? 'no data')
    return seed
  }

  const bundle = data as CatalogBundle
  const productsData = bundle.products ?? []
  const packagesData = bundle.packages ?? []
  const addonsData = bundle.addons ?? []
  const categoriesData = bundle.categories ?? []
  const tiersData = bundle.delivery_tiers ?? []
  const reviewsData = bundle.reviews ?? []
  const settingsData = bundle.site_settings ?? []
  const stockData = bundle.product_package_stock ?? []
  const availabilityData = bundle.product_package_availability ?? []

  const mappedPackages: CatalogPackage[] = packagesData.map((p) => ({
    id: p.id as string,
    label: p.label as string,
    pieceCount: p.piece_count as number,
    isSlab: p.is_slab as boolean,
    letterMaxChars: (p.letter_max_chars as number | null) ?? 0,
    sortOrder: p.sort_order as number,
  }))

  const mappedAddons: CatalogAddon[] = addonsData.map((a) => ({
    id: a.id as string,
    label: a.label as string,
    price: Number(a.price),
    config: (a.config as CatalogAddon['config']) ?? {},
  }))

  const mappedCategories: CatalogCategory[] = categoriesData
    .filter((c) => c.is_visible !== false)
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      slug: c.slug as string,
      sortOrder: c.sort_order as number,
    }))

  const mappedTiers: CatalogDeliveryTier[] = tiersData.map((t) => ({
    minPieces: t.min_pieces as number,
    maxPieces: (t.max_pieces as number | null) ?? null,
    fee: Number(t.fee),
    warnAdmin: t.warn_admin as boolean,
    sortOrder: t.sort_order as number,
  }))

  const mappedReviews: CatalogReview[] = reviewsData.map((r) => ({
    id: r.id as string,
    author: r.author as string,
    rating: r.rating as number,
    body: r.body as string,
    source: (r.source as string | null) ?? '',
  }))

  // site_settings is a key/value table; fall back to seed values per-key.
  const settingsMap = new Map(settingsData.map((s) => [s.key, s.value]))
  const settings = {
    banner: (settingsMap.get('banner') as Catalog['settings']['banner']) ?? seed.settings.banner,
    features:
      (settingsMap.get('features') as Catalog['settings']['features']) ?? seed.settings.features,
    // Merge per-key so newer fields (instagram_url/facebook_url) fall back to
    // the seed defaults even when the stored business row predates them.
    business: {
      ...seed.settings.business,
      ...((settingsMap.get('business') as Partial<Catalog['settings']['business']>) ?? {}),
    },
    // Merge per-key like `business`: a stored bank_transfer row that predates a
    // field (or omits `enabled`) still falls back to the seed defaults, so the
    // checkout's "Transfer to" panel never renders blank or gets hidden by a
    // missing `enabled` flag.
    bankTransfer: {
      ...seed.settings.bankTransfer,
      ...((settingsMap.get('bank_transfer') as Partial<Catalog['settings']['bankTransfer']>) ?? {}),
    },
  }
  const content = mergeContent(settingsMap.get('content') ?? seed.content)

  // No row = in stock / available (the normal case); the maps only record
  // explicit overrides, so an empty array is expected, not an error.
  const productPackageStock = mapProductPackageStock(stockData)
  const productPackageAvailability = mapProductPackageAvailability(availabilityData)

  return {
    generatedAt: new Date().toISOString(),
    source: 'supabase',
    categories: mappedCategories.length > 0 ? mappedCategories : seed.categories,
    products: mapProducts(productsData),
    packages: mappedPackages.length > 0 ? mappedPackages : seed.packages,
    addons: mappedAddons.length > 0 ? mappedAddons : seed.addons,
    deliveryTiers: mappedTiers.length > 0 ? mappedTiers : seed.deliveryTiers,
    reviews: mappedReviews,
    // Google reviews are baked at build time (API key is server-only) — carry
    // the snapshot value through; the browser can't refetch them.
    google: seed.google,
    settings,
    content,
    productPackageStock,
    productPackageAvailability,
  }
}
