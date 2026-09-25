import type { CatalogProduct } from '../../types/catalog'
import { formatLKR } from '../../lib/format'
import { cdnUrl, imgError } from '../../lib/images'

// Visual flavour menu for the corporate & wedding quote pages: each flavour as
// an image + name + per-piece price, so a customer browsing a bulk order can
// see what's on offer before filling in the quote form. Purely informational —
// the actual flavour choice still happens in the form's chips / the follow-up
// conversation. Fed the same isCorporate product list the form uses, so admin
// controls it entirely through product flags, images and prices.
export default function FlavorShowcase({
  flavors,
  heading = 'Our brownie flavours',
  subheading = 'Pick and mix across any of these for your order — prices are per piece.',
}: {
  flavors: CatalogProduct[]
  heading?: string
  subheading?: string
}) {
  if (flavors.length === 0) return null

  return (
    <section className="px-6 pt-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-2xl text-navy sm:text-3xl">{heading}</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[15px] leading-relaxed text-[#7a5c64]">
          {subheading}
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {flavors.map((f) => (
            <li
              key={f.id}
              className="overflow-hidden rounded-2xl border border-blush-200 bg-white"
            >
              <div className="aspect-square w-full bg-blush-50">
                {f.imageUrl ? (
                  <img
                    src={cdnUrl(f.imageUrl)}
                    data-fallback-src={f.imageUrl}
                    onError={imgError}
                    alt={f.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">🍫</div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[14px] font-semibold leading-tight text-navy">{f.name}</p>
                <p className="mt-0.5 text-[13px] text-[#7a5c64]">
                  {formatLKR(f.pricePerPiece)} <span className="text-[#a98a92]">/ piece</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
