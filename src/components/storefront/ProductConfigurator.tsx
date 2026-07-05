import { useMemo, useState } from 'react'
import type { CatalogProduct, CatalogPackage, CatalogAddon } from '../../types/catalog'
import { lineTotal, type CartItem } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { useCartStore } from '../../stores/cart'
import PackageSelector from './PackageSelector'
import AddonPanel, { emptyAddonSelection, toCartAddons, type AddonSelection } from './AddonPanel'

interface ProductConfiguratorProps {
  product: CatalogProduct
  packages: CatalogPackage[]
  addons: CatalogAddon[]
  onAdded?: () => void
}

// Configure + add a product to the cart: box size, add-ons, quantity, live
// price. Lives on the product detail page (moved off the catalogue card so the
// grid stays presentational).
export default function ProductConfigurator({
  product,
  packages,
  addons,
  onAdded,
}: ProductConfiguratorProps) {
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

  if (!product.inStock) {
    return (
      <div className="rounded-2xl bg-blush-50 p-4 text-sm text-ink/70">
        This flavour is sold out today — check back tomorrow or explore other brownies below.
      </div>
    )
  }

  if (!selectedPackage) return null

  function handleAddToCart() {
    if (!previewItem) return
    addItem(previewItem)
    setBoxQty(1)
    onAdded?.()
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-ink/70">Box size</p>
        <div className="mt-2">
          <PackageSelector
            packages={availablePackages}
            selectedId={selectedPackage.id}
            onSelect={setPackageId}
          />
        </div>
      </div>

      <AddonPanel
        addons={addons}
        isSlabPackage={selectedPackage.isSlab}
        productAllowsLetterTopper={product.allowsLetterTopper}
        value={addonSelection}
        onChange={setAddonSelection}
      />

      {previewItem && (
        <p className="font-display text-2xl">
          {formatLKR(lineTotal(previewItem))}
          <span className="ml-2 align-middle text-sm font-normal text-ink/50">
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
            className="h-10 w-10 rounded-full border border-ink/20"
          >
            −
          </button>
          <span className="w-6 text-center">{boxQty}</span>
          <button
            type="button"
            onClick={() => setBoxQty((q) => q + 1)}
            aria-label="Increase box quantity"
            className="h-10 w-10 rounded-full border border-ink/20"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex-1 rounded-full bg-ink py-3 text-sm font-semibold text-cream hover:bg-wine"
        >
          Add to cart
        </button>
      </div>
    </div>
  )
}
