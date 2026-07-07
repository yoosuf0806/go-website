import { Link } from 'react-router-dom'
import type { CatalogProduct, CatalogPackage } from '../../types/catalog'
import { formatLKR } from '../../lib/format'
import BrownieImage from './BrownieImage'

interface ProductTileProps {
  product: CatalogProduct
  packages: CatalogPackage[]
}

// Reference-style catalogue card: white card, image with hover zoom + "View
// Product" overlay, brand tag, name, and "From LKR X". Links to the product page.
export default function ProductTile({ product, packages }: ProductTileProps) {
  const available = packages.filter((p) => !p.isSlab || product.isSlabAvailable)
  const minPieces = available.reduce((m, p) => Math.min(m, p.pieceCount), Infinity)
  const fromPrice = Number.isFinite(minPieces) ? product.pricePerPiece * minPieces : product.pricePerPiece
  const soldOut = !product.inStock

  return (
    <Link
      to={`/shop/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-1.5 hover:shadow-xl"
    >
      <div className="relative aspect-square overflow-hidden bg-warmgray">
        <BrownieImage
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        {soldOut ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-navy px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Sold out
          </span>
        ) : (
          product.isSlabAvailable && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-navy">
              Customise
            </span>
          )
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-navy/45 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-white px-6 py-2.5 text-[13px] font-bold text-navy">
            View Product
          </span>
        </div>
      </div>
      <div className="px-4 pb-4 pt-3.5">
        <p className="text-[10px] uppercase tracking-[0.06em] text-neutral-400">Golden Oven</p>
        <h3 className="mt-0.5 font-display text-[0.95rem] text-navy">{product.name}</h3>
        <p className="mt-1.5 text-sm font-bold text-navy">
          From {formatLKR(fromPrice)}
          <span className="ml-1 font-normal text-neutral-400">/ box</span>
        </p>
      </div>
    </Link>
  )
}
