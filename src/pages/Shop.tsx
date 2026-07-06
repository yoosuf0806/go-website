import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { categories, products, packages, content } from '../data/catalog'
import ProductTile from '../components/storefront/ProductTile'
import Seo from '../components/Seo'

type Sort = '' | 'low' | 'high'

// Shop — reference-style catalogue: pink hero, breadcrumb, filter tabs by
// category, sort, and a responsive product grid. Reads the build-time snapshot.
export default function Shop() {
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('')

  const visible = useMemo(() => {
    let list = categoryId ? products.filter((p) => p.categoryId === categoryId) : products.slice()
    if (sort === 'low') list = list.slice().sort((a, b) => a.pricePerPiece - b.pricePerPiece)
    if (sort === 'high') list = list.slice().sort((a, b) => b.pricePerPiece - a.pricePerPiece)
    return list
  }, [categoryId, sort])

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
            <button type="button" onClick={() => setCategoryId(null)} className={tab(categoryId === null)}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={tab(categoryId === c.id)}
              >
                {c.name}
              </button>
            ))}
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

        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">No brownies in this category yet.</p>
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
