import { useState } from 'react'
import { categories, products, packages } from '../data/catalog'
import ProductTile from '../components/storefront/ProductTile'

// Shop — full product grid reading from the build-time snapshot (spec §2, §10
// Phase 4). Category filter is client-side only; the underlying data never
// changes without a rebuild.
export default function Shop() {
  const [categoryId, setCategoryId] = useState<string | null>(null)

  const visibleProducts = categoryId
    ? products.filter((p) => p.categoryId === categoryId)
    : products

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm transition-colors ${
      active ? 'border-ink bg-ink text-cream' : 'border-ink/20 bg-white text-ink/80 hover:border-wine'
    }`

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">All Brownies</h1>
      <p className="mt-1 text-sm text-ink/60">{products.length} handmade flavours, baked to order</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setCategoryId(null)} className={chip(categoryId === null)}>
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategoryId(category.id)}
            className={chip(categoryId === category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <p className="mt-8 text-sm text-ink/60">No brownies in this category yet.</p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product) => (
            <li key={product.id}>
              <ProductTile product={product} packages={packages} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
