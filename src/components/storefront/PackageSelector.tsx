import type { CatalogPackage } from '../../types/catalog'

// Package picker keyed by package.id — never array index (spec §6.1: index-based
// selection was a proven bug source in the prototype).
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
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Package">
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
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? 'border-amber-600 bg-amber-600 text-white'
                : 'border-neutral-300 bg-white text-neutral-700 hover:border-amber-400'
            }`}
          >
            {pkg.label}
          </button>
        )
      })}
    </div>
  )
}
