import { Link } from 'react-router-dom'
import { featuredReviews, settings } from '../data/catalog'
import Slideshow from '../components/storefront/Slideshow'

// Home — reference-matched landing page: hero, trust bar, slideshow, occasion
// grid, CTA, how-it-works, testimonials, and a badge strip. Content is hard-
// coded here for now; it becomes admin-editable in the Content CMS chunk.
export default function Home() {
  const { reviews_section } = settings.features

  return (
    <div>
      {/* HERO */}
      <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-[clamp(2.8rem,5vw,4.2rem)] leading-[1.1] text-navy">
            Gift something they'll <em className="not-italic text-pink">actually</em> love.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-500">
            Freshly baked brownies. Islandwide delivery. Made to order — for every little celebration
            worth sharing.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/shop"
              className="rounded-full bg-pink px-8 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-pink-dark"
            >
              Shop All Brownies
            </Link>
            <Link
              to="/corporate"
              className="rounded-full border-2 border-navy px-7 py-3 text-[15px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              Corporate Gifting
            </Link>
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="grid max-w-[480px] grid-cols-2 gap-4">
            <div className="mt-8 flex aspect-square items-center justify-center rounded-[20px] bg-gradient-to-br from-[#fce4ec] to-[#fff3e0] text-6xl">
              🍫
            </div>
            <div className="-mt-8 flex aspect-square items-center justify-center rounded-[20px] bg-gradient-to-br from-[#f8bbd0] to-[#fce4ec] text-6xl">
              🍫
            </div>
            <div className="flex aspect-square items-center justify-center rounded-[20px] bg-gradient-to-br from-[#fff3e0] to-[#ffecb3] text-6xl">
              🤍
            </div>
            <div className="flex aspect-square items-center justify-center rounded-[20px] bg-gradient-to-br from-[#fce4ec] to-[#f8bbd0] text-6xl">
              ✨
            </div>
          </div>
          <div className="absolute -right-3 -top-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-navy shadow-lg">
            🎁 Gift-ready boxes
          </div>
          <div className="absolute -bottom-2 -left-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-navy shadow-lg">
            ⭐ 100+ happy customers
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="bg-navy py-8 text-white">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
          <Trust icon="🍫" title="Freshly Baked" body="Baked to order, never pre-made" />
          <Trust icon="🚚" title="Islandwide Delivery" body="Next day delivery available" />
          <Trust icon="♥️" title="Halal Certified" body="100% halal ingredients" />
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
            <CategoryCard to="/shop" gradient="from-[#fce4ec] to-[#f8bbd0]" emoji="🍫" title="Shop All" body="Browse our full collection of freshly baked brownies." cta="Browse All →" />
            <CategoryCard to="/corporate" gradient="from-[#e8eaf6] to-[#c5cae9]" emoji="🏢" title="Corporate Gifting" body="Bulk pricing for teams, events and client gifting." cta="View Range →" />
            <CategoryCard to="/corporate" gradient="from-[#fff3e0] to-[#ffe0b2]" emoji="💍" title="For Weddings" body="Elegant wedding favours with bulk pricing." cta="Explore →" />
            <CategoryCard to="/shop" gradient="from-[#f3e5f5] to-[#e1bee7]" emoji="🍰" title="Brownie Slab" body="Personalise with letter toppers and sparkles." cta="Customise →" />
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-pink px-6 py-20 text-center text-white">
        <h2 className="text-[clamp(2rem,4vw,3.5rem)]">Made for Every Little Win</h2>
        <p className="mx-auto mt-4 max-w-md text-lg opacity-90">
          From birthday boxes to corporate hampers — freshly baked, islandwide delivery, made to
          order.
        </p>
        <Link
          to="/shop"
          className="mt-8 inline-block rounded-full bg-white px-11 py-4 font-display text-lg text-pink transition-transform hover:-translate-y-0.5"
        >
          Browse All Brownies →
        </Link>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-warmgray px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader title="How It Works" sub="From box to door in 4 simple steps." />
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Step n={1} title="Choose a Category" body="Browse Shop All, Corporate, Wedding, or Brownie Slab." />
            <Step n={2} title="Pick Your Package" body="Select a 9, 12, or 15-piece box, or a slab." />
            <Step n={3} title="Personalise It" body="Letter toppers and sparkles on slab orders." />
            <Step n={4} title="We Deliver Fresh" body="Baked fresh and delivered to your door, islandwide." />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {reviews_section && featuredReviews.length > 0 && (
        <section className="bg-pink-light px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeader title="Little Wins, Big Smiles" sub="What our customers are saying." />
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
          <Badge icon="🍫" title="Baked Fresh Daily" body="Every order baked to order — never stored, never stale" />
          <Badge icon="🚚" title="Islandwide Delivery" body="We deliver across Sri Lanka — next day options available" />
          <Badge icon="🌙" title="100% Halal" body="All ingredients fully halal certified — everyone can enjoy" />
          <Badge icon="🎁" title="Gift-Ready Boxes" body="Beautiful packaging — ready to give straight from the box" />
        </div>
      </div>
    </div>
  )
}

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

function Step({ n, title, body }: { n: number; title: string; body: string }) {
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
