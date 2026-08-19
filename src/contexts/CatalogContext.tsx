import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import catalogJson from '../data/catalog.json'
import type { Catalog, CatalogProduct, CatalogAddon } from '../types/catalog'
import { mergeContent } from '../types/content'
import { fetchLiveCatalog } from '../lib/liveCatalog'
import { useCartStore } from '../stores/cart'

// The snapshot (catalog.json) is the SEED: it powers SSR/prerender and instant
// first paint. In the browser, CatalogProvider refetches live from Supabase on
// mount and swaps in current data — so admin changes appear on next page load
// with no Publish/rebuild. If the live fetch fails, the seed stays (fail-safe).

const rawSeed = catalogJson as unknown as Catalog
const seed: Catalog = {
  ...rawSeed,
  content: mergeContent(rawSeed.content),
  // Guard against snapshots baked before this field existed.
  productPackageAvailability: rawSeed.productPackageAvailability ?? {},
}

interface CatalogContextValue {
  catalog: Catalog
  /** True until the first live fetch resolves (browser only). */
  loading: boolean
  getProductBySlug: (slug: string) => CatalogProduct | undefined
  getAddon: (id: string) => CatalogAddon | undefined
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

// Browser-side cache of the live catalogue, so repeat page loads (reloads, a
// second tab, a returning visitor) don't re-hit Supabase every time. This is
// the main lever on API/egress usage: within CACHE_TTL_MS the storefront serves
// the cached catalogue and makes ZERO database reads. Prices are still
// re-validated server-side at checkout (create_order → PRICE_MISMATCH), so a
// slightly stale cached price can never place a wrong-priced order — it just
// asks the customer to refresh.
const CACHE_KEY = 'go-catalog-cache-v2'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function readCatalogCache(): Catalog | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; catalog: Catalog }
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null
    return parsed.catalog
  } catch {
    return null
  }
}

function writeCatalogCache(catalog: Catalog): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), catalog }))
  } catch {
    /* quota / private mode — caching is best-effort */
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(seed)
  // Only "loading" if we'll actually fetch (browser). SSR keeps the seed.
  const [loading, setLoading] = useState(typeof window !== 'undefined')

  useEffect(() => {
    let active = true

    // Fresh cache → use it and skip the network entirely (the egress win).
    const cached = readCatalogCache()
    if (cached) {
      setCatalog({ ...cached, content: mergeContent(cached.content) })
      setLoading(false)
      return
    }

    fetchLiveCatalog(seed)
      .then((live) => {
        if (active) setCatalog(live)
        writeCatalogCache(live)
      })
      .catch(() => {
        /* keep seed */
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const value: CatalogContextValue = {
    catalog,
    loading,
    getProductBySlug: (slug) => catalog.products.find((p) => p.slug === slug),
    getAddon: (id) => catalog.addons.find((a) => a.id === id),
  }

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider')
  return ctx
}

// Reprices/prunes the persisted cart against the live catalogue whenever it
// changes. Dropping lines for deleted products here is also what prevents the
// order_items foreign-key error at checkout. Render once inside CatalogProvider.
export function CartSync() {
  const { catalog, loading } = useCatalog()
  const repriceAll = useCartStore((s) => s.repriceAll)
  useEffect(() => {
    if (!loading) repriceAll(catalog)
  }, [catalog, loading, repriceAll])
  return null
}
