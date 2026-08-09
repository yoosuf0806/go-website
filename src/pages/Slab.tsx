import { useCatalog } from '../contexts/CatalogContext'
import ProductTile from '../components/storefront/ProductTile'
import BrownieImage from '../components/storefront/BrownieImage'
import Accordion from '../components/storefront/Accordion'
import Seo from '../components/Seo'

// Brownie Slab landing page (/slab). Banner + how-it-works + a flavour picker
// driven LIVE by slab-enabled products (12pc or 15pc slab), an admin-managed
// product gallery, and an admin-editable FAQ. Copy/images come from
// content.slab; the flavour list is read from the catalog so it never drifts
// from what's actually orderable.
export default function Slab() {
  const { catalog } = useCatalog()
  const { content, products, packages } = catalog
  const slab = content.slab

  // Slab-enabled = orderable as the 12pc slab OR the 15pc slab.
  const slabProducts = products.filter((p) => p.isSlabAvailable || p.isSlab15Available)

  return (
    <div className="bg-blush-50">
      <Seo title={slab.banner.title} description={content.seo.slab.description} path="/slab" />

      {/* ── BANNER — same light two-column format as the Home hero, so the
          uploaded image shows at full opacity instead of a dimmed backdrop. */}
      <section className="bg-blush-100 px-[22px] pb-7 pt-[72px] md:px-8 md:py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="md:order-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-berry">
              {slab.banner.eyebrow}
            </span>
            <h1 className="mt-3 font-display text-[40px] leading-[1.02] tracking-[-0.015em] text-navy md:text-[clamp(2.6rem,4.5vw,4rem)]">
              {slab.banner.title}
            </h1>
            <p className="mt-3 max-w-[290px] text-[15px] leading-relaxed text-[#6b4450] md:max-w-md md:text-lg">
              {slab.banner.subtitle}
            </p>
            <a
              href="#flavours"
              className="mt-5 inline-block rounded-2xl bg-pink px-8 py-4 text-center text-base font-bold text-white transition-colors hover:bg-pink-dark md:mt-8"
            >
              {slab.banner.cta}
            </a>
          </div>
          <div className="aspect-[290/250] overflow-hidden rounded-[18px] bg-navy md:order-2 md:aspect-[4/3]">
            {slab.banner.imageUrl && (
              <BrownieImage src={slab.banner.imageUrl} alt="" className="h-full w-full" priority />
            )}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      {slab.howItWorks.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-10 md:py-14">
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {slab.howItWorks.map((step, i) => (
              <div key={i} className="rounded-2xl border border-blush-200 bg-white p-5 text-center md:p-6">
                <div className="font-display text-lg text-navy">{step.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-[#5c4450]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CHOOSE YOUR FLAVOUR ────────────────────────────── */}
      <section id="flavours" className="mx-auto max-w-6xl px-[22px] py-10 md:px-8 md:py-14">
        <div className="pb-1 text-center">
          <h2 className="font-display text-[27px] text-navy md:text-[34px]">{slab.flavoursHeading}</h2>
          {slab.flavoursIntro && (
            <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-[#5c4450]">{slab.flavoursIntro}</p>
          )}
        </div>

        {slabProducts.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {slabProducts.map((product) => (
              <ProductTile key={product.id} product={product} packages={packages} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-[15px] text-neutral-500">
            No slab flavours are available right now — check back soon.
          </p>
        )}
      </section>

      {/* ── PRODUCT GALLERY ────────────────────────────────── */}
      {slab.gallery.length > 0 && (
        <section className="bg-white py-10 md:py-14">
          <div className="mx-auto max-w-6xl px-[22px] md:px-8">
            <h2 className="text-center font-display text-[27px] text-navy md:text-[34px]">{slab.galleryHeading}</h2>
            <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {slab.gallery.map((url, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-2xl bg-blush-50">
                  <BrownieImage src={url} alt={`Brownie slab ${i + 1}`} className="h-full w-full" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ────────────────────────────────────────────── */}
      {slab.faq.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-10 md:py-14">
          <h2 className="text-center font-display text-[27px] text-navy md:text-[34px]">{slab.faqHeading}</h2>
          <div className="mt-6">
            <Accordion items={slab.faq.map((item) => ({ title: item.q, content: item.a }))} />
          </div>
        </section>
      )}

      {/* ── STICKY CTA (mobile) ────────────────────────────── */}
      <div className="sticky bottom-0 z-20 border-t border-blush-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <a
          href="#flavours"
          className="block w-full rounded-2xl bg-pink py-3.5 text-center text-base font-bold text-white"
        >
          Order a slab
        </a>
      </div>
    </div>
  )
}
