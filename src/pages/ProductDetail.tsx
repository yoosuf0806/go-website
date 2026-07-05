import { Link, useParams } from 'react-router-dom'
import { products, packages, addons, getProductBySlug } from '../data/catalog'
import { formatLKR } from '../lib/format'
import BrownieImage from '../components/storefront/BrownieImage'
import ProductConfigurator from '../components/storefront/ProductConfigurator'
import ProductTile from '../components/storefront/ProductTile'
import Accordion from '../components/storefront/Accordion'

const RELATED_COUNT = 4

// Product detail page (/shop/:slug) — the browniegod-style flow: gallery,
// configure + add to cart, accordions, and related products. Each product has
// its own URL (indexable; SEO meta + prerender wired in later chunks).
export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const product = slug ? getProductBySlug(slug) : undefined

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Brownie not found</h1>
        <Link to="/shop" className="mt-4 inline-block text-sm text-pink hover:underline">
          Back to all brownies
        </Link>
      </div>
    )
  }

  const related = products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .concat(products.filter((p) => p.id !== product.id && p.categoryId !== product.categoryId))
    .slice(0, RELATED_COUNT)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[13px] text-neutral-500">
        <Link to="/" className="font-bold text-pink hover:underline">
          Home
        </Link>
        <span>/</span>
        <Link to="/shop" className="font-bold text-pink hover:underline">
          All Brownies
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-12 md:grid-cols-2">
        {/* Gallery */}
        <div className="md:sticky md:top-28 md:self-start">
          <BrownieImage
            src={product.imageUrl}
            alt={product.name}
            className="aspect-square w-full rounded-[20px] bg-warmgray"
          />
        </div>

        {/* Info + configurator */}
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {['🌱 Vegetarian', '🍞 Freshly Baked', '🌙 Halal'].map((b) => (
              <span
                key={b}
                className="rounded-full bg-warmgray px-3 py-1.5 text-xs font-semibold text-neutral-500"
              >
                {b}
              </span>
            ))}
          </div>

          <h1 className="text-[clamp(1.8rem,3vw,2.5rem)] leading-tight text-navy">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-[#f4a100]" aria-hidden>
              ★★★★★
            </span>
            <Link to="/#reviews" className="text-neutral-400 hover:text-pink">
              Loved by our customers
            </Link>
          </div>

          <p className="mt-3 text-[1.8rem] font-bold text-navy">
            {formatLKR(product.pricePerPiece)}
            <span className="ml-1 text-base font-normal text-neutral-400">per piece</span>
          </p>

          {product.description && <p className="mt-3 text-sm leading-relaxed text-neutral-500">{product.description}</p>}

          <ul className="mt-4 flex flex-col gap-2 text-[13px] text-neutral-500">
            <li>📅 Schedule your delivery date in the cart</li>
            <li>🚚 Islandwide delivery available</li>
            <li>💬 Add a free gift message at checkout</li>
          </ul>

          <hr className="my-6 border-neutral-200" />

          <ProductConfigurator product={product} packages={packages} addons={addons} />

          <div className="mt-8">
            <Accordion
              items={[
                {
                  title: 'Description',
                  content:
                    product.description ??
                    'Handmade, fudgy, and baked fresh to order in Sri Lanka.',
                },
                {
                  title: 'Freshness & Storage',
                  content:
                    'Baked fresh to order. Best enjoyed within 5 days; keep sealed at room temperature, or refrigerate to keep longer.',
                },
                {
                  title: 'Allergens',
                  content:
                    'Made in a kitchen that handles wheat, dairy, eggs, and nuts. Please tell us about any allergies when you order.',
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16 rounded-3xl bg-warmgray p-8">
          <h2 className="text-2xl text-navy">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductTile key={p.id} product={p} packages={packages} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
