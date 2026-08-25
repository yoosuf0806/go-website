import { useMemo, useRef, useState } from 'react'
import type {
  CatalogProduct,
  CatalogPackage,
  CatalogAddon,
  ProductPackageStockMap,
  ProductPackageAvailabilityMap,
} from '../../types/catalog'
import { stockKey } from '../../types/catalog'
import { lineTotal, type CartItem } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { useCartStore } from '../../stores/cart'
import PackageSelector from './PackageSelector'
import FlavorSelector from './FlavorSelector'
import AddonPanel, { emptyAddonSelection, toCartAddons, type AddonSelection } from './AddonPanel'

interface ProductConfiguratorProps {
  product: CatalogProduct
  packages: CatalogPackage[]
  addons: CatalogAddon[]
  /** Out-of-stock product×package overrides; no entry = in stock. */
  productPackageStock?: ProductPackageStockMap
  /** Hidden product×package overrides; no entry = available/shown. */
  productPackageAvailability?: ProductPackageAvailabilityMap
  onAdded?: () => void
}

// Fallback letter-topper allowance for a slab product, used only when the
// product row predates migration 039 and carries no per-slab limit of its own.
// Slabs have no package to read packages.letter_max_chars from; the real value
// now lives on the product (products.slab_letter_max_chars) so a Mini slab can
// allow fewer letters per line than a Party slab.
const SLAB_TOPPER_MAX_FALLBACK = 7

// Configure + add a product to the cart: box size / flavour, add-ons, quantity,
// live price. Lives on the product detail page. Two modes:
//   • Slab product  → "Choose your flavour" (flat per-product price).
//   • Normal product → "Choose your package" (per-piece price × package).
export default function ProductConfigurator({
  product,
  packages,
  addons,
  productPackageStock = {},
  productPackageAvailability = {},
  onAdded,
}: ProductConfiguratorProps) {
  const isSlab = product.isSlabProduct

  // ── Package mode data ──────────────────────────────────────────────────────
  // Which packages this product actually offers:
  //   1. Per-package availability — the admin can hide any package for this
  //      product (product_package_availability); no entry = shown.
  //   2. Slab gates — each slab size (12pc / 15pc) has its own independent
  //      admin toggle. Non-slab boxes are offered unless hidden by (1).
  const eligiblePackages = useMemo(
    () =>
      packages.filter((p) => {
        if (productPackageAvailability[stockKey(product.id, p.id)] === false) return false
        if (p.id === 'slab-15') return product.isSlab15Available
        if (p.isSlab) return product.isSlabAvailable
        return true
      }),
    [
      packages,
      product.id,
      product.isSlabAvailable,
      product.isSlab15Available,
      productPackageAvailability,
    ],
  )

  // Per-product-per-package stock: a package combo can be individually sold
  // out (product_package_stock) even when the product itself is generally in
  // stock. Out-of-stock combos stay visible but unselectable.
  const isPackageInStock = (packageId: string) =>
    productPackageStock[stockKey(product.id, packageId)] !== false

  const firstInStock = eligiblePackages.find((p) => isPackageInStock(p.id)) ?? eligiblePackages[0]

  // ── Shared state (hooks must run unconditionally) ─────────────────────────
  const [packageId, setPackageId] = useState(firstInStock?.id ?? '')
  const [flavorName, setFlavorName] = useState(product.flavors[0]?.name ?? '')
  const [addonSelection, setAddonSelection] = useState<AddonSelection>(emptyAddonSelection())
  const [boxQty, setBoxQty] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)
  const addItem = useCartStore((s) => s.addItem)

  const selectedPackage = eligiblePackages.find((p) => p.id === packageId) ?? firstInStock
  const selectedFlavor = product.flavors.find((f) => f.name === flavorName) ?? product.flavors[0]
  const cartAddons = toCartAddons(addons, addonSelection)

  // Whether the current selection can actually be added.
  const packageInStock = selectedPackage ? isPackageInStock(selectedPackage.id) : false
  const canAdd = isSlab ? Boolean(selectedFlavor) : packageInStock

  const previewItem: CartItem | null = isSlab
    ? selectedFlavor
      ? {
          productId: product.id,
          packageId: `slab:${selectedFlavor.name}`,
          productName: product.name,
          packageLabel: selectedFlavor.name,
          pieceCount: 0,
          boxQty,
          unitPrice: selectedFlavor.price,
          addons: cartAddons,
          isSlab: true,
          flavor: selectedFlavor.name,
        }
      : null
    : selectedPackage
      ? {
          productId: product.id,
          packageId: selectedPackage.id,
          productName: product.name,
          packageLabel: selectedPackage.label,
          pieceCount: selectedPackage.pieceCount,
          boxQty,
          unitPrice: product.pricePerPiece,
          addons: cartAddons,
        }
      : null

  if (!product.inStock) {
    return (
      <div className="rounded-2xl bg-pink-light p-4 text-sm text-neutral-500">
        This {isSlab ? 'slab' : 'flavour'} is sold out today — check back tomorrow or explore other
        brownies below.
      </div>
    )
  }

  if (isSlab && product.flavors.length === 0) {
    return (
      <div className="rounded-2xl bg-pink-light p-4 text-sm text-neutral-500">
        Flavours for this slab are being updated — please check back shortly.
      </div>
    )
  }

  if (!previewItem) return null

  function handleAddToCart() {
    if (!previewItem || !canAdd) return
    addItem(previewItem)
    setBoxQty(1)
    setJustAdded(true)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setJustAdded(false), 2200)
    onAdded?.()
  }

  const topperMaxChars = isSlab
    ? (product.slabLetterMaxChars ?? SLAB_TOPPER_MAX_FALLBACK)
    : (selectedPackage?.letterMaxChars ?? 0)
  const unit = isSlab ? 'slab' : 'box'
  const pkgSummary = isSlab
    ? `${boxQty === 1 ? '1 slab' : `${boxQty} slabs`}`
    : `${boxQty === 1 ? '1 box' : `${boxQty} boxes`} · ${(selectedPackage?.pieceCount ?? 0) * boxQty} pcs`
  const totalLabel = formatLKR(lineTotal(previewItem))

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[13px] font-bold text-navy">
          {isSlab ? 'Choose your flavour' : 'Choose your package'}
        </p>
        <div className="mt-2.5">
          {isSlab ? (
            <FlavorSelector
              flavors={product.flavors}
              selectedName={selectedFlavor?.name ?? ''}
              onSelect={setFlavorName}
            />
          ) : (
            <PackageSelector
              packages={eligiblePackages}
              selectedId={selectedPackage?.id ?? ''}
              onSelect={setPackageId}
              isInStock={isPackageInStock}
            />
          )}
        </div>
        {!isSlab && !packageInStock && selectedPackage && (
          <p className="mt-2 text-xs font-semibold text-pink">
            {selectedPackage.label} is sold out for this flavour right now.
          </p>
        )}
      </div>

      <AddonPanel
        addons={addons}
        topperMaxChars={topperMaxChars}
        productAllowsLetterTopper={product.allowsLetterTopper}
        value={addonSelection}
        onChange={setAddonSelection}
      />

      <div className="flex items-center justify-between border-t border-blush-200 pt-5">
        <span className="text-base font-medium text-navy">{isSlab ? 'Slabs' : 'Boxes'}</span>
        <div className="flex items-center gap-1 rounded-full border border-blush-200 p-1">
          <button
            type="button"
            onClick={() => setBoxQty((q) => Math.max(1, q - 1))}
            aria-label={`Decrease ${unit} quantity`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blush-50 text-xl font-medium text-navy hover:bg-blush-100"
          >
            −
          </button>
          <span className="min-w-10 text-center text-[17px] font-bold text-navy">{boxQty}</span>
          <button
            type="button"
            onClick={() => setBoxQty((q) => q + 1)}
            aria-label={`Increase ${unit} quantity`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blush-50 text-xl font-medium text-navy hover:bg-blush-100"
          >
            +
          </button>
        </div>
      </div>

      {/* Sticky on mobile so the CTA + live price never scroll away; a normal
          inline panel on desktop. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-blush-200 bg-white/96 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:rounded-2xl lg:border lg:bg-blush-100 lg:px-5 lg:py-4 lg:backdrop-blur-none">
        <div className="flex-none">
          <div className="text-xs text-neutral-500">{pkgSummary}</div>
          <div className="font-display text-[1.2rem] text-navy">{totalLabel}</div>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAdd}
          className="flex-1 rounded-2xl bg-pink py-4 text-base font-bold text-white transition-colors hover:bg-pink-dark disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:hover:bg-neutral-300"
        >
          {canAdd ? 'Add to Cart' : 'Sold Out'}
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
