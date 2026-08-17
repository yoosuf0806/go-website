import type { CatalogFlavor } from '../../types/catalog'
import { formatLKR } from '../../lib/format'

// Flavour picker for slab products — the slab equivalent of PackageSelector.
// Each flavour carries its own flat per-product price, shown under the name.
// Keyed by flavour name (a slab product's flavours are a small, admin-defined
// list; names are unique within a product).
interface FlavorSelectorProps {
  flavors: CatalogFlavor[]
  selectedName: string
  onSelect: (name: string) => void
  disabled?: boolean
}

export default function FlavorSelector({
  flavors,
  selectedName,
  onSelect,
  disabled,
}: FlavorSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Flavour">
      {flavors.map((flavor) => {
        const selected = flavor.name === selectedName
        return (
          <button
            key={flavor.name}
            type="button"
            data-flavor-name={flavor.name}
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(flavor.name)}
            className={`flex flex-col items-center gap-0.5 rounded-[10px] border-2 px-4 py-2.5 text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? 'border-pink bg-pink-light text-pink'
                : 'border-neutral-200 bg-white text-navy hover:border-pink'
            }`}
          >
            <span>{flavor.name}</span>
            <span className={`text-[11px] font-medium ${selected ? 'text-pink' : 'text-neutral-400'}`}>
              {formatLKR(flavor.price)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
