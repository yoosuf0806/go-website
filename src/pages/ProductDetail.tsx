import { Link, useParams } from 'react-router-dom'
import { useCatalog } from '../contexts/CatalogContext'
import { formatLKR } from '../lib/format'
import ProductGallery from '../components/storefront/ProductGallery'
import ProductConfigurator from '../components/storefront/ProductConfigurator'
import Seo, { SITE_URL } from '../components/Seo'

const RELATED_COUNT = 4

// Product detail page (/shop/:slug): gallery, configure + add to cart
// (sticky bottom bar on mobile — 03-product-detail.md), a single "details"
// block, a horizontal cross-sell strip, and one featured review. Each
// product has its own URL (indexable; SEO meta + prerender wired in).
export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { catalog, loading, getProductBySlug } = useCatalog()
  const { products, packages, addons, categories, reviews, settings, content } = catalog
  const product = slug ? getProductBySlug(slug) : undefined

  // While the live catalogue is still loading, don't flash "not found".
  if (!product && loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

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

  const category = categories.find((c) => c.id === product.categoryId)
  const categoryLabel = [category?.name, product.isSlabAvailable ? 'Customisable' : null]
    .filter(Boolean)
    .join(' · ')
  const detailsText = [content.productInfo.freshness, content.productInfo.allergens]
    .filter(Boolean)
    .join(' ')
  const featuredReview = settings.features.reviews_section ? reviews[0] : undefined
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const path = `/shop/${product.slug}`
  const seoDescription = product.description ?? content.seo.shop.description
  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: seoDescription,
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    brand: { '@type': 'Brand', name: content.seo.siteName },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'LKR',
      price: product.pricePerPiece,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}${path}`,
    },
  }
  const breadcrumbLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'All Brownies', item: `${SITE_URL}/shop` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${SITE_URL}${path}` },
    ],
  }

  return (
    // pb: clears the fixed mobile Add-to-Cart bar so it never permanently
    // covers the tail of the page content; lg: that bar isn't fixed, so no
    // spacer is needed there.
    <div className="pb-28 lg:pb-0">
      <Seo
        title={`${product.name} — ${content.seo.siteName}`}
        description={seoDescription}
        path={path}
        image={product.imageUrl ?? undefined}
        jsonLd={[productLd, breadcrumbLd]}
      />

      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-5 pt-4 text-[13px] text-neutral-400 lg:px-6">
        <Link to="/" className="hover:text-pink">
          Home
        </Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-pink">
          All Brownies
        </Link>
        <span>/</span>
        <span className="text-neutral-500">{product.name}</span>
      </nav>

      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:gap-14 lg:px-6 lg:pt-6">
        {/* Gallery */}
        <div className="mt-3 lg:sticky lg:top-28 lg:mt-0 lg:self-start">
          <ProductGallery
            media={product.media}
            fallbackImageUrl={product.imageUrl}
            alt={product.name}
            className="aspect-[390/330] w-full lg:aspect-square lg:rounded-[20px]"
          />
        </div>

        {/* Info + configurator */}
        <div className="px-5 pt-4 lg:px-0 lg:pt-0">
          {categoryLabel && (
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-berry">{categoryLabel}</span>
          )}
          <h1 className="mt-1.5 text-[clamp(1.8rem,3vw,2.5rem)] leading-tight text-navy">{product.name}</h1>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-[1.5rem] text-pink">{formatLKR(product.pricePerPiece)}</span>
            <span className="text-sm text-neutral-500">per piece</span>
          </div>

          {product.description && (
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">{product.description}</p>
          )}

          <div className="mt-5">
            <ProductConfigurator
              product={product}
              packages={packages}
              addons={addons}
              productPackageStock={catalog.productPackageStock}
            />
          </div>

          {detailsText && (
            <div className="mt-8 border-t border-blush-200 pt-5">
              <h2 className="font-display text-lg text-navy">The details</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{detailsText}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pairs well with — cross-sell strip, kept clear of the primary
          add-to-cart decision (mockup: below the fold, horizontal scroll). */}
      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="px-5 font-display text-xl text-navy lg:mx-auto lg:max-w-6xl lg:px-6">Pairs well with</h2>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-1 lg:mx-auto lg:max-w-6xl lg:px-6">
            {related.map((p) => (
              <Link key={p.id} to={`/shop/${p.slug}`} className="w-[140px] flex-none">
                <div className="aspect-square overflow-hidden rounded-xl bg-blush-100">
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="mt-2 truncate text-[13px] font-medium text-navy">{p.name}</div>
                <div className="text-[13px] font-bold text-[#c02249]">{formatLKR(p.pricePerPiece)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Single featured review — light social proof right on the decision
          page, distinct from Home's full testimonials grid. */}
      {featuredReview && (
        <div className="mx-5 mt-8 rounded-2xl bg-blush-100 p-5 lg:mx-auto lg:max-w-6xl">
          <div className="flex items-center gap-2">
            {avgRating && <span className="text-[15px] font-bold text-navy">{avgRating}</span>}
            <span className="text-sm text-berry">{'★'.repeat(featuredReview.rating)}</span>
            <span className="text-[13px] text-neutral-500">· {reviews.length} reviews</span>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-neutral-600">“{featuredReview.body}”</p>
          <p className="mt-2 text-[13px] font-medium text-neutral-500">{featuredReview.author}</p>
        </div>
      )}
    </div>
  )
}
