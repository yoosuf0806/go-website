import { Link } from 'react-router-dom'
import { products, packages, addons, featuredReviews, settings } from '../data/catalog'
import ProductCard from '../components/storefront/ProductCard'
import ReviewCarousel from '../components/storefront/ReviewCarousel'

const FEATURED_COUNT = 4

// Home — hero, featured products, reviews, corporate/wedding CTAs (spec §10
// Phase 4). Everything below reads from the build-time catalog snapshot.
export default function Home() {
  const featuredProducts = products.slice(0, FEATURED_COUNT)
  const { corporate_section, wedding_section, reviews_section } = settings.features

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">🍫 Golden Oven Brownies</h1>
        <p className="mt-4 text-neutral-600">
          Fudgy, made-to-order brownies, delivered across Sri Lanka.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-block rounded-full bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Shop brownies
        </Link>
      </section>

      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-8">
          <h2 className="text-xl font-semibold">Popular right now</h2>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} packages={packages} addons={addons} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {(corporate_section || wedding_section) && (
        <section className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-lg bg-neutral-50 p-8 text-center">
            <h2 className="text-xl font-semibold">
              {corporate_section && wedding_section
                ? 'Corporate gifting & wedding favours'
                : corporate_section
                  ? 'Corporate gifting'
                  : 'Wedding favours'}
            </h2>
            <p className="mt-2 text-neutral-600">
              Bulk orders for offices, events, and weddings — get a custom quotation.
            </p>
            <Link
              to="/corporate"
              className="mt-4 inline-block rounded-full border border-amber-600 px-6 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              Get Your Quotation
            </Link>
          </div>
        </section>
      )}

      {reviews_section && featuredReviews.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-8">
          <h2 className="text-xl font-semibold">What customers say</h2>
          <div className="mt-6">
            <ReviewCarousel reviews={featuredReviews} />
          </div>
        </section>
      )}
    </div>
  )
}
