import { useState } from 'react'
import type { CatalogAddon } from '../../types/catalog'
import type { CartAddon } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { TOPPER_LINES, GIFT_MESSAGE_MAX, isValidTopperLine } from '../../schemas/addon'

// The gift ribbon is always a white satin ribbon now — the customer only
// chooses whether to add it, not a colour (previous colour picker removed).
const RIBBON_COLOR = 'White'

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

type OpenSection = 'topper' | 'message' | null

// Accordion row shell — one section, collapsed by default. Matches the
// mockup's toggle-row pattern: label + summary on the left, a small sign
// (Free / +/−) on the right, expand on tap, collapse the others.
function Row({
  label,
  summary,
  sign,
  open,
  onToggle,
  bordered = true,
  children,
}: {
  label: string
  summary: string
  sign: string
  open: boolean
  onToggle: () => void
  bordered?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={bordered ? 'border-t border-blush-200' : ''}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div>
          <div className="text-base font-medium text-navy">{label}</div>
          <div className="mt-0.5 text-[13px] text-neutral-500">{summary}</div>
        </div>
        <span className={sign === 'Free' ? 'text-[13px] text-berry' : 'text-xl text-neutral-500'}>{sign}</span>
      </button>
      {open && <div className="border-t border-blush-200 px-4 pb-4 pt-1">{children}</div>}
    </div>
  )
}

export default function AddonPanel({
  addons,
  topperMaxChars,
  productAllowsLetterTopper,
  value,
  onChange,
  disabled,
}: AddonPanelProps) {
  const [open, setOpen] = useState<OpenSection>(null)
  const toggle = (key: OpenSection) => setOpen((cur) => (cur === key ? null : key))

  const message = addons.find((a) => a.id === 'gift_message')
  const ribbon = addons.find((a) => a.id === 'gift_ribbon')

  // Shown only when this package offers a topper (max chars > 0) AND the
  // product allows it. Package qualification comes from letter_max_chars,
  // set per package (7 for both slab sizes, 5 for the 15pc box, 4 for the
  // 12pc box, 0 — hidden — for the 9pc box).
  const showTopper = topperMaxChars > 0 && productAllowsLetterTopper

  const filledLines = value.letterTopper.lines.filter((l) => l.trim() !== '')
  const topperSummary = filledLines.length > 0 ? filledLines.join(' · ') : 'Optional — up to 3 lines'
  const topperPreview = filledLines.join(' · ')

  return (
    <div className="overflow-hidden rounded-2xl border border-blush-200">
      {showTopper && (
        <Row
          label="Letter topper"
          summary={topperSummary}
          sign="Free"
          open={open === 'topper'}
          onToggle={() => toggle('topper')}
          bordered={false}
        >
          <p className="text-[14px] leading-relaxed text-neutral-500">
            {TOPPER_LINES} lines, {topperMaxChars} letters each — perfect for a name or a short message.
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            {value.letterTopper.lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={line}
                  disabled={disabled}
                  maxLength={topperMaxChars}
                  placeholder={`Line ${i + 1}`}
                  onChange={(e) => {
                    const upper = e.target.value.toUpperCase()
                    if (!isValidTopperLine(upper, topperMaxChars)) return
                    const lines = [...value.letterTopper.lines]
                    lines[i] = upper
                    onChange({ ...value, letterTopper: { lines } })
                  }}
                  className="h-11 flex-1 rounded-lg border border-blush-200 bg-white px-3 text-sm uppercase text-navy placeholder:normal-case placeholder:text-neutral-400 focus:border-pink focus:outline-none"
                />
                <span className="w-10 shrink-0 text-right text-xs text-neutral-400">
                  {line.length}/{topperMaxChars}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3.5 rounded-xl bg-navy p-4 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">Preview</div>
            <div className="mt-2 min-h-8 font-display text-xl leading-tight tracking-wide text-white">
              {topperPreview || '—'}
            </div>
          </div>
        </Row>
      )}

      {message && (
        <Row
          label="Gift message"
          summary={
            value.giftMessage.enabled && value.giftMessage.text
              ? value.giftMessage.text
              : `Handwritten on a card · ${GIFT_MESSAGE_MAX} chars`
          }
          sign={value.giftMessage.enabled ? '−' : '+'}
          open={open === 'message'}
          onToggle={() => {
            const nextEnabled = open !== 'message' ? true : value.giftMessage.enabled
            onChange({ ...value, giftMessage: { ...value.giftMessage, enabled: nextEnabled } })
            toggle('message')
          }}
        >
          <textarea
            value={value.giftMessage.text}
            disabled={disabled}
            maxLength={GIFT_MESSAGE_MAX}
            rows={3}
            placeholder="Happy birthday, Amma — from all of us."
            onChange={(e) =>
              onChange({
                ...value,
                giftMessage: { enabled: true, text: e.target.value },
              })
            }
            className="w-full resize-none rounded-xl border border-blush-200 bg-white p-3 text-[15px] leading-relaxed text-navy placeholder:text-neutral-400 focus:border-pink focus:outline-none"
          />
          <div className="pt-1 text-right text-xs text-neutral-500">
            {value.giftMessage.text.length} / {GIFT_MESSAGE_MAX}
          </div>
          {message.price > 0 && <p className="text-xs text-neutral-500">Adds {formatLKR(message.price)}</p>}
        </Row>
      )}

      {ribbon && (
        // Gift ribbon is now a simple yes/no: a hand-tied white satin ribbon the
        // customer can add or leave off — no colour choice.
        <div className="border-t border-blush-200">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={value.giftRibbon.enabled}
            onClick={() =>
              onChange({
                ...value,
                giftRibbon: value.giftRibbon.enabled
                  ? { enabled: false, color: null }
                  : { enabled: true, color: RIBBON_COLOR },
              })
            }
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-blush-200 bg-white shadow-[inset_0_0_5px_rgba(0,0,0,0.12)]"
                aria-hidden
              />
              <div>
                <div className="text-base font-medium text-navy">Gift ribbon</div>
                <div className="mt-0.5 text-[13px] text-neutral-500">
                  Hand-tied white satin ribbon
                  {ribbon.price > 0 ? ` · adds ${formatLKR(ribbon.price)}` : ''}
                </div>
              </div>
            </div>
            {/* iOS-style switch — the customer just picks whether they want it */}
            <span
              className={`flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                value.giftRibbon.enabled ? 'justify-end bg-pink' : 'justify-start bg-blush-200'
              }`}
            >
              <span className="h-6 w-6 rounded-full bg-white shadow" />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
