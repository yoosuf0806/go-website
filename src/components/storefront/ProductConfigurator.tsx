import { useMemo, useRef, useState } from 'react'
import type { CatalogProduct, CatalogPackage, CatalogAddon, ProductPackageStockMap } from '../../types/catalog'
import { stockKey } from '../../types/catalog'
import { lineTotal, type CartItem } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { useCartStore } from '../../stores/cart'
import PackageSelector from './PackageSelector'
import AddonPanel, { emptyAddonSelection, toCartAddons, type AddonSelection } from './AddonPanel'

interface ProductConfiguratorProps {
  product: CatalogProduct
  packages: CatalogPackage[]
  addons: CatalogAddon[]
  /** Out-of-stock product×package overrides; no entry = in stock. */
  productPackageStock?: ProductPackageStockMap
  onAdded?: () => void
}

// Configure + add a product to the cart: box size, add-ons, quantity, live
// price. Lives on the product detail page (moved off the catalogue card so the
// grid stays presentational).
export default function ProductConfigurator({
  product,
  packages,
  addons,
  productPackageStock = {},
  onAdded,
}: ProductConfiguratorProps) {
  // Product-level slab gates: each slab size (12pc / 15pc) has its own
  // independent admin toggle. Non-slab boxes are always offered.
  const eligiblePackages = useMemo(
    () =>
      packages.filter((p) => {
        if (p.id === 'slab-15') return product.isSlab15Available
        if (p.isSlab) return product.isSlabAvailable
        return true
      }),
    [packages, product.isSlabAvailable, product.isSlab15Available],
  )

  // Per-product-per-package stock: a package combo can be individually sold
  // out (product_package_stock) even when the product itself is generally in
  // stock. Out-of-stock combos stay visible but unselectable, rather than
  // disappearing, so the customer understands why (spec: "unselectable").
  const isPackageInStock = (packageId: string) =>
    productPackageStock[stockKey(product.id, packageId)] !== false

  const availablePackages = eligiblePackages
  const firstInStock = availablePackages.find((p) => isPackageInStock(p.id)) ?? availablePackages[0]

  const [packageId, setPackageId] = useState(firstInStock?.id ?? '')
  const [addonSelection, setAddonSelection] = useState<AddonSelection>(emptyAddonSelection())
  const [boxQty, setBoxQty] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)
  const addItem = useCartStore((s) => s.addItem)

  const selectedPackage = availablePackages.find((p) => p.id === packageId) ?? firstInStock
  const selectedInStock = selectedPackage ? isPackageInStock(selectedPackage.id) : false

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
      <div className="rounded-2xl bg-pink-light p-4 text-sm text-neutral-500">
        This flavour is sold out today — check back tomorrow or explore other brownies below.
      </div>
    )
  }

  if (!selectedPackage) return null

  function handleAddToCart() {
    if (!previewItem || !selectedInStock) return
    addItem(previewItem)
    setBoxQty(1)
    setJustAdded(true)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setJustAdded(false), 2200)
    onAdded?.()
  }

  const pkgSummary = `${boxQty === 1 ? '1 box' : `${boxQty} boxes`} · ${selectedPackage.pieceCount * boxQty} pcs`
  const totalLabel = previewItem ? formatLKR(lineTotal(previewItem)) : '—'

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[13px] font-bold text-navy">Choose your package</p>
        <div className="mt-2.5">
          <PackageSelector
            packages={availablePackages}
            selectedId={selectedPackage.id}
            onSelect={setPackageId}
            isInStock={isPackageInStock}
          />
        </div>
        {!selectedInStock && (
          <p className="mt-2 text-xs font-semibold text-pink">
            {selectedPackage.label} is sold out for this flavour right now.
          </p>
        )}
      </div>

      <AddonPanel
        addons={addons}
        topperMaxChars={selectedPackage.letterMaxChars}
        productAllowsLetterTopper={product.allowsLetterTopper}
        value={addonSelection}
        onChange={setAddonSelection}
      />

      <div className="flex items-center justify-between border-t border-blush-200 pt-5">
        <span className="text-base font-medium text-navy">Boxes</span>
        <div className="flex items-center gap-1 rounded-full border border-blush-200 p-1">
          <button
            type="button"
            onClick={() => setBoxQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease box quantity"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blush-50 text-xl font-medium text-navy hover:bg-blush-100"
          >
            −
          </button>
          <span className="min-w-10 text-center text-[17px] font-bold text-navy">{boxQty}</span>
          <button
            type="button"
            onClick={() => setBoxQty((q) => q + 1)}
            aria-label="Increase box quantity"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blush-50 text-xl font-medium text-navy hover:bg-blush-100"
          >
            +
          </button>
        </div>
      </div>

      {/* Sticky on mobile so the CTA + live price never scroll away (spec:
          "never let it scroll away"); a normal inline panel on desktop where
          there's no scroll-hunt problem to solve. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-blush-200 bg-white/96 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:rounded-2xl lg:border lg:bg-blush-100 lg:px-5 lg:py-4 lg:backdrop-blur-none">
        <div className="flex-none">
          <div className="text-xs text-neutral-500">{pkgSummary}</div>
          <div className="font-display text-[1.2rem] text-navy">{totalLabel}</div>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!selectedInStock}
          className="flex-1 rounded-2xl bg-pink py-4 text-base font-bold text-white transition-colors hover:bg-pink-dark disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:hover:bg-neutral-300"
        >
          {selectedInStock ? 'Add to Cart' : 'Sold Out'}
        </button>
      </div>

      {justAdded && (
        <div
          className="fixed inset-x-4 bottom-[5.5rem] z-30 flex items-center gap-2.5 rounded-2xl bg-navy px-4 py-3.5 text-sm font-medium text-white shadow-lg lg:hidden"
          role="status"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25d366] text-xs font-bold">✓</span>
          Added to cart
        </div>
      )}
    </div>
  )
}
