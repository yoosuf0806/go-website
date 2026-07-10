import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import catalogJson from '../data/catalog.json'
import type { Catalog, CatalogProduct, CatalogAddon } from '../types/catalog'
import { mergeContent } from '../types/content'
import { fetchLiveCatalog } from '../lib/liveCatalog'

// The snapshot (catalog.json) is the SEED: it powers SSR/prerender and instant
// first paint. In the browser, CatalogProvider refetches live from Supabase on
// mount and swaps in current data — so admin changes appear on next page load
// with no Publish/rebuild. If the live fetch fails, the seed stays (fail-safe).

const seed: Catalog = {
  ...(catalogJson as Catalog),
  content: mergeContent((catalogJson as Catalog).content),
}

interface CatalogContextValue {
  catalog: Catalog
  /** True until the first live fetch resolves (browser only). */
  loading: boolean
  getProductBySlug: (slug: string) => CatalogProduct | undefined
  getAddon: (id: string) => CatalogAddon | undefined
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(seed)
  // Only "loading" if we'll actually fetch (browser). SSR keeps the seed.
  const [loading, setLoading] = useState(typeof window !== 'undefined')

  useEffect(() => {
    let active = true
    fetchLiveCatalog(seed)
      .then((live) => {
        if (active) setCatalog(live)
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
