import { useCatalog } from '../../contexts/CatalogContext'
import { cdnUrl } from '../../lib/images'

// Shared photo gallery ("View our Gallery") shown on Home, Wedding, and
// Corporate. Admin-uploaded images (content.gallery), toggleable via
// content.sectionVisibility.gallery. Rendered as a Pinterest-style masonry
// (CSS columns) so mixed-aspect photos tile without cropping.
export default function GallerySection() {
  const { catalog } = useCatalog()
  const { gallery, galleryHeading, sectionVisibility } = catalog.content

  if (sectionVisibility.gallery === false || gallery.length === 0) return null

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-[22px] md:px-8">
        <h2 className="font-display text-[27px] text-navy md:text-[34px]">{galleryHeading}</h2>
        <div className="mt-6 gap-3 [column-fill:_balance] columns-2 md:columns-3 md:gap-4 lg:columns-4">
          {gallery.map((url, i) => (
            <div key={i} className="mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-blush-50 md:mb-4">
              <img src={cdnUrl(url)} alt={`Golden Oven gallery ${i + 1}`} loading="lazy" className="w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
