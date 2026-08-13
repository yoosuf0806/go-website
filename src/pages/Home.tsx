import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../contexts/CatalogContext'
import { toWhatsAppNumber } from '../lib/format'
import { formatLKR } from '../lib/format'
import HeroCarousel from '../components/storefront/HeroCarousel'
import ProductTile from '../components/storefront/ProductTile'
import BrownieImage from '../components/storefront/BrownieImage'
import GallerySection from '../components/storefront/GallerySection'
import Seo, { organizationJsonLd } from '../components/Seo'

// Home — Blush & Ink direction. Mobile matches the mockup (screen 01) exactly:
// a tight blush/white/navy column. From md: up it expands into full-width,
// multi-column layouts (2-col hero, Hot Picks grid, side-by-side slab + gift
// cards, 2-col flavours, 3-col testimonials) so wide screens aren't a narrow
// phone column floating in empty space. All copy stays admin-driven with the
// same section-visibility toggles.
export default function Home() {
  const { catalog } = useCatalog()
  const { reviews: featuredReviews, settings, content, products, packages } = catalog
  const { reviews_section } = settings.features
  const { hero, trust, ctaBanner, testimonialsHeading, homeCorporate, homeFaq, homeSlab, homeGiftReady } = content
  const vis = content.sectionVisibility

  const hotPicks = products.filter((p) => p.isHotPick && p.inStock)
  const heroImage = hotPicks.find((p) => p.imageUrl)?.imageUrl ?? products.find((p) => p.imageUrl)?.imageUrl ?? null
  const slabImage = homeSlab.imageUrl ?? heroImage
  const flavours = products.filter((p) => p.inStock).slice(0, 5)
  const waNumber = toWhatsAppNumber(settings.business.whatsapp_number)
  const promoText = content.promoMessages[0]
  // Gift-ready images: admin-set list if provided, else fall back to product
  // photos so the card never renders blank on a fresh site.
  const giftReadyImages = homeGiftReady.images.length
    ? homeGiftReady.images
    : (hotPicks.length ? hotPicks : products)
        .map((p) => p.imageUrl)
        .filter((url): url is string => !!url)
        .slice(0, 4)

  return (
    <div>
      <Seo
        title={content.seo.home.title}
        description={content.seo.home.description}
        path="/"
        preloadImage={content.heroSlides[0]?.imageUrl ?? heroImage}
        jsonLd={[organizationJsonLd()]}
      />

      {/* HERO — admin image carousel if slides exist, else the blush hero */}
      {content.heroSlides.length > 0 ? (
        <HeroCarousel slides={content.heroSlides} primaryCta={hero.primaryCta} />
      ) : (
        <section className="bg-blush-100 px-[22px] pb-7 pt-[72px] md:px-8 md:py-16 lg:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="md:order-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-berry">Handmade in Colombo</p>
              <h1 className="mt-3 font-display text-[40px] leading-[1.02] tracking-[-0.015em] text-navy md:text-[clamp(2.6rem,4.5vw,4rem)]">
                {hero.title} <em className="not-italic text-pink">{hero.highlight}</em> {hero.titleAfter}
              </h1>
              <p className="mt-3 max-w-[290px] text-[15px] leading-relaxed text-[#6b4450] md:max-w-md md:text-lg">
                {hero.subtitle}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row md:mt-8">
                <Link
                  to="/shop"
                  className="rounded-2xl bg-pink px-8 py-4 text-center text-base font-bold text-white transition-colors hover:bg-pink-dark"
                >
                  {hero.primaryCta}
                </Link>
              </div>
            </div>
            <div className="aspect-[290/250] overflow-hidden rounded-[18px] bg-navy md:order-2 md:aspect-[4/3]">
              {heroImage && (
                <BrownieImage src={heroImage} alt="Golden Oven brownies" className="h-full w-full" priority />
              )}
            </div>
          </div>
        </section>
      )}

      {/* TRUST STRIP — navy, 3 stats */}
      {vis.trust !== false && trust.length > 0 && (
        <div className="bg-navy text-blush-50">
          <div className="mx-auto flex max-w-3xl">
            {trust.map((t, i) => (
              <div
                key={t.title}
                className={`flex-1 px-2 py-3.5 text-center md:py-5 ${i < trust.length - 1 ? 'border-r border-blush-50/15' : ''}`}
              >
                <div className="font-display text-base text-[#f4b9c8] md:text-xl">{t.title}</div>
                <div className="pt-0.5 text-[11px] opacity-65 md:text-[13px]">{t.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOT PICKS — mobile carousel, desktop grid (white band) */}
      {vis.hotPicks !== false && hotPicks.length > 0 && (
        <section className="bg-white pb-8 pt-8 md:py-14">
          <div className="mx-auto max-w-6xl md:px-8">
            <div className="flex items-baseline justify-between px-[22px] pb-3.5 md:px-0 md:pb-6">
              <h2 className="font-display text-[25px] text-navy md:text-[32px]">Hot Picks</h2>
              <Link to="/shop" className="text-sm font-medium text-[#c02249]">
                See all
              </Link>
            </div>
            <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-[22px] pb-1.5 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4">
              {hotPicks.map((product) => (
                <div key={product.id} className="w-[170px] flex-none snap-start md:w-auto">
                  <ProductTile product={product} packages={packages} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BUILD YOUR OWN SLAB + IT ARRIVES GIFT-READY — stacked on mobile,
          side by side on desktop (pink band for vibrant white↔pink rhythm) */}
      <section className="bg-blush-100 py-8 md:py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-[22px] md:grid-cols-2 md:gap-8 md:px-8">
          {/* Build your own slab */}
          <div className="flex min-w-0 flex-col rounded-[20px] border border-blush-200 bg-white p-5 md:p-7">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-berry">{homeSlab.eyebrow}</span>
            <h2 className="mt-2 font-display text-[27px] leading-[1.14] text-navy md:text-[32px]">{homeSlab.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#5c4450]">{homeSlab.body}</p>
            <div className="mt-4 aspect-[326/220] overflow-hidden rounded-[14px] bg-blush-50 md:mt-5 md:aspect-[4/3] md:flex-1">
              {slabImage && <BrownieImage src={slabImage} alt="Brownie slab" className="h-full w-full" />}
            </div>
            <Link
              to="/slab"
              className="mt-4 block rounded-2xl bg-navy py-4 text-center text-base font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              {homeSlab.cta}
            </Link>
          </div>

          {/* It arrives gift-ready (admin-editable copy + images, toggleable) */}
          {vis.giftReady !== false && giftReadyImages.length > 0 && (
            <div className="flex min-w-0 flex-col rounded-[20px] border border-blush-200 bg-white p-5 md:p-7">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-berry">{homeGiftReady.eyebrow}</span>
              <h2 className="mt-2 font-display text-[27px] leading-[1.14] text-navy md:text-[32px]">{homeGiftReady.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#5c4450]">{homeGiftReady.body}</p>
              <div className="no-scrollbar mt-4 flex gap-2.5 overflow-x-auto pb-1 md:mt-5 md:flex-1">
                {giftReadyImages.map((url, i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] h-[150px] flex-none overflow-hidden rounded-[14px] bg-blush-100 md:h-auto md:w-1/2"
                  >
                    <BrownieImage src={url} alt={homeGiftReady.title} className="h-full w-full" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* THE FLAVOURS — list rows (2-col on desktop) (white band) */}
      {flavours.length > 0 && (
        <section className="bg-white px-[22px] py-8 md:py-14">
          <div className="mx-auto max-w-6xl md:px-8">
            <h2 className="font-display text-[25px] text-navy md:text-[32px]">The flavours</h2>
            <div className="mt-1 md:mt-4 md:grid md:grid-cols-2 md:gap-x-10">
              {flavours.map((f, i) => (
                <Link
                  key={f.id}
                  to={`/shop/${f.slug}`}
                  className="flex items-center gap-4 border-b border-blush-200 py-4 transition-colors hover:bg-blush-50/60"
                >
                  <span className="w-5 text-[13px] font-medium text-berry">{String(i + 1).padStart(2, '0')}</span>
                  <div className="h-20 w-20 flex-none overflow-hidden rounded-2xl bg-white sm:h-24 sm:w-24">
                    {f.imageUrl && <BrownieImage src={f.imageUrl} alt={f.name} className="h-full w-full" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[17px] text-navy">{f.name}</div>
                    <div className="truncate pt-0.5 text-[13px] text-neutral-500">From {formatLKR(f.pricePerPiece)} / pc</div>
                  </div>
                  <span className="text-lg text-berry">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CORPORATE BAND — navy */}
      <section className="mt-6 bg-navy px-[22px] py-7 text-blush-50 md:mt-14 md:py-16">
        <div className="mx-auto max-w-4xl md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-10">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#f4b9c8]">{homeCorporate.eyebrow}</span>
            <h2 className="mt-2 font-display text-[27px] leading-[1.14] text-white md:text-[36px]">{homeCorporate.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-blush-50/70 md:text-lg">{homeCorporate.body}</p>
          </div>
          <Link
            to="/corporate"
            className="mt-4 block rounded-2xl bg-pink py-4 text-center text-base font-bold text-white transition-colors hover:bg-pink-dark md:mt-0 md:px-10"
          >
            {homeCorporate.cta}
          </Link>
        </div>
      </section>

      {/* CTA BANNER — kept (admin-toggleable), styled as the mockup's promo ticker */}
      {vis.ctaBanner !== false && promoText && (
        <div className="mt-6 bg-blush-100 px-[22px] py-3.5 text-center text-[13px] font-medium text-berry-dark md:mt-14 md:py-4 md:text-sm">
          {ctaBanner.title || promoText}
        </div>
      )}

      {/* TESTIMONIALS — real Google reviews when configured, else curated
          (admin-toggleable, 3-col on desktop, white band) */}
      {(() => {
        const google = catalog.google
        const shownReviews = (google && google.reviews.length > 0 ? google.reviews : featuredReviews).slice(0, 3)
        if (vis.testimonials === false || !reviews_section || shownReviews.length === 0) return null
        return (
          <section className="bg-white px-[22px] py-8 md:py-14">
            <div className="mx-auto max-w-6xl md:px-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-[25px] text-navy md:text-[32px]">{testimonialsHeading.title}</h2>
                {google && (
                  <a
                    href={google.url || settings.business.google_business_url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[13px] font-medium text-neutral-600 hover:text-navy"
                  >
                    <span className="text-[15px] font-bold text-navy">{google.rating.toFixed(1)}</span>
                    <span className="text-[#f4a100]">★★★★★</span>
                    <span>on Google · {google.total} reviews</span>
                  </a>
                )}
              </div>
              <div className="mt-3.5 flex flex-col gap-3 md:mt-6 md:grid md:grid-cols-3 md:gap-5">
                {shownReviews.map((review) => (
                  <figure key={review.id} className="rounded-2xl border border-blush-200 bg-white p-4 md:p-6">
                    <div className="text-sm text-berry">{'★'.repeat(review.rating)}</div>
                    <blockquote className="mt-2 text-[14px] leading-relaxed text-neutral-600 md:text-[15px]">
                      “{review.body}”
                    </blockquote>
                    <figcaption className="mt-2 text-[13px] font-medium text-navy md:mt-3">{review.author}</figcaption>
                  </figure>
                ))}
              </div>
              {google && (
                <p className="mt-4 text-[11px] text-neutral-400">Reviews from Google</p>
              )}
            </div>
          </section>
        )
      })()}

      {/* FAQ — admin add/edit/delete; hidden when empty (pink band) */}
      {homeFaq.length > 0 && (
        <section className="bg-blush-100 px-[22px] py-8 md:py-14">
          <div className="mx-auto max-w-3xl md:px-8">
            <h2 className="font-display text-[25px] text-navy md:text-center md:text-[32px]">Questions, answered</h2>
            <div className="mt-3.5 flex flex-col gap-2.5 md:mt-8">
              {homeFaq.map((item, i) => (
                <FaqRow key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY — admin-uploaded photos, toggleable */}
      <GallerySection />

      {/* FINAL WHATSAPP CTA (white band) */}
      {waNumber && (
        <section className="bg-white px-[22px] pb-9 pt-7 md:pb-16 md:pt-14">
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to place an order.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto flex max-w-md items-center justify-center gap-2.5 rounded-2xl bg-[#25d366] py-4 text-[17px] font-bold text-white shadow-[0_14px_26px_-12px_rgba(37,211,102,0.9)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 11.6a8.4 8.4 0 0 1-12.4 7.4L4 20.5l1.6-4.4A8.4 8.4 0 1 1 21 11.6Z" />
            </svg>
            Order on WhatsApp
          </a>
        </section>
      )}
    </div>
  )
}

// A single expandable FAQ row (accordion). Collapsed by default.
function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-blush-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <span className="text-[15px] font-medium text-navy">{q}</span>
        <span className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <p className="whitespace-pre-line border-t border-blush-100 px-4 pb-4 pt-3 text-[14px] leading-relaxed text-neutral-600">
          {a}
        </p>
      )}
    </div>
  )
}
