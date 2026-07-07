import type { CatalogPackage } from '../../types/catalog'

// Package picker keyed by package.id — never array index (spec §6.1). Reference
// "package card" style: label + piece sublabel, pink when active.
interface PackageSelectorProps {
  packages: CatalogPackage[]
  selectedId: string
  onSelect: (id: string) => void
  disabled?: boolean
}

export default function PackageSelector({
  packages,
  selectedId,
  onSelect,
  disabled,
}: PackageSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Package">
      {packages.map((pkg) => {
        const selected = pkg.id === selectedId
        return (
          <button
            key={pkg.id}
            type="button"
            data-package-id={pkg.id}
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(pkg.id)}
            className={`flex flex-col items-center gap-0.5 rounded-[10px] border-2 px-4 py-2.5 text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? 'border-pink bg-pink-light text-pink'
                : 'border-neutral-200 bg-white text-navy hover:border-pink'
            }`}
          >
            {pkg.label}
            <span className={`text-[11px] font-medium ${selected ? 'text-pink' : 'text-neutral-400'}`}>
              {pkg.pieceCount} pcs
            </span>
          </button>
        )
      })}
    </div>
  )
}
