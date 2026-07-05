import { Link } from 'react-router-dom'
import { products, featuredReviews, settings } from '../data/catalog'
import { formatLKR } from '../lib/format'
import BrownieImage from '../components/storefront/BrownieImage'
import ReviewCarousel from '../components/storefront/ReviewCarousel'
import FaqSection from '../components/storefront/FaqSection'

// Home — premium brownie-gifting landing page (browniegod-inspired). Hero,
// hot picks, flavour grid, editorial block, promise row, reviews, and FAQ, all
// reading from the build-time catalog snapshot.
export default function Home() {
  const hotPicks = products.slice(0, 5)
  const flavours = products.slice(0, 5)
  const { corporate_section, wedding_section, reviews_section } = settings.features

  return (
    <div>
      {/* Hero */}
      <section className="bg-blush-100 px-4 py-6 sm:py-10">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl">
          <div className="aspect-[16/10] w-full bg-gradient-to-br from-wine to-wine-900 sm:aspect-[16/7]">
            <BrownieImage
              src={products[0]?.imageUrl ?? null}
              alt="Signature brownie box"
              className="h-full w-full opacity-90 mix-blend-luminosity"
            />
          </div>
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 to-transparent p-6 sm:p-10">
            <h1 className="max-w-lg font-display text-3xl font-semibold text-cream sm:text-5xl">
              Brownies made <em className="not-italic text-blush-200">for them</em>
            </h1>
            <p className="mt-2 max-w-md text-sm text-cream/85 sm:text-base">
              Fudgy, made-to-order, and delivered across Sri Lanka. A gift that goes beyond “thinking
              of you”.
            </p>
            <Link
              to="/shop"
              className="mt-5 inline-block w-fit rounded-full bg-cream px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white"
            >
              Shop now
            </Link>
          </div>
        </div>
      </section>

      {/* Hot picks */}
      {hotPicks.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">Hot Picks 🔥</h2>
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {hotPicks.map((product) => (
              <Link
                key={product.id}
                to="/shop"
                className="group w-48 shrink-0"
              >
                <div className="relative overflow-hidden rounded-2xl">
                  <BrownieImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="aspect-square w-full transition-transform group-hover:scale-105"
                  />
                  {!product.inStock && (
                    <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs text-cream">
                      Sold out
                    </span>
                  )}
                  {product.isSlabAvailable && product.inStock && (
                    <span className="absolute left-2 top-2 rounded-full bg-cream/90 px-2 py-0.5 text-xs font-medium text-wine">
                      Customise
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium">{product.name}</p>
                <p className="text-sm text-ink/60">From {formatLKR(product.pricePerPiece * 9)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Flavour grid */}
      {flavours.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">Meet Our Brownie Flavours</h2>
          <p className="mt-1 text-sm text-ink/60">Available across all our brownie boxes</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {flavours.map((product) => (
              <Link key={product.id} to="/shop" className="group">
                <BrownieImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="aspect-square w-full rounded-2xl transition-transform group-hover:scale-[1.03]"
                />
                <p className="mt-2 text-sm font-medium">{product.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Editorial block */}
      <section className="px-4 py-12">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl md:grid-cols-2">
          <BrownieImage
            src={products[1]?.imageUrl ?? null}
            alt="Freshly baked brownies"
            className="min-h-[240px] w-full md:min-h-full"
          />
          <div className="flex flex-col justify-center bg-wine p-8 text-cream sm:p-12">
            <p className="text-xs uppercase tracking-widest text-blush-200">
              The island’s favourite brownies
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
              A gift that goes beyond{' '}
              <em className="text-blush-200">“thinking of you”</em> — it’s made for them.
            </h2>
            <Link
              to="/shop"
              className="mt-6 inline-block w-fit rounded-full bg-cream px-6 py-3 text-sm font-semibold text-wine hover:bg-white"
            >
              Explore the collection
            </Link>
          </div>
        </div>
      </section>

      {/* Promise row */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Promise title="Made Personal" body="Every detail speaks directly to the moment." />
          <Promise title="Made Fresh" body="Only the finest ingredients, baked to order." />
          <Promise title="Made to Gift" body="Thoughtfully packaged and ready to impress." />
          <Promise title="Made Inclusive" body="Crafted to celebrate every culture and occasion." />
        </div>
      </section>

      {/* Corporate / wedding promo */}
      {(corporate_section || wedding_section) && (
        <section className="px-4 py-12">
          <div className="mx-auto max-w-6xl rounded-3xl bg-blush-100 p-8 text-center sm:p-14">
            <p className="text-sm font-medium text-wine">Best seller</p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-4xl">
              The Original, The Only One
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink/70">
              Our custom letter-topper slab is the signature gift for messages that matter — for
              offices, weddings, and everything in between.
            </p>
            <Link
              to="/corporate"
              className="mt-6 inline-block rounded-full bg-ink px-7 py-3 text-sm font-semibold text-cream hover:bg-wine"
            >
              Get your quotation
            </Link>
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviews_section && featuredReviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">Don’t just take it from us…</h2>
          <div className="mt-6">
            <ReviewCarousel reviews={featuredReviews} />
          </div>
        </section>
      )}

      {/* FAQ */}
      <FaqSection />
    </div>
  )
}

function Promise({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-display text-lg">{title}</h3>
      <p className="mt-1 text-sm text-ink/60">{body}</p>
    </div>
  )
}
