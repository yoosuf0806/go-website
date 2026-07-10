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
        allowsLetterTopper: r.allows_letter_topper as boolean,
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

/**
 * Fetch the full catalogue from Supabase. Returns the same shape as the baked
 * snapshot. On any error, the caller keeps the snapshot seed (fail-safe: the
 * site still shows the last-built catalogue rather than going blank).
 */
export async function fetchLiveCatalog(seed: Catalog): Promise<Catalog> {
  const [products, packages, addons, categories, tiers, reviews, settingsRows, stockRows] =
    await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('packages').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('addons').select('*'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('delivery_tiers').select('*').order('sort_order'),
      supabase.from('reviews').select('*').eq('is_featured', true),
      supabase.from('site_settings').select('*'),
      supabase.from('product_package_stock').select('*'),
    ])

  // If the core product read failed, keep the seed rather than blanking the site.
  if (products.error) {
    console.warn('[catalog] live fetch failed, using snapshot seed:', products.error.message)
    return seed
  }

  const mappedPackages: CatalogPackage[] = (packages.data ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    pieceCount: p.piece_count,
    isSlab: p.is_slab,
    letterMaxChars: p.letter_max_chars ?? 0,
    sortOrder: p.sort_order,
  }))

  const mappedAddons: CatalogAddon[] = (addons.data ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    price: Number(a.price),
    config: a.config ?? {},
  }))

  const mappedCategories: CatalogCategory[] = (categories.data ?? [])
    .filter((c) => c.is_visible !== false)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sort_order }))

  const mappedTiers: CatalogDeliveryTier[] = (tiers.data ?? []).map((t) => ({
    minPieces: t.min_pieces,
    maxPieces: t.max_pieces,
    fee: Number(t.fee),
    warnAdmin: t.warn_admin,
    sortOrder: t.sort_order,
  }))

  const mappedReviews: CatalogReview[] = (reviews.data ?? []).map((r) => ({
    id: r.id,
    author: r.author,
    rating: r.rating,
    body: r.body,
    source: r.source ?? '',
  }))

  // site_settings is a key/value table; fall back to seed values per-key.
  const settingsMap = new Map((settingsRows.data ?? []).map((s) => [s.key, s.value]))
  const settings = {
    banner: (settingsMap.get('banner') as Catalog['settings']['banner']) ?? seed.settings.banner,
    features:
      (settingsMap.get('features') as Catalog['settings']['features']) ?? seed.settings.features,
    business:
      (settingsMap.get('business') as Catalog['settings']['business']) ?? seed.settings.business,
  }
  const content = mergeContent(settingsMap.get('content') ?? seed.content)

  // Fall back to the seed's stock map only if the table read itself failed
  // (an empty result set is the normal "everything in stock" case).
  const productPackageStock = stockRows.error
    ? seed.productPackageStock
    : mapProductPackageStock(stockRows.data ?? [])

  return {
    generatedAt: new Date().toISOString(),
    source: 'supabase',
    categories: mappedCategories.length > 0 ? mappedCategories : seed.categories,
    products: mapProducts(products.data ?? []),
    packages: mappedPackages.length > 0 ? mappedPackages : seed.packages,
    addons: mappedAddons.length > 0 ? mappedAddons : seed.addons,
    deliveryTiers: mappedTiers.length > 0 ? mappedTiers : seed.deliveryTiers,
    reviews: mappedReviews,
    settings,
    content,
    productPackageStock,
  }
}
