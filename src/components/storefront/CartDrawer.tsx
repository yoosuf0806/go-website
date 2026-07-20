import { useCartStore } from '../../stores/cart'
import { useVoucherStore } from '../../stores/voucher'
import { cartTotals, lineTotal, totalAfterVoucher } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { addonSummary } from '../../lib/whatsapp'
import { useCatalog } from '../../contexts/CatalogContext'

interface CartDrawerProps {
  onClose: () => void
  onCheckout: () => void
}

// Cart drawer (spec §3, §10 Phase 5). Every total shown here comes from
// cartTotals()/lineTotal() — the same functions the checkout review step and
// the WhatsApp message use, so nothing can drift (spec §11).
export default function CartDrawer({ onClose, onCheckout }: CartDrawerProps) {
  const { catalog } = useCatalog()
  const items = useCartStore((s) => s.items)
  const incrementBoxQty = useCartStore((s) => s.incrementBoxQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const totals = cartTotals(items, catalog.deliveryTiers)
  const voucher = useVoucherStore()
  const finalTotal = totalAfterVoucher(totals.total, voucher.status === 'ok' ? voucher.discount : 0)

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        aria-label="Close cart"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
          <h2 className="text-lg font-semibold">Your cart</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-500 hover:text-neutral-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-neutral-500">Your cart is empty.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => {
                const summary = addonSummary(item)
                return (
                  <li key={item.key} className="rounded-md border border-neutral-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-neutral-500">{item.packageLabel}</p>
                        {summary && <p className="mt-1 text-xs text-neutral-500">{summary}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        aria-label={`Remove ${item.productName}`}
                        className="-m-2 rounded p-2 text-xs text-neutral-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => incrementBoxQty(item.key, -1)}
                          aria-label="Decrease box quantity"
                          className="flex h-11 w-11 items-center justify-center rounded border border-neutral-300 text-base"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm">{item.boxQty}</span>
                        <button
                          type="button"
                          onClick={() => incrementBoxQty(item.key, 1)}
                          aria-label="Increase box quantity"
                          className="flex h-11 w-11 items-center justify-center rounded border border-neutral-300 text-base"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-semibold">{formatLKR(lineTotal(item))}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-neutral-200 px-4 pb-safe pt-4">
            {/* Gift voucher */}
            <div className="pb-4">
              <span className="text-sm font-medium text-navy">Gift voucher</span>
              {voucher.status === 'ok' ? (
                <div className="mt-1.5 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <span>Voucher accepted — {voucher.code.trim().toUpperCase()}</span>
                  <button type="button" onClick={voucher.remove} className="font-medium underline hover:no-underline">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={voucher.code}
                    onChange={(e) => voucher.setCode(e.target.value)}
                    placeholder="Enter voucher code"
                    className="w-full flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-navy placeholder:text-neutral-400 focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/40"
                  />
                  <button
                    type="button"
                    onClick={voucher.apply}
                    disabled={voucher.checking || !voucher.code.trim()}
                    className="shrink-0 rounded-lg border border-navy px-4 text-sm font-medium text-navy hover:bg-navy hover:text-white disabled:opacity-50"
                  >
                    {voucher.checking ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}
              {voucher.status === 'invalid' && (
                <p className="mt-1.5 text-xs text-red-600">No voucher available / wrong code.</p>
              )}
              {voucher.status === 'used' && (
                <p className="mt-1.5 text-xs text-red-600">Voucher already used.</p>
              )}
              {voucher.error && <p className="mt-1.5 text-xs text-red-600">{voucher.error}</p>}
            </div>

            <div className="border-t border-neutral-200 pt-3">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Subtotal</span>
                <span>{formatLKR(totals.subtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm text-neutral-600">
                <span>Delivery ({totals.totalPieces} pcs)</span>
                <span>{formatLKR(totals.deliveryFee)}</span>
              </div>
              {voucher.status === 'ok' && voucher.discount > 0 && (
                <div className="mt-1 flex justify-between text-sm text-green-700">
                  <span>Voucher discount</span>
                  <span>−{formatLKR(voucher.discount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatLKR(finalTotal)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="mt-4 w-full rounded-full bg-pink py-3.5 text-sm font-bold text-white hover:bg-pink-dark"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
