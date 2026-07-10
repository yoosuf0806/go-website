import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../contexts/CatalogContext'
import ProductTile from '../components/storefront/ProductTile'
import Seo from '../components/Seo'

type Sort = '' | 'low' | 'high'
// null = All; 'slab' = slab-available filter; otherwise a category id.
type Filter = null | 'slab' | string

// Shop — reference-style catalogue: pink hero, breadcrumb, filter tabs by
// category (plus a Brownie Slab filter), sort, and a responsive product grid.
// Reads the live catalogue (seeded from the snapshot for first paint).
export default function Shop() {
  const { catalog, loading } = useCatalog()
  const { categories, products, packages, content } = catalog
  const [filter, setFilter] = useState<Filter>(null)
  const [sort, setSort] = useState<Sort>('')

  // Is the Brownie Slab package offered at all? Only show the slab tab if so.
  const hasSlab = useMemo(() => packages.some((p) => p.isSlab), [packages])

  const visible = useMemo(() => {
    let list =
      filter === 'slab'
        ? products.filter((p) => p.isSlabAvailable)
        : filter
          ? products.filter((p) => p.categoryId === filter)
          : products.slice()
    if (sort === 'low') list = list.slice().sort((a, b) => a.pricePerPiece - b.pricePerPiece)
    if (sort === 'high') list = list.slice().sort((a, b) => b.pricePerPiece - a.pricePerPiece)
    return list
  }, [filter, sort, products])

  const tab = (active: boolean) =>
    `rounded-full border-2 px-5 py-2 text-[13px] font-bold transition-colors ${
      active ? 'border-navy bg-navy text-white' : 'border-neutral-200 bg-white text-navy hover:border-navy'
    }`

  return (
    <div>
      <Seo title={content.seo.shop.title} description={content.seo.shop.description} path="/shop" />
      <section className="border-b border-neutral-200 bg-pink-light px-6 py-14 text-center">
        <h1 className="text-[clamp(2.2rem,4vw,3.5rem)] text-navy">All Brownies</h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-500">
          Explore our full range of freshly baked brownies — something for every occasion.
        </p>
      </section>

      <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-6 text-[13px] text-neutral-500">
        <Link to="/" className="font-bold text-pink hover:underline">
          Home
        </Link>
        <span>/</span>
        <span>All Brownies</span>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFilter(null)} className={tab(filter === null)}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={tab(filter === c.id)}
              >
                {c.name}
              </button>
            ))}
            {hasSlab && (
              <button
                type="button"
                onClick={() => setFilter('slab')}
                className={tab(filter === 'slab')}
              >
                Brownie Slab
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border-2 border-neutral-200 bg-white px-4 py-2 text-[13px] outline-none"
            aria-label="Sort products"
          >
            <option value="">Sort: Featured</option>
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
          </select>
        </div>

        {loading && products.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">Loading brownies…</p>
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            {filter === 'slab'
              ? 'No brownies are available as a slab yet.'
              : 'No brownies in this category yet.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((product) => (
              <li key={product.id}>
                <ProductTile product={product} packages={packages} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
