import { useMemo, useState } from 'react'
import type { CatalogProduct, CatalogPackage, CatalogAddon } from '../../types/catalog'
import { lineTotal, type CartItem } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import PackageSelector from './PackageSelector'
import AddonPanel, { emptyAddonSelection, toCartAddons, type AddonSelection } from './AddonPanel'

interface ProductCardProps {
  product: CatalogProduct
  packages: CatalogPackage[]
  addons: CatalogAddon[]
}

// Browse + configure a product: pick a package, pick add-ons, see the live
// price. This is the storefront READ path (spec §10 Phase 4) — adding the
// configured line to a real cart happens in Phase 5, once the cart store
// exists.
export default function ProductCard({ product, packages, addons }: ProductCardProps) {
  // Packages locked to the four standard options, minus slab if this product
  // doesn't offer it (spec §6.1).
  const availablePackages = useMemo(
    () => packages.filter((p) => !p.isSlab || product.isSlabAvailable),
    [packages, product.isSlabAvailable],
  )

  const [packageId, setPackageId] = useState(availablePackages[0]?.id ?? '')
  const [addonSelection, setAddonSelection] = useState<AddonSelection>(emptyAddonSelection())

  const selectedPackage = availablePackages.find((p) => p.id === packageId) ?? availablePackages[0]

  const previewItem: CartItem | null = selectedPackage
    ? {
        productId: product.id,
        packageId: selectedPackage.id,
        productName: product.name,
        packageLabel: selectedPackage.label,
        pieceCount: selectedPackage.pieceCount,
        boxQty: 1,
        unitPrice: product.pricePerPiece,
        addons: toCartAddons(addons, addonSelection),
      }
    : null

  const soldOut = !product.inStock

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
                for {selectedPackage.label.toLowerCase()}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
