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
        <Link to="/shop" className="mt-4 inline-block text-sm text-wine hover:underline">
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="text-sm text-ink/50">
        <Link to="/" className="hover:text-wine">
          Home
        </Link>{' '}
        /{' '}
        <Link to="/shop" className="hover:text-wine">
          All Brownies
        </Link>{' '}
        / <span className="text-ink/80">{product.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <BrownieImage
            src={product.imageUrl}
            alt={product.name}
            className="aspect-square w-full rounded-3xl"
          />
        </div>

        {/* Info + configurator */}
        <div>
          <h1 className="font-display text-3xl font-semibold">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-wine" aria-hidden>
              ★★★★★
            </span>
            <Link to="/#reviews" className="text-ink/50 hover:text-wine">
              Loved by our customers
            </Link>
          </div>

          {product.description && (
            <p className="mt-4 text-ink/70">{product.description}</p>
          )}

          <p className="mt-3 text-sm text-ink/50">
            From {formatLKR(product.pricePerPiece * 9)} · {formatLKR(product.pricePerPiece)} per piece
            {product.inStock && product.stockQty != null && (
              <span className="ml-2">· only {product.stockQty} left today</span>
            )}
          </p>

          <div className="mt-6">
            <ProductConfigurator product={product} packages={packages} addons={addons} />
          </div>

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
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">You may also like</h2>
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
