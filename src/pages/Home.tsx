import { Link } from 'react-router-dom'
import { useCatalog } from '../contexts/CatalogContext'
import { toWhatsAppNumber } from '../lib/format'
import Slideshow from '../components/storefront/Slideshow'
import HeroCarousel from '../components/storefront/HeroCarousel'
import ProductTile from '../components/storefront/ProductTile'
import Seo, { organizationJsonLd } from '../components/Seo'

// Home — reference-matched landing page. Every section's copy comes from the
// editable content blob (admin Content module), with DEFAULT_CONTENT fallbacks.
export default function Home() {
  const { catalog } = useCatalog()
  const { reviews: featuredReviews, settings, content, products, packages } = catalog
  const { reviews_section } = settings.features
  const { hero, trust, categories, ctaBanner, howItWorks, badges, testimonialsHeading } = content
  const vis = content.sectionVisibility

  // Hot picks: admin-flagged products, shown below the hero. The catalog only
  // contains visible products already, so we just require in-stock so the
  // section never points at a sold-out product.
  const hotPicks = products.filter((p) => p.isHotPick && p.inStock)
  const heroImage = hotPicks.find((p) => p.imageUrl)?.imageUrl ?? products.find((p) => p.imageUrl)?.imageUrl ?? null
  const slabTile = categories.find((c) => /slab/i.test(c.title))
  const slabImage = slabTile?.imageUrl ?? heroImage
  const bulkTile = categories.find((c) => /bulk|corporate|wedding/i.test(c.title))
  const bulkImage =
    products.find((p) => p.isCorporate && p.imageUrl)?.imageUrl ?? bulkTile?.imageUrl ?? heroImage
  const flavourGrid = products.filter((p) => p.inStock).slice(0, 8)
  const waNumber = toWhatsAppNumber(settings.business.whatsapp_number)

  return (
    <div>
      <Seo
        title={content.seo.home.title}
        description={content.seo.home.description}
        path="/"
        jsonLd={[organizationJsonLd()]}
      />
      {/* HERO — admin image carousel if slides exist, else the full-bleed hero */}
      {content.heroSlides.length > 0 ? (
        <HeroCarousel
          slides={content.heroSlides}
          primaryCta={hero.primaryCta}
          secondaryCta={hero.secondaryCta}
        />
      ) : (
        <section
          className="relative flex min-h-[620px] items-center overflow-hidden bg-navy"
          style={
            heroImage
              ? {
                  backgroundImage: `linear-gradient(135deg, rgba(26,10,0,0.9) 0%, rgba(45,15,5,0.72) 50%, rgba(26,10,0,0.94) 100%), url(${heroImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        >
          <div className="relative mx-auto w-full max-w-6xl px-6 py-24">
            <div className="max-w-xl">
              <p className="mb-5 text-xs font-bold uppercase tracking-[4px] text-pink">Homemade · Halal · Colombo</p>
              <h1 className="text-[clamp(2.3rem,6vw,4.5rem)] leading-[1.05] text-white text-balance">
                {hero.title} <em className="not-italic text-pink">{hero.highlight}</em> {hero.titleAfter}
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">{hero.subtitle}</p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/shop"
                  className="rounded-full bg-pink px-8 py-4 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(217,45,86,0.4)] transition-all hover:-translate-y-0.5 hover:bg-pink-dark"
                >
                  {hero.primaryCta}
                </Link>
                <Link
                  to="/corporate"
                  className="rounded-full border-[1.5px] border-white/80 px-7 py-4 text-[15px] font-bold text-white transition-colors hover:bg-white hover:text-navy"
                >
                  {hero.secondaryCta}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HOT PICKS — admin-flagged featured products, directly below the hero */}
      {vis.hotPicks !== false && hotPicks.length > 0 && (
        <section className="px-6 pb-6 pt-4">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] text-navy">Hot Picks 🔥</h2>
                <p className="mt-1 text-neutral-500">Our most-loved brownies right now.</p>
              </div>
              <Link
                to="/shop"
                className="hidden whitespace-nowrap rounded-full border-2 border-navy px-5 py-2 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white sm:inline-block"
              >
                View all
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {hotPicks.map((product) => (
                <ProductTile key={product.id} product={product} packages={packages} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TRUST BAR */}
      {vis.trust !== false && (
      <div className="bg-pink-light py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
          {trust.map((t) => (
            <Trust key={t.title} icon={t.icon} title={t.title} body={t.body} />
          ))}
        </div>
      </div>
      )}

      {/* SLIDESHOW */}
      {vis.slideshow !== false && <Slideshow promoSlides={content.promoSlides} />}

      {/* SLAB SPOTLIGHT — "Say It With a Brownie Slab" */}
      <section className="bg-warmgray px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <div
            className="aspect-square rounded-[20px] bg-navy bg-cover bg-center shadow-[0_30px_60px_rgba(26,10,0,0.2)]"
            style={slabImage ? { backgroundImage: `url(${slabImage})` } : undefined}
          />
          <div>
            <span className="inline-block rounded-full bg-pink px-4 py-1.5 text-xs font-bold tracking-wide text-white">
              ⭐ OUR SIGNATURE
            </span>
            <h2 className="mt-5 text-[clamp(1.8rem,4vw,3rem)] text-navy">Say It With a Brownie Slab.</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-[#5a4038]">
              Write anything on it — Happy Birthday, Sorry My Love, I Love You Mom. Our custom brownie slabs are
              the gift nobody expects but everyone remembers.
            </p>
            <ul className="mt-7 flex flex-col gap-3.5">
              {[
                'Custom letter toppings',
                'Choice of sparkles & drizzle',
                'Feeds 8–12 people',
                'Baked fresh to order, never pre-made',
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-[15px] font-medium text-navy">
                  <span className="text-lg font-extrabold text-pink">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/shop"
              className="mt-8 inline-block rounded-full bg-pink px-8 py-4 text-[15px] font-bold text-white shadow-[0_10px_26px_rgba(217,45,86,0.32)] transition-transform hover:-translate-y-0.5"
            >
              Customise Your Slab →
            </Link>
          </div>
        </div>
      </section>

      {/* FLAVOUR GRID — "Pick Your Flavour" */}
      {flavourGrid.length > 0 && (
        <section className="bg-white px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeader title="Pick Your Flavour 🍫" sub="Every brownie baked fresh. Never pre-made, never sitting." />
            <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
              {flavourGrid.map((product) => (
                <ProductTile key={product.id} product={product} packages={packages} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/shop"
                className="inline-block rounded-full border-2 border-navy px-7 py-3 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                Browse All Brownies →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CATEGORY GRID */}
      {vis.categories !== false && (
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            title="Find Your Perfect Box"
            sub="Browse by occasion — from everyday treats to corporate gifts and wedding favours."
          />
          <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {categories.map((c, i) => (
              <CategoryCard
                key={c.title}
                to={c.to}
                gradient={CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length]}
                emoji={c.emoji}
                imageUrl={c.imageUrl}
                title={c.title}
                body={c.body}
                cta={c.cta}
              />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CORPORATE / BULK ORDERS CTA — split image + copy */}
      <section className="bg-pink px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)] leading-tight">Gifting for Your Team or Event?</h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-white/90">
              We handle everything — custom quantities, gift packaging, and island-wide delivery. Perfect for
              office events, client appreciation, and team celebrations.
            </p>
            <Link
              to="/corporate"
              className="mt-7 inline-block rounded-full bg-white px-8 py-4 text-[15px] font-bold text-pink transition-transform hover:-translate-y-0.5"
            >
              Get a Quote on WhatsApp
            </Link>
          </div>
          <div
            className="aspect-[4/3] rounded-[18px] bg-[#a03040] bg-cover bg-center shadow-[0_20px_44px_rgba(0,0,0,0.25)]"
            style={bulkImage ? { backgroundImage: `url(${bulkImage})` } : undefined}
          />
        </div>
      </section>

      {/* CTA BANNER */}
      {vis.ctaBanner !== false && (
      <section className="bg-pink px-6 py-20 text-center text-white">
        <h2 className="text-[clamp(2rem,4vw,3.5rem)]">{ctaBanner.title}</h2>
        <p className="mx-auto mt-4 max-w-md text-lg opacity-90">{ctaBanner.body}</p>
        <Link
          to="/shop"
          className="mt-8 inline-block rounded-full bg-white px-11 py-4 font-display text-lg text-pink transition-transform hover:-translate-y-0.5"
        >
          {ctaBanner.cta}
        </Link>
      </section>
      )}

      {/* HOW IT WORKS */}
      {vis.howItWorks !== false && (
      <section className="bg-navy px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader title="How It Works" sub="From box to door in 4 simple steps." dark />
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step) => (
              <Step key={step.title} n={step.icon} title={step.title} body={step.body} />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* TESTIMONIALS */}
      {vis.testimonials !== false && reviews_section && featuredReviews.length > 0 && (
        <section className="bg-pink-light px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeader title={testimonialsHeading.title} sub={testimonialsHeading.sub} />
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {featuredReviews.slice(0, 3).map((review) => (
                <figure key={review.id} className="rounded-[20px] border-l-4 border-pink bg-white p-8">
                  <div className="tracking-[2px] text-[#f4a100]">{'★'.repeat(review.rating)}</div>
                  <blockquote className="mt-4 text-sm italic leading-relaxed text-neutral-700">
                    “{review.body}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-light text-xl">
                      🧁
                    </span>
                    <span className="text-[13px] font-bold text-navy">{review.author}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA — Ready to Order? */}
      {waNumber && (
        <section className="bg-navy px-6 py-24 text-center text-white">
          <div className="mx-auto max-w-xl">
            <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)]">Ready to Order?</h2>
            <p className="mt-3 text-[17px] text-white/75">Call or WhatsApp us — we'll sort everything.</p>
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to place an order.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block animate-pulse rounded-full bg-pink px-10 py-[18px] text-lg font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              📱 Order on WhatsApp
            </a>
          </div>
        </section>
      )}

      {/* BADGE STRIP */}
      <div className="bg-warmgray px-6 py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 lg:grid-cols-4">
          {badges.map((b) => (
            <Badge key={b.title} icon={b.icon} title={b.title} body={b.body} />
          ))}
        </div>
      </div>
    </div>
  )
}

const CATEGORY_GRADIENTS = [
  'from-[#fce4ec] to-[#f8bbd0]',
  'from-[#e8eaf6] to-[#c5cae9]',
  'from-[#fff3e0] to-[#ffe0b2]',
  'from-[#f3e5f5] to-[#e1bee7]',
]

function SectionHeader({ title, sub, dark = false }: { title: string; sub: string; dark?: boolean }) {
  return (
    <div className="text-center">
      <h2 className={`text-[clamp(2rem,4vw,3rem)] ${dark ? 'text-white' : 'text-navy'}`}>{title}</h2>
      <p className={`mx-auto mt-3 max-w-xl leading-relaxed ${dark ? 'text-white/70' : 'text-neutral-500'}`}>{sub}</p>
    </div>
  )
}

function Trust({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div>
      <div className="text-3xl">{icon}</div>
      <strong className="mt-2 block font-display text-2xl font-extrabold text-pink">{title}</strong>
      <p className="text-[13px] font-semibold text-[#a03040]">{body}</p>
    </div>
  )
}

function CategoryCard({
  to,
  gradient,
  emoji,
  imageUrl,
  title,
  body,
  cta,
}: {
  to: string
  gradient: string
  emoji: string
  imageUrl?: string
  title: string
  body: string
  cta: string
}) {
  return (
    <Link to={to} className="group relative block aspect-[3/4] overflow-hidden rounded-[20px]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-b ${gradient} text-6xl transition-transform duration-500 group-hover:scale-105`}
        >
          {emoji}
        </div>
      )}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy/85 to-transparent p-6 text-white">
        <h3 className="text-xl">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed opacity-85">{body}</p>
        <span className="mt-3 text-xs font-bold text-white/90">{cta}</span>
      </div>
    </Link>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/20 bg-pink font-display text-xl text-white shadow-lg shadow-pink/30">
        {n}
      </div>
      <h3 className="mt-5 text-base text-white">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-white/70">{body}</p>
    </div>
  )
}

function Badge({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl shadow">
        {icon}
      </div>
      <h4 className="font-display text-[15px] text-navy">{title}</h4>
      <p className="max-w-[160px] text-xs leading-relaxed text-neutral-500">{body}</p>
    </div>
  )
}
