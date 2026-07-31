import { useEffect, useMemo, useState } from 'react'
import { useCatalog } from '../contexts/CatalogContext'
import ProductTile from '../components/storefront/ProductTile'
import Seo from '../components/Seo'
import { useCartStore } from '../stores/cart'
import { useCartUI } from '../stores/cartUI'
import { lineTotal } from '../lib/pricing'
import { formatLKR } from '../lib/format'

type SortKey = 'featured' | 'low' | 'high'
// null = All; 'slab' = slab-available filter; otherwise a category id.
type Filter = null | 'slab' | string

const SORT_LABEL: Record<SortKey, string> = {
  featured: 'Popular',
  low: 'Price: Low to High',
  high: 'Price: High to Low',
}

// Two rows of the mobile grid per "page" — matches the reference cadence of
// showing a full screen or two before the customer has to tap Load more.
const PAGE_SIZE = 8

// Shop — chips, a sort bottom-sheet (not a dropdown — fiddly on touch),
// incremental "Load more" over full pagination, and a sticky View Cart bar
// once something's in the basket. Reads the live catalogue (seeded from the
// snapshot for first paint).
export default function Shop() {
  const { catalog, loading } = useCatalog()
  const { categories, products, packages, content } = catalog
  const [filter, setFilter] = useState<Filter>(null)
  const [sort, setSort] = useState<SortKey>('featured')
  const [sortOpen, setSortOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const cartItems = useCartStore((s) => s.items)
  const setCartOpen = useCartUI((s) => s.setOpen)
  const cartCount = cartItems.reduce((n, i) => n + i.boxQty, 0)
  const subtotal = cartItems.reduce((n, i) => n + lineTotal(i), 0)

  // Is the Brownie Slab package offered at all? Only show the slab chip if so.
  const hasSlab = useMemo(() => packages.some((p) => p.isSlab), [packages])

  const filtered = useMemo(() => {
    let list =
      filter === 'slab'
        ? products.filter((p) => p.isSlabAvailable || p.isSlab15Available)
        : filter
          ? products.filter((p) => p.categoryId === filter)
          : products.slice()
    if (sort === 'low') list = list.slice().sort((a, b) => a.pricePerPiece - b.pricePerPiece)
    if (sort === 'high') list = list.slice().sort((a, b) => b.pricePerPiece - a.pricePerPiece)
    return list
  }, [filter, sort, products])

  // A filter/sort change starts a fresh "page" rather than keeping whatever
  // had been revealed via Load more for the previous list.
  useEffect(() => setVisibleCount(PAGE_SIZE), [filter, sort])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const filterTitle =
    filter === 'slab' ? 'Brownie Slab' : filter ? (categories.find((c) => c.id === filter)?.name ?? 'Shop All') : 'Shop All'
  const resultCount = `${filtered.length} brownie${filtered.length === 1 ? '' : 's'}`

  const chip = (active: boolean) =>
    `flex-none rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
      active ? 'border-navy bg-navy text-white' : 'border-blush-200 bg-white text-navy hover:border-navy'
    }`

  return (
    <div className="pb-6">
      <Seo title={content.seo.shop.title} description={content.seo.shop.description} path="/shop" />

      {/* Category chips — sticky just under the global header. */}
      <div className="sticky top-[68px] z-20 border-b border-blush-200 bg-white/95 backdrop-blur-md">
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-6 py-3">
          <button type="button" onClick={() => setFilter(null)} className={chip(filter === null)}>
            All
          </button>
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => setFilter(c.id)} className={chip(filter === c.id)}>
              {c.name}
            </button>
          ))}
          {hasSlab && (
            <button type="button" onClick={() => setFilter('slab')} className={chip(filter === 'slab')}>
              Brownie Slab
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 pb-3 pt-5">
        <div>
          <h1 className="font-display text-2xl text-navy">{filterTitle}</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500">{resultCount}</p>
        </div>
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-blush-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-navy"
        >
          {SORT_LABEL[sort]} <span className="text-neutral-400">▾</span>
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        {loading && products.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">Loading brownies…</p>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full border border-blush-200 bg-blush-50" />
            <h2 className="font-display text-xl text-navy">Nothing here yet</h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-neutral-500">
              {filter === 'slab' ? 'No brownies are available as a slab right now.' : 'Try a different category, or check back soon.'}
            </p>
            <button
              type="button"
              onClick={() => setFilter(null)}
              className="mt-5 rounded-full bg-pink px-6 py-3 text-sm font-bold text-white"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((product) => (
                <ProductTile key={product.id} product={product} packages={packages} />
              ))}
            </div>
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="mt-6 w-full rounded-full bg-blush-100 py-3.5 text-[15px] font-bold text-berry"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>

      {/* Sort bottom-sheet — a tap-to-pick list, not a native <select>. */}
      {sortOpen && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setSortOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-blush-200" />
            <p className="px-6 pb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Sort by</p>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSort(key)
                  setSortOpen(false)
                }}
                className="flex w-full items-center justify-between px-6 py-3.5 text-left text-[15px] text-navy"
              >
                {SORT_LABEL[key]}
                {sort === key && <span className="text-pink">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sticky View Cart bar — appears once anything's in the basket, stays
          out of the way (and out of the fixed Add-to-Cart bar's territory,
          which only exists on Product Detail) otherwise. */}
      {cartCount > 0 && (
        <div className="fixed inset-x-3.5 bottom-3.5 z-30 lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-pink px-4 py-3.5 text-white shadow-[0_12px_24px_-10px_rgba(217,45,86,0.7)]"
          >
            <span className="text-sm opacity-90">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} · {formatLKR(subtotal)}
            </span>
            <span className="text-[15px] font-bold">View cart →</span>
          </button>
        </div>
      )}
    </div>
  )
}
