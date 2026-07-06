import type { SiteContent } from './content'

// Shape of the build-time catalogue snapshot (src/data/catalog.json).
//
// The storefront reads THIS, never the database, while a customer browses
// (spec §2). The snapshot script (scripts/snapshot.ts) produces it — from
// Supabase on a real build, or from seed data locally. The snapshot converts
// DB *columns* to camelCase (app-facing). Raw JSONB blobs stored as a unit —
// add-on `config` and the `settings` values — are passed through verbatim, so
// they keep their snake_case DB keys (e.g. max_chars_per_line, starts_at).

export interface CatalogCategory {
  id: string
  name: string
  slug: string
  sortOrder: number
}

export interface CatalogProduct {
  id: string
  categoryId: string | null
  name: string
  slug: string
  description: string | null
  pricePerPiece: number
  imageUrl: string | null
  inStock: boolean
  stockQty: number | null
  isSlabAvailable: boolean
  allowsLetterTopper: boolean
  sortOrder: number
}

export interface CatalogPackage {
  id: string
  label: string
  pieceCount: number
  isSlab: boolean
  sortOrder: number
}

// Add-on `config` blobs keep their snake_case DB keys (stored as a JSONB unit,
// not column-mapped by the snapshot). Match the shapes seeded in seed-data.ts.
export interface LetterTopperConfig {
  lines: number
  max_chars_per_line: number
  slab_only: boolean
}
export interface GiftMessageConfig {
  max_chars: number
}
export interface GiftRibbonConfig {
  colors: string[]
}
export type AddonConfig =
  | LetterTopperConfig
  | GiftMessageConfig
  | GiftRibbonConfig
  | Record<string, unknown>

export interface CatalogAddon {
  id: string
  label: string
  price: number
  config: AddonConfig
}

export interface CatalogDeliveryTier {
  minPieces: number
  maxPieces: number | null
  fee: number
  warnAdmin: boolean
  sortOrder: number
}

export interface CatalogReview {
  id: string
  author: string
  rating: number
  body: string
  source: string
}

export interface BannerSetting {
  enabled: boolean
  text: string
  starts_at: string | null
  ends_at: string | null
}
export interface FeaturesSetting {
  corporate_section: boolean
  wedding_section: boolean
  reviews_section: boolean
}
export interface BusinessSetting {
  whatsapp_number: string
  google_business_url: string
}
export interface CatalogSettings {
  banner: BannerSetting
  features: FeaturesSetting
  business: BusinessSetting
}

export interface Catalog {
  /** ISO timestamp of when the snapshot was generated. */
  generatedAt: string
  /** How the snapshot was produced: a live Supabase read or the local seed fallback. */
  source: 'supabase' | 'seed'
  categories: CatalogCategory[]
  products: CatalogProduct[]
  packages: CatalogPackage[]
  addons: CatalogAddon[]
  deliveryTiers: CatalogDeliveryTier[]
  reviews: CatalogReview[]
  settings: CatalogSettings
  /** Editable storefront copy + SEO (admin Content module). */
  content: SiteContent
}
