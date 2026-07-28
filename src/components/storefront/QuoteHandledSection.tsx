// "Everything Handled for You" — an image + checklist section matching the
// reference template, with a CTA that scrolls down to the quote form.
export default function QuoteHandledSection({
  heading,
  imageUrl,
  items,
  cta,
  ctaHref,
}: {
  heading: string
  imageUrl?: string
  items: string[]
  cta: string
  ctaHref: string
}) {
  return (
    <section className="bg-cream px-6 py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-pink-light shadow-[0_20px_44px_rgba(0,0,0,0.1)]">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[6rem]">🍫</div>
          )}
        </div>
        <div>
          <h2 className="font-display text-[clamp(1.6rem,3vw,2.3rem)] font-semibold text-navy">{heading}</h2>
          <ul className="mt-6 flex flex-col gap-3">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] text-neutral-700">
                <span className="mt-0.5 text-pink" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <a
            href={ctaHref}
            className="mt-8 inline-block rounded-full bg-pink px-8 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_26px_rgba(217,45,86,0.32)] transition-transform hover:-translate-y-0.5"
          >
            {cta}
          </a>
        </div>
      </div>
    </section>
  )
}
