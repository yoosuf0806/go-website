import type { CatalogPackage } from '../../types/catalog'

// Package picker keyed by package.id — never array index (spec §6.1). Reference
// "package card" style: label + piece sublabel, pink when active. Packages
// that are individually out of stock for this product (product_package_stock)
// stay visible but are disabled/struck-through rather than hidden, so the
// customer understands why that size isn't selectable.
interface PackageSelectorProps {
  packages: CatalogPackage[]
  selectedId: string
  onSelect: (id: string) => void
  disabled?: boolean
  /** Per-package in-stock check; defaults to always in stock if omitted. */
  isInStock?: (packageId: string) => boolean
}

export default function PackageSelector({
  packages,
  selectedId,
  onSelect,
  disabled,
  isInStock = () => true,
}: PackageSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Package">
      {packages.map((pkg) => {
        const selected = pkg.id === selectedId
        const inStock = isInStock(pkg.id)
        return (
          <button
            key={pkg.id}
            type="button"
            data-package-id={pkg.id}
            role="radio"
            aria-checked={selected}
            aria-disabled={!inStock}
            disabled={disabled || !inStock}
            onClick={() => onSelect(pkg.id)}
            className={`flex flex-col items-center gap-0.5 rounded-[10px] border-2 px-4 py-2.5 text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? 'border-pink bg-pink-light text-pink'
                : 'border-neutral-200 bg-white text-navy hover:border-pink'
            }`}
          >
            <span className={!inStock ? 'line-through' : ''}>{pkg.label}</span>
            <span className={`text-[11px] font-medium ${selected ? 'text-pink' : 'text-neutral-400'}`}>
              {inStock ? `${pkg.pieceCount} pcs` : 'Sold out'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
