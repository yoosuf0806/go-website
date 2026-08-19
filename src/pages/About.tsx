import { Link } from 'react-router-dom'
import { useCatalog } from '../contexts/CatalogContext'
import BrownieImage from '../components/storefront/BrownieImage'
import Seo, { breadcrumbJsonLd } from '../components/Seo'

// About Us page (/about). All copy comes from content.about (admin-editable):
// a hero (title + intro + optional image), a plain-text story body (blank lines
// separate paragraphs), and an optional "what we stand for" value grid. Empty
// fields hide their block, so the page always renders cleanly.
export default function About() {
  const { catalog } = useCatalog()
  const { content } = catalog
  const about = content.about
  const paragraphs = about.body.split(/\n\s*\n/).filter((p) => p.trim() !== '')

  return (
    <div className="bg-blush-50">
      <Seo
        title={content.seo.about.title}
        description={content.seo.about.description}
        path="/about"
        image={about.imageUrl ?? undefined}
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: about.title, path: '/about' },
          ]),
        ]}
      />

      {/* HERO */}
      <section className="bg-blush-100 px-[22px] py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <nav className="flex items-center gap-2 text-[13px] text-neutral-400">
              <Link to="/" className="hover:text-pink">
                Home
              </Link>
              <span>/</span>
              <span className="text-neutral-500">{about.title}</span>
            </nav>
            <h1 className="mt-3 font-display text-[40px] leading-[1.02] tracking-[-0.015em] text-navy md:text-[clamp(2.4rem,4vw,3.5rem)]">
              {about.title}
            </h1>
            {about.intro && (
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#6b4450] md:text-lg">{about.intro}</p>
            )}
          </div>
          {about.imageUrl && (
            <div className="aspect-[4/3] overflow-hidden rounded-[18px] bg-navy">
              <BrownieImage src={about.imageUrl} alt={about.title} className="h-full w-full" priority />
            </div>
          )}
        </div>
      </section>

      {/* STORY BODY */}
      {paragraphs.length > 0 && (
        <section className="px-[22px] py-12 md:py-16">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line text-[15px] leading-relaxed text-neutral-600 md:text-base">
                {p}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* VALUES GRID */}
      {about.values.length > 0 && (
        <section className="bg-white px-[22px] py-12 md:py-16">
          <div className="mx-auto max-w-6xl md:px-8">
            <h2 className="font-display text-[25px] text-navy md:text-center md:text-[32px]">What we stand for</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-10 md:grid-cols-4">
              {about.values.map((v, i) => (
                <div key={i} className="rounded-2xl border border-blush-200 bg-blush-50 p-5 text-center md:p-6">
                  <div className="text-3xl">{v.icon}</div>
                  <div className="mt-2 font-display text-[18px] text-navy">{v.title}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-navy px-[22px] py-12 text-center text-blush-50 md:py-16">
        <h2 className="font-display text-[27px] text-white md:text-[34px]">Ready to order?</h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-blush-50/70">
          Browse our freshly baked brownies and gift boxes — delivered islandwide.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-block rounded-2xl bg-pink px-8 py-4 text-base font-bold text-white transition-colors hover:bg-pink-dark"
        >
          Shop All Brownies
        </Link>
      </section>
    </div>
  )
}
