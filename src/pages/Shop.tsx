import { useState } from 'react'
import { categories, products, packages, addons } from '../data/catalog'
import ProductCard from '../components/storefront/ProductCard'

// Shop — full product grid reading from the build-time snapshot (spec §2, §10
// Phase 4). Category filter is client-side only; the underlying data never
// changes without a rebuild.
export default function Shop() {
  const [categoryId, setCategoryId] = useState<string | null>(null)

  const visibleProducts = categoryId
    ? products.filter((p) => p.categoryId === categoryId)
    : products

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Shop</h1>
      <p className="mt-1 text-sm text-neutral-500">{products.length} brownies</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            categoryId === null
              ? 'border-amber-600 bg-amber-600 text-white'
              : 'border-neutral-300 bg-white text-neutral-700 hover:border-amber-400'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategoryId(category.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              categoryId === category.id
                ? 'border-amber-600 bg-amber-600 text-white'
                : 'border-neutral-300 bg-white text-neutral-700 hover:border-amber-400'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">No brownies in this category yet.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} packages={packages} addons={addons} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
