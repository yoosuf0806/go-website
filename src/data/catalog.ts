// Typed loader for the build-time catalogue snapshot.
//
// The storefront imports the catalogue from HERE, synchronously — no loading
// spinners, no DB reads while browsing (spec §2, §8). catalog.json is generated
// by scripts/snapshot.ts (npm run snapshot / predev / prebuild) and is
// git-ignored; it always exists before a build or dev server starts.
import catalogJson from './catalog.json'
import type { Catalog } from '../types/catalog'
import { mergeContent } from '../types/content'

export const catalog = catalogJson as Catalog

export const categories = catalog.categories
export const products = catalog.products
export const packages = catalog.packages
export const addons = catalog.addons
export const deliveryTiers = catalog.deliveryTiers
export const featuredReviews = catalog.reviews
export const settings = catalog.settings
// mergeContent guarantees a full SiteContent even for older snapshots that
// predate the content field.
export const content = mergeContent(catalog.content)

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug)
}

export function getAddon(id: string) {
  return addons.find((a) => a.id === id)
}
