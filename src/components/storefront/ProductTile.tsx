import { Link } from 'react-router-dom'
import type { CatalogProduct, CatalogPackage } from '../../types/catalog'
import { formatLKR } from '../../lib/format'
import BrownieImage from './BrownieImage'

interface ProductTileProps {
  product: CatalogProduct
  packages: CatalogPackage[]
}

// Presentational catalogue card (browniegod-style): image, name, "From Rs. X".
// Clicking opens the product detail page where configuration happens — the card
// itself no longer configures (cleaner flow + each product gets its own URL).
export default function ProductTile({ product, packages }: ProductTileProps) {
  const available = packages.filter((p) => !p.isSlab || product.isSlabAvailable)
  const minPieces = available.reduce((m, p) => Math.min(m, p.pieceCount), Infinity)
  const fromPrice = Number.isFinite(minPieces) ? product.pricePerPiece * minPieces : product.pricePerPiece
  const soldOut = !product.inStock

  return (
    <Link to={`/shop/${product.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl">
        <BrownieImage
          src={product.imageUrl}
          alt={product.name}
          className="aspect-square w-full transition-transform group-hover:scale-[1.03]"
        />
        {soldOut ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2 py-0.5 text-xs text-cream">
            Sold out
          </span>
        ) : (
          product.isSlabAvailable && (
            <span className="absolute left-3 top-3 rounded-full bg-cream/90 px-2 py-0.5 text-xs font-medium text-wine">
              Customise
            </span>
          )
        )}
      </div>
      <h3 className="mt-2 font-display text-lg">{product.name}</h3>
      <p className="text-sm text-ink/60">From {formatLKR(fromPrice)}</p>
    </Link>
  )
}
