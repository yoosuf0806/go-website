import type { CatalogAddon, GiftRibbonConfig } from '../../types/catalog'
import type { CartAddon } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { TOPPER_LIMITS, GIFT_MESSAGE_MAX, isValidTopperLine } from '../../schemas/addon'

// Add-on selection state, independent of the catalogue shape so it can be
// driven by controlled inputs (spec §6.2: letter topper, gift message, gift
// ribbon — each with its own admin-editable price and constraints).
export interface AddonSelection {
  letterTopper: { enabled: boolean; lines: string[] }
  giftMessage: { enabled: boolean; text: string }
  giftRibbon: { enabled: boolean; color: string | null }
}

export function emptyAddonSelection(): AddonSelection {
  return {
    letterTopper: { enabled: false, lines: Array(TOPPER_LIMITS.lines).fill('') },
    giftMessage: { enabled: false, text: '' },
    giftRibbon: { enabled: false, color: null },
  }
}

/** Convert the panel's selection state into priced CartAddon rows (lib/pricing). */
export function toCartAddons(addons: CatalogAddon[], selection: AddonSelection): CartAddon[] {
  const result: CartAddon[] = []

  const topper = addons.find((a) => a.id === 'letter_topper')
  if (topper && selection.letterTopper.enabled && selection.letterTopper.lines.some((l) => l.trim() !== '')) {
    result.push({
      id: topper.id,
      label: topper.label,
      price: topper.price,
      detail: { lines: selection.letterTopper.lines },
    })
  }

  const message = addons.find((a) => a.id === 'gift_message')
  if (message && selection.giftMessage.enabled && selection.giftMessage.text.trim()) {
    result.push({
      id: message.id,
      label: message.label,
      price: message.price,
      detail: { message: selection.giftMessage.text },
    })
  }

  const ribbon = addons.find((a) => a.id === 'gift_ribbon')
  if (ribbon && selection.giftRibbon.enabled && selection.giftRibbon.color) {
    result.push({
      id: ribbon.id,
      label: ribbon.label,
      price: ribbon.price,
      detail: { color: selection.giftRibbon.color },
    })
  }

  return result
}

interface AddonPanelProps {
  addons: CatalogAddon[]
  /** Letter topper only ever applies to slab packages. */
  isSlabPackage: boolean
  /** Product-level gate — some products don't allow a letter topper even on a slab. */
  productAllowsLetterTopper: boolean
  value: AddonSelection
  onChange: (next: AddonSelection) => void
  disabled?: boolean
}

export default function AddonPanel({
  addons,
  isSlabPackage,
  productAllowsLetterTopper,
  value,
  onChange,
  disabled,
}: AddonPanelProps) {
  const topper = addons.find((a) => a.id === 'letter_topper')
  const message = addons.find((a) => a.id === 'gift_message')
  const ribbon = addons.find((a) => a.id === 'gift_ribbon')

  const showTopper = topper && isSlabPackage && productAllowsLetterTopper

  return (
    <div className="flex flex-col gap-4">
      {showTopper && (
        <div className="rounded-md border border-neutral-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={value.letterTopper.enabled}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...value, letterTopper: { ...value.letterTopper, enabled: e.target.checked } })
              }
            />
            {topper.label} (+{formatLKR(topper.price)})
          </label>
          {value.letterTopper.enabled && (
            <div className="mt-2 flex gap-2">
              {value.letterTopper.lines.map((line, i) => (
                <input
                  key={i}
                  type="text"
                  value={line}
                  disabled={disabled}
                  maxLength={TOPPER_LIMITS.maxCharsPerLine}
                  placeholder={`Line ${i + 1}`}
                  onChange={(e) => {
                    const upper = e.target.value.toUpperCase()
                    if (!isValidTopperLine(upper)) return
                    const lines = [...value.letterTopper.lines]
                    lines[i] = upper
                    onChange({ ...value, letterTopper: { ...value.letterTopper, lines } })
                  }}
                  className="w-20 rounded border border-neutral-300 px-2 py-1 text-center text-sm uppercase"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {message && (
        <div className="rounded-md border border-neutral-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={value.giftMessage.enabled}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...value, giftMessage: { ...value.giftMessage, enabled: e.target.checked } })
              }
            />
            {message.label} (+{formatLKR(message.price)})
          </label>
          {value.giftMessage.enabled && (
            <div className="mt-2">
              <textarea
                value={value.giftMessage.text}
                disabled={disabled}
                maxLength={GIFT_MESSAGE_MAX}
                rows={2}
                onChange={(e) =>
                  onChange({ ...value, giftMessage: { ...value.giftMessage, text: e.target.value } })
                }
                className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              />
              <p className="mt-0.5 text-right text-xs text-neutral-400">
                {value.giftMessage.text.length}/{GIFT_MESSAGE_MAX}
              </p>
            </div>
          )}
        </div>
      )}

      {ribbon && (
        <div className="rounded-md border border-neutral-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={value.giftRibbon.enabled}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...value, giftRibbon: { ...value.giftRibbon, enabled: e.target.checked } })
              }
            />
            {ribbon.label} (+{formatLKR(ribbon.price)})
          </label>
          {value.giftRibbon.enabled && (
            <div className="mt-2 flex flex-wrap gap-2">
              {(ribbon.config as GiftRibbonConfig).colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...value, giftRibbon: { ...value.giftRibbon, color } })}
                  className={`rounded-full border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                    value.giftRibbon.color === color
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-amber-400'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
