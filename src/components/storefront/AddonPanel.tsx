import type { CatalogAddon, GiftRibbonConfig } from '../../types/catalog'
import type { CartAddon } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { TOPPER_LINES, GIFT_MESSAGE_MAX, isValidTopperLine } from '../../schemas/addon'

// Add-on selection state, independent of the catalogue shape so it can be
// driven by controlled inputs. Letter topper is a free, built-in option (PR
// #2) — no enabled/price toggle, just up to 3 lines the customer can fill in
// or leave blank. Gift message / gift ribbon remain priced add-ons (spec §6.2).
export interface AddonSelection {
  letterTopper: { lines: string[] }
  giftMessage: { enabled: boolean; text: string }
  giftRibbon: { enabled: boolean; color: string | null }
}

export function emptyAddonSelection(): AddonSelection {
  return {
    letterTopper: { lines: Array(TOPPER_LINES).fill('') },
    giftMessage: { enabled: false, text: '' },
    giftRibbon: { enabled: false, color: null },
  }
}

/**
 * Convert the panel's selection state into priced CartAddon rows (lib/pricing).
 * The topper is always price: 0 (free, built-in) — still emitted as a
 * CartAddon (not a separate field) so cart line-keying, the WhatsApp message
 * builder, and the admin order slip all keep working unchanged; only the
 * price differs from a normal addon.
 */
export function toCartAddons(addons: CatalogAddon[], selection: AddonSelection): CartAddon[] {
  const result: CartAddon[] = []

  if (selection.letterTopper.lines.some((l) => l.trim() !== '')) {
    result.push({
      id: 'letter_topper',
      label: 'Letter Topper',
      price: 0,
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
  /**
   * Max characters per topper line for the currently-selected package
   * (packages[].letter_max_chars). 0 means this package doesn't offer a
   * topper at all (e.g. the 9pc box) — the section is hidden.
   */
  topperMaxChars: number
  /** Product-level gate — some products don't allow a letter topper even on a qualifying package. */
  productAllowsLetterTopper: boolean
  value: AddonSelection
  onChange: (next: AddonSelection) => void
  disabled?: boolean
}

export default function AddonPanel({
  addons,
  topperMaxChars,
  productAllowsLetterTopper,
  value,
  onChange,
  disabled,
}: AddonPanelProps) {
  const message = addons.find((a) => a.id === 'gift_message')
  const ribbon = addons.find((a) => a.id === 'gift_ribbon')

  // config is admin-editable JSON, so never trust its shape — a malformed
  // `colors` (non-array) would crash the storefront on .map (PR review).
  const ribbonColors = ribbon && Array.isArray((ribbon.config as GiftRibbonConfig).colors)
    ? (ribbon.config as GiftRibbonConfig).colors
    : []

  // Shown only when this package offers a topper (max chars > 0) AND the
  // product allows it. Package qualification comes from letter_max_chars,
  // set per package (7 for both slab sizes, 5 for the 15pc box, 4 for the
  // 12pc box, 0 — hidden — for the 9pc box).
  const showTopper = topperMaxChars > 0 && productAllowsLetterTopper

  return (
    <div className="flex flex-col gap-4">
      {showTopper && (
        <div className="rounded-md border border-neutral-200 p-3">
          <p className="text-sm font-medium text-navy">Letter Topper (free)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {value.letterTopper.lines.map((line, i) => (
              <input
                key={i}
                type="text"
                value={line}
                disabled={disabled}
                maxLength={topperMaxChars}
                placeholder={`up to ${topperMaxChars} letters`}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase()
                  if (!isValidTopperLine(upper, topperMaxChars)) return
                  const lines = [...value.letterTopper.lines]
                  lines[i] = upper
                  onChange({ ...value, letterTopper: { lines } })
                }}
                className="h-11 w-24 rounded border border-neutral-300 px-2 text-center text-sm uppercase placeholder:text-[10px] placeholder:normal-case"
              />
            ))}
          </div>
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
              {ribbonColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...value, giftRibbon: { ...value.giftRibbon, color } })}
                  className={`min-h-[40px] rounded-full border px-4 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                    value.giftRibbon.color === color
                      ? 'border-pink bg-pink-light text-pink'
                      : 'border-neutral-200 bg-white text-navy hover:border-pink'
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
