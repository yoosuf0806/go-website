import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CatalogProduct, CatalogPackage } from '../../types/catalog'
import type { CartItem } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { useCartStore } from '../../stores/cart'
import BrownieImage from './BrownieImage'

interface ProductTileProps {
  product: CatalogProduct
  packages: CatalogPackage[]
}

// Catalogue card: image with a badge/sold-out overlay, name, price, and a
// touch-friendly quick-add button (02-shop-all.md — cards need a working
// affordance on tap, not a hover-only "View Product" overlay). Quick-add
// always adds the product's smallest eligible package at qty 1, no add-ons;
// the customer can refine it from the cart (edit routes to Product Detail
// with the config pre-filled) or on the product page itself.
export default function ProductTile({ product, packages }: ProductTileProps) {
  const [justAdded, setJustAdded] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const addItem = useCartStore((s) => s.addItem)

  const available = packages.filter((p) => {
    if (p.id === 'slab-15') return product.isSlab15Available
    if (p.isSlab) return product.isSlabAvailable
    return true
  })
  const cheapest = available.reduce<CatalogPackage | null>(
    (min, p) => (!min || p.pieceCount < min.pieceCount ? p : min),
    null,
  )
  const fromPrice = cheapest ? product.pricePerPiece * cheapest.pieceCount : product.pricePerPiece
  const soldOut = !product.inStock
  const badge = product.isHotPick ? 'Hot Pick' : product.isSlabAvailable || product.isSlab15Available ? 'Slab' : null

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!cheapest || soldOut) return
    const item: CartItem = {
      productId: product.id,
      packageId: cheapest.id,
      productName: product.name,
      packageLabel: cheapest.label,
      pieceCount: cheapest.pieceCount,
      boxQty: 1,
      unitPrice: product.pricePerPiece,
      addons: [],
    }
    addItem(item)
    setJustAdded(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setJustAdded(false), 1400)
  }

  return (
    <Link to={`/shop/${product.slug}`} className="group block overflow-hidden rounded-2xl bg-white">
      <div className="relative aspect-square overflow-hidden bg-blush-100">
        <BrownieImage
          src={product.imageUrl}
          alt={product.name}
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 45vw"
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        {soldOut ? (
          <span className="absolute inset-0 flex items-center justify-center bg-[#fbf6f0]/60 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Sold out
          </span>
        ) : (
          badge && (
            <span className="absolute left-2 top-2 rounded-full border border-blush-200 bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7a5f1c]">
              {badge}
            </span>
          )
        )}
      </div>
      <div className="px-1 pb-1 pt-2.5">
        <h3 className="truncate text-[14px] font-medium text-navy">{product.name}</h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold text-[#c02249]">{formatLKR(fromPrice)}</span>
          {!soldOut && cheapest && (
            <button
              type="button"
              onClick={quickAdd}
              aria-label={justAdded ? `${product.name} added to cart` : `Quick add ${product.name} to cart`}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold leading-none transition-colors ${
                justAdded ? 'bg-[#25d366] text-white' : 'border border-pink text-pink hover:bg-pink hover:text-white'
              }`}
            >
              {justAdded ? '✓' : '+'}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
