import { Link } from 'react-router-dom'
import { useCatalog } from '../contexts/CatalogContext'
import { toWhatsAppNumber } from '../lib/format'
import { formatLKR } from '../lib/format'
import HeroCarousel from '../components/storefront/HeroCarousel'
import ProductTile from '../components/storefront/ProductTile'
import BrownieImage from '../components/storefront/BrownieImage'
import Seo, { organizationJsonLd } from '../components/Seo'

// Home — matches the Blush & Ink mockup (screen 01): a tight mobile column of
// blush/white/navy bands. Every section's copy still comes from the editable
// content blob (admin Content module) with DEFAULT_CONTENT fallbacks, and the
// same section-visibility toggles still gate Trust / Hot Picks / CTA banner /
// testimonials, so nothing in the admin panel breaks.
export default function Home() {
  const { catalog } = useCatalog()
  const { reviews: featuredReviews, settings, content, products, packages } = catalog
  const { reviews_section } = settings.features
  const { hero, trust, ctaBanner, testimonialsHeading } = content
  const vis = content.sectionVisibility

  const hotPicks = products.filter((p) => p.isHotPick && p.inStock)
  const heroImage = hotPicks.find((p) => p.imageUrl)?.imageUrl ?? products.find((p) => p.imageUrl)?.imageUrl ?? null
  const slabCat = content.categories.find((c) => /slab/i.test(c.title))
  const slabImage = slabCat?.imageUrl ?? heroImage
  const flavours = products.filter((p) => p.inStock).slice(0, 5)
  const waNumber = toWhatsAppNumber(settings.business.whatsapp_number)
  const promoText = content.promoMessages[0]

  return (
    <div className="mx-auto max-w-md">
      <Seo
        title={content.seo.home.title}
        description={content.seo.home.description}
        path="/"
        jsonLd={[organizationJsonLd()]}
      />

      {/* HERO — admin image carousel if slides exist, else the blush hero */}
      {content.heroSlides.length > 0 ? (
        <HeroCarousel slides={content.heroSlides} primaryCta={hero.primaryCta} secondaryCta={hero.secondaryCta} />
      ) : (
        <section className="bg-blush-100 px-[22px] pb-7 pt-[72px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-berry">Handmade in Colombo</p>
          <h1 className="mt-3 font-display text-[40px] leading-[1.02] tracking-[-0.015em] text-navy">
            {hero.title} <em className="not-italic text-pink">{hero.highlight}</em> {hero.titleAfter}
          </h1>
          <p className="mt-3 max-w-[290px] text-[15px] leading-relaxed text-[#6b4450]">{hero.subtitle}</p>
          <div className="mt-5 aspect-[290/250] overflow-hidden rounded-[18px] bg-navy">
            {heroImage && <BrownieImage src={heroImage} alt="Golden Oven brownies" className="h-full w-full" />}
          </div>
          <Link
            to="/shop"
            className="mt-[18px] block rounded-2xl bg-pink py-4 text-center text-base font-bold text-white transition-colors hover:bg-pink-dark"
          >
            {hero.primaryCta}
          </Link>
        </section>
      )}

      {/* TRUST STRIP — navy, 3 stats */}
      {vis.trust !== false && trust.length > 0 && (
        <div className="flex bg-navy text-blush-50">
          {trust.map((t, i) => (
            <div
              key={t.title}
              className={`flex-1 px-2 py-3.5 text-center ${i < trust.length - 1 ? 'border-r border-blush-50/15' : ''}`}
            >
              <div className="font-display text-base text-[#f4b9c8]">{t.title}</div>
              <div className="pt-0.5 text-[11px] opacity-65">{t.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* HOT PICKS — horizontal snap carousel */}
      {vis.hotPicks !== false && hotPicks.length > 0 && (
        <section className="pb-1 pt-6">
          <div className="flex items-baseline justify-between px-[22px] pb-3.5">
            <h2 className="font-display text-[25px] text-navy">Hot Picks</h2>
            <Link to="/shop" className="text-sm font-medium text-[#c02249]">
              See all
            </Link>
          </div>
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-[22px] pb-1.5">
            {hotPicks.map((product) => (
              <div key={product.id} className="w-[170px] flex-none snap-start">
                <ProductTile product={product} packages={packages} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BUILD YOUR OWN SLAB */}
      <section className="px-[22px] pt-6">
        <div className="rounded-[20px] border border-blush-200 bg-white p-5">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-berry">Free lettering</span>
          <h2 className="mt-2 font-display text-[27px] leading-[1.14] text-navy">Build your own slab</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#5c4450]">
            9, 12 or 15 pieces. Your flavours, their name on top.
          </p>
          <div className="mt-4 aspect-[326/140] overflow-hidden rounded-[14px] bg-blush-50">
            {slabImage && <BrownieImage src={slabImage} alt="Brownie slab" className="h-full w-full" />}
          </div>
          <Link
            to="/shop"
            className="mt-4 block rounded-2xl bg-navy py-4 text-center text-base font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            Build Your Slab
          </Link>
        </div>
      </section>

      {/* THE FLAVOURS — list rows */}
      {flavours.length > 0 && (
        <section className="px-[22px] pt-6">
          <h2 className="font-display text-[25px] text-navy">The flavours</h2>
          <div className="mt-1 flex flex-col">
            {flavours.map((f, i) => (
              <Link
                key={f.id}
                to={`/shop/${f.slug}`}
                className="flex items-center gap-3 border-b border-blush-200 py-3.5 last:border-b-0"
              >
                <span className="w-5 text-[13px] font-medium text-berry">{String(i + 1).padStart(2, '0')}</span>
                <div className="h-14 w-14 flex-none overflow-hidden rounded-xl bg-white">
                  {f.imageUrl && <BrownieImage src={f.imageUrl} alt={f.name} className="h-full w-full" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[17px] text-navy">{f.name}</div>
                  <div className="truncate pt-0.5 text-[13px] text-neutral-500">
                    From {formatLKR(f.pricePerPiece)} / pc
                  </div>
                </div>
                <span className="text-lg text-berry">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CORPORATE BAND — navy */}
      <section className="mt-6 bg-navy px-[22px] py-7 text-blush-50">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#f4b9c8]">Corporate</span>
        <h2 className="mt-2 font-display text-[27px] leading-[1.14] text-white">50 boxes. One invoice.</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-blush-50/70">
          Branded toppers, scheduled delivery, formal quotation.
        </p>
        <Link
          to="/corporate"
          className="mt-4 block rounded-2xl bg-pink py-4 text-center text-base font-bold text-white transition-colors hover:bg-pink-dark"
        >
          Request a Quote
        </Link>
      </section>

      {/* IT ARRIVES GIFT-READY — horizontal image scroller */}
      <section className="px-[22px] pt-7">
        <h2 className="font-display text-[25px] leading-tight text-navy">It arrives gift-ready</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-[#5c4450]">
          Red box, white satin ribbon, foil wordmark. Nothing to re-wrap.
        </p>
        <div className="no-scrollbar mt-3.5 flex gap-2.5 overflow-x-auto pb-1">
          {(hotPicks.length ? hotPicks : products)
            .filter((p) => p.imageUrl)
            .slice(0, 4)
            .map((p) => (
              <div key={p.id} className="h-[150px] w-[200px] flex-none overflow-hidden rounded-[14px] bg-blush-100">
                <BrownieImage src={p.imageUrl} alt={p.name} className="h-full w-full" />
              </div>
            ))}
        </div>
      </section>

      {/* ORDER IN ONE MESSAGE — WhatsApp reassurance card */}
      <section className="px-[22px] pt-6">
        <div className="rounded-[18px] border border-blush-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#25d366]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
                <path d="M21 11.6a8.4 8.4 0 0 1-12.4 7.4L4 20.5l1.6-4.4A8.4 8.4 0 1 1 21 11.6Z" />
              </svg>
            </span>
            <div>
              <div className="font-display text-[17px] text-navy">Order in one message</div>
              <div className="pt-0.5 text-[13px] leading-relaxed text-neutral-500">
                No card needed. We confirm everything on WhatsApp.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER — kept (admin-toggleable), styled as the mockup's promo ticker */}
      {vis.ctaBanner !== false && promoText && (
        <div className="mt-6 bg-blush-100 px-[22px] py-3.5 text-center text-[13px] font-medium text-berry-dark">
          {ctaBanner.title || promoText}
        </div>
      )}

      {/* TESTIMONIALS — kept below the fold, admin-toggleable */}
      {vis.testimonials !== false && reviews_section && featuredReviews.length > 0 && (
        <section className="px-[22px] pt-7">
          <h2 className="font-display text-[25px] text-navy">{testimonialsHeading.title}</h2>
          <div className="mt-3.5 flex flex-col gap-3">
            {featuredReviews.slice(0, 3).map((review) => (
              <figure key={review.id} className="rounded-2xl border border-blush-200 bg-white p-4">
                <div className="text-sm text-berry">{'★'.repeat(review.rating)}</div>
                <blockquote className="mt-2 text-[14px] leading-relaxed text-neutral-600">“{review.body}”</blockquote>
                <figcaption className="mt-2 text-[13px] font-medium text-navy">{review.author}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FINAL WHATSAPP CTA */}
      {waNumber && (
        <section className="px-[22px] pb-9 pt-7">
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to place an order.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#25d366] py-4 text-[17px] font-bold text-white shadow-[0_14px_26px_-12px_rgba(37,211,102,0.9)]"
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
