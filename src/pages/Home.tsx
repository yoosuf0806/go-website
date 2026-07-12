import { Link } from 'react-router-dom'
import { useCatalog } from '../contexts/CatalogContext'
import Slideshow from '../components/storefront/Slideshow'
import ProductTile from '../components/storefront/ProductTile'
import Seo, { organizationJsonLd } from '../components/Seo'

// Home — reference-matched landing page. Every section's copy comes from the
// editable content blob (admin Content module), with DEFAULT_CONTENT fallbacks.
export default function Home() {
  const { catalog } = useCatalog()
  const { reviews: featuredReviews, settings, content, products, packages } = catalog
  const { reviews_section } = settings.features
  const { hero, trust, categories, ctaBanner, howItWorks, badges, testimonialsHeading } = content

  // Hot picks: admin-flagged products, shown below the hero. The catalog only
  // contains visible products already, so we just require in-stock so the
  // section never points at a sold-out product.
  const hotPicks = products.filter((p) => p.isHotPick && p.inStock)

  return (
    <div>
      <Seo
        title={content.seo.home.title}
        description={content.seo.home.description}
        path="/"
        jsonLd={[organizationJsonLd()]}
      />
      {/* HERO */}
      <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-[clamp(2.8rem,5vw,4.2rem)] leading-[1.1] text-navy">
            {hero.title} <em className="not-italic text-pink">{hero.highlight}</em> {hero.titleAfter}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-500">{hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/shop"
              className="rounded-full bg-pink px-8 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-pink-dark"
            >
              {hero.primaryCta}
            </Link>
            <Link
              to="/corporate"
              className="rounded-full border-2 border-navy px-7 py-3 text-[15px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              {hero.secondaryCta}
            </Link>
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="grid max-w-[480px] grid-cols-2 gap-4">
            {['🍫', '🍫', '🤍', '✨'].map((e, i) => (
              <div
                key={i}
                className={`flex aspect-square items-center justify-center rounded-[20px] text-6xl ${
                  i === 0
                    ? 'mt-8 bg-gradient-to-br from-[#fce4ec] to-[#fff3e0]'
                    : i === 1
                      ? '-mt-8 bg-gradient-to-br from-[#f8bbd0] to-[#fce4ec]'
                      : i === 2
                        ? 'bg-gradient-to-br from-[#fff3e0] to-[#ffecb3]'
                        : 'bg-gradient-to-br from-[#fce4ec] to-[#f8bbd0]'
                }`}
              >
                {e}
              </div>
            ))}
          </div>
          <div className="absolute -right-3 -top-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-navy shadow-lg">
            🎁 Gift-ready boxes
          </div>
          <div className="absolute -bottom-2 -left-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-navy shadow-lg">
            ⭐ 100+ happy customers
          </div>
        </div>
      </section>

      {/* HOT PICKS — admin-flagged featured products, directly below the hero */}
      {hotPicks.length > 0 && (
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
      <div className="bg-navy py-8 text-white">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
          {trust.map((t) => (
            <Trust key={t.title} icon={t.icon} title={t.title} body={t.body} />
          ))}
        </div>
      </div>

      {/* SLIDESHOW */}
      <Slideshow />

      {/* CATEGORY GRID */}
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
                title={c.title}
                body={c.body}
                cta={c.cta}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
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

      {/* HOW IT WORKS */}
      <section className="bg-warmgray px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader title="How It Works" sub="From box to door in 4 simple steps." />
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step) => (
              <Step key={step.title} n={step.icon} title={step.title} body={step.body} />
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {reviews_section && featuredReviews.length > 0 && (
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

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center">
      <h2 className="text-[clamp(2rem,4vw,3rem)] text-navy">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl leading-relaxed text-neutral-500">{sub}</p>
    </div>
  )
}

function Trust({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div>
      <div className="text-3xl">{icon}</div>
      <strong className="mt-2 block font-display text-base font-normal text-pink">{title}</strong>
      <p className="text-[13px] text-white/80">{body}</p>
    </div>
  )
}

function CategoryCard({
  to,
  gradient,
  emoji,
  title,
  body,
  cta,
}: {
  to: string
  gradient: string
  emoji: string
  title: string
  body: string
  cta: string
}) {
  return (
    <Link to={to} className="group relative block aspect-[3/4] overflow-hidden rounded-[20px]">
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-b ${gradient} text-6xl transition-transform duration-500 group-hover:scale-105`}
      >
        {emoji}
      </div>
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
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-pink font-display text-xl text-white shadow-lg shadow-pink/30">
        {n}
      </div>
      <h3 className="mt-5 text-base text-navy">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">{body}</p>
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
