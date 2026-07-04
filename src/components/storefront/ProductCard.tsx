import { useMemo, useState } from 'react'
import type { CatalogProduct, CatalogPackage, CatalogAddon } from '../../types/catalog'
import { lineTotal, type CartItem } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { useCartStore } from '../../stores/cart'
import PackageSelector from './PackageSelector'
import AddonPanel, { emptyAddonSelection, toCartAddons, type AddonSelection } from './AddonPanel'

interface ProductCardProps {
  product: CatalogProduct
  packages: CatalogPackage[]
  addons: CatalogAddon[]
}

// Browse, configure, and add a product to the cart: pick a package, pick
// add-ons, choose a box quantity, see the live price (spec §10 Phase 4/5).
export default function ProductCard({ product, packages, addons }: ProductCardProps) {
  // Packages locked to the four standard options, minus slab if this product
  // doesn't offer it (spec §6.1).
  const availablePackages = useMemo(
    () => packages.filter((p) => !p.isSlab || product.isSlabAvailable),
    [packages, product.isSlabAvailable],
  )

  const [packageId, setPackageId] = useState(availablePackages[0]?.id ?? '')
  const [addonSelection, setAddonSelection] = useState<AddonSelection>(emptyAddonSelection())
  const [boxQty, setBoxQty] = useState(1)
  const addItem = useCartStore((s) => s.addItem)

  const selectedPackage = availablePackages.find((p) => p.id === packageId) ?? availablePackages[0]

  const previewItem: CartItem | null = selectedPackage
    ? {
        productId: product.id,
        packageId: selectedPackage.id,
        productName: product.name,
        packageLabel: selectedPackage.label,
        pieceCount: selectedPackage.pieceCount,
        boxQty,
        unitPrice: product.pricePerPiece,
        addons: toCartAddons(addons, addonSelection),
      }
    : null

  const soldOut = !product.inStock

  function handleAddToCart() {
    if (!previewItem) return
    addItem(previewItem)
    setBoxQty(1)
  }

  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-medium">{product.name}</h2>
        {soldOut && (
          <span className="shrink-0 rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
            Sold out
          </span>
        )}
      </div>

      {product.description && (
        <p className="mt-1 text-sm text-neutral-600">{product.description}</p>
      )}

      <p className="mt-2 text-sm font-semibold">
        {formatLKR(product.pricePerPiece)} / piece
        {!soldOut && product.stockQty != null && (
          <span className="ml-2 font-normal text-neutral-500">Only {product.stockQty} left today</span>
        )}
      </p>

      {!soldOut && selectedPackage && (
        <div className="mt-4 flex flex-col gap-4">
          <PackageSelector
            packages={availablePackages}
            selectedId={selectedPackage.id}
            onSelect={setPackageId}
          />
          <AddonPanel
            addons={addons}
            isSlabPackage={selectedPackage.isSlab}
            productAllowsLetterTopper={product.allowsLetterTopper}
            value={addonSelection}
            onChange={setAddonSelection}
          />
          {previewItem && (
            <p className="text-sm font-semibold text-amber-700">
              {formatLKR(lineTotal(previewItem))}
              <span className="ml-1 font-normal text-neutral-400">
                for {boxQty} × {selectedPackage.label.toLowerCase()}
              </span>
            </p>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBoxQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease box quantity"
                className="h-8 w-8 rounded border border-neutral-300 text-sm"
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{boxQty}</span>
              <button
                type="button"
                onClick={() => setBoxQty((q) => q + 1)}
                aria-label="Increase box quantity"
                className="h-8 w-8 rounded border border-neutral-300 text-sm"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 rounded-full bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Add to cart
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
