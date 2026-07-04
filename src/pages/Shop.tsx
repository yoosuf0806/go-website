import { products } from '../data/catalog'

// Shop — reads products from the build-time catalog.json snapshot (spec §2, §8).
// This is a minimal read-path stub proving the snapshot loader works; the full
// ProductCard / PackageSelector / AddonPanel UI is built in Phase 4.
export default function Shop() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Shop</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {products.length} brownies · reading from the build-time snapshot
      </p>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <li
            key={product.id}
            className="rounded-lg border border-neutral-200 p-4 text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium">{product.name}</h2>
              {!product.inStock && (
                <span className="shrink-0 rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                  Sold out
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-600">{product.description}</p>
            <p className="mt-2 text-sm font-semibold">
              Rs. {product.pricePerPiece.toLocaleString('en-LK')} / piece
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
