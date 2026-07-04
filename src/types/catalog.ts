// Shape of the build-time catalogue snapshot (src/data/catalog.json).
//
// The storefront reads THIS, never the database, while a customer browses
// (spec §2). The snapshot script (scripts/snapshot.ts) produces it — from
// Supabase on a real build, or from seed data locally. All fields are camelCase
// (app-facing), converted from the snake_case DB columns during the snapshot.

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

export interface LetterTopperConfig {
  lines: number
  maxCharsPerLine: number
  slabOnly: boolean
}
export interface GiftMessageConfig {
  maxChars: number
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
}
