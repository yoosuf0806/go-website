import { useCartStore } from '../../stores/cart'
import { useVoucherStore } from '../../stores/voucher'
import { cartTotals, lineTotal, totalAfterVoucher, findTier } from '../../lib/pricing'
import { formatLKR } from '../../lib/format'
import { addonSummary } from '../../lib/whatsapp'
import { useCatalog } from '../../contexts/CatalogContext'

interface CartDrawerProps {
  onClose: () => void
  onCheckout: () => void
}

// Cart drawer (spec §3, §10 Phase 5) — a bottom sheet on mobile
// (04-cart.md: slide-up sheet, not a side drawer), widening to a
// right-aligned panel on desktop. Every total shown here comes from
// cartTotals()/lineTotal() — the same functions the checkout review step
// and the WhatsApp message use, so nothing can drift (spec §11).
export default function CartDrawer({ onClose, onCheckout }: CartDrawerProps) {
  const { catalog } = useCatalog()
  const items = useCartStore((s) => s.items)
  const incrementBoxQty = useCartStore((s) => s.incrementBoxQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const totals = cartTotals(items, catalog.deliveryTiers)
  const voucher = useVoucherStore()
  const finalTotal = totalAfterVoucher(totals.total, voucher.status === 'ok' ? voucher.discount : 0)
  const itemCount = items.reduce((n, i) => n + i.boxQty, 0)

  // Free-delivery nudge: only shown when the delivery data actually has a
  // zero-fee tier the customer hasn't reached yet (never hardcoded — some
  // catalogues are a single flat fee with no free tier at all).
  const freeTier = catalog.deliveryTiers
    .filter((t) => t.fee === 0)
    .sort((a, b) => a.minPieces - b.minPieces)[0]
  const currentTier = findTier(totals.totalPieces, catalog.deliveryTiers)
  const deliveryIsFree = (currentTier?.fee ?? 0) === 0
  const piecesToFree = freeTier ? freeTier.minPieces - totals.totalPieces : 0
  const freeNote = deliveryIsFree
    ? 'Free delivery unlocked!'
    : freeTier && piecesToFree > 0
      ? `Add ${piecesToFree} more ${piecesToFree === 1 ? 'piece' : 'pieces'} for free delivery`
      : ''

  const productImage = (productId: string) =>
    catalog.products.find((p) => p.id === productId)?.imageUrl ?? null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button aria-label="Close cart" className="absolute inset-0 bg-navy/48 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-white shadow-[0_-20px_40px_-20px_rgba(43,17,3,0.4)] sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:shadow-xl">
        {/* Grab handle (mobile only) */}
        <div className="pt-2 sm:hidden">
          <div className="mx-auto h-1 w-9 rounded-full bg-blush-200" />
        </div>

        <div className="flex items-center justify-between border-b border-blush-100 px-5 py-3.5">
          <h2 className="font-display text-[22px] text-navy">
            Your Cart{itemCount > 0 ? ` (${itemCount})` : ''}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-50 text-xl font-light text-navy hover:bg-blush-100"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-6 pb-9 pt-11 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-blush-200 bg-blush-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8355a" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 8h12l-1.2 12H7.2L6 8Z" />
                <path d="M9.4 8V6.2a2.6 2.6 0 0 1 5.2 0V8" />
              </svg>
            </div>
            <h3 className="font-display text-[22px] text-navy">Nothing in the box yet</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-neutral-500">
              Start with a best seller — most people do.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-2xl bg-pink py-4 text-base font-bold text-white hover:bg-pink-dark"
            >
              Shop brownies
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <ul className="flex flex-col gap-3">
                {items.map((item) => {
                  const summary = addonSummary(item)
                  const meta = [item.packageLabel, summary].filter(Boolean).join(' · ')
                  const img = productImage(item.productId)
                  return (
                    <li key={item.key} className="flex gap-3">
                      <div className="h-[68px] w-[68px] flex-none overflow-hidden rounded-xl bg-blush-100">
                        {img && <img src={img} alt={item.productName} className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-medium text-navy">{item.productName}</div>
                            {meta && <div className="truncate pt-0.5 text-[13px] text-neutral-500">{meta}</div>}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            aria-label={`Remove ${item.productName}`}
                            className="flex-none text-[13px] text-neutral-500 underline hover:text-navy"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-0.5 rounded-full border border-blush-200 p-0.5">
                            <button
                              type="button"
                              onClick={() => incrementBoxQty(item.key, -1)}
                              aria-label="Decrease box quantity"
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-50 text-[17px] font-medium text-navy hover:bg-blush-100"
                            >
                              −
                            </button>
                            <span className="min-w-7 text-center text-[15px] font-bold text-navy">{item.boxQty}</span>
                            <button
                              type="button"
                              onClick={() => incrementBoxQty(item.key, 1)}
                              aria-label="Increase box quantity"
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-50 text-[17px] font-medium text-navy hover:bg-blush-100"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-base font-bold text-navy">{formatLKR(lineTotal(item))}</span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="border-t border-blush-100 px-5 pb-[max(1.125rem,env(safe-area-inset-bottom))] pt-3.5">
              {/* Gift voucher */}
              <div className="pb-3">
                {voucher.status === 'ok' ? (
                  <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                    <span>Voucher accepted — {voucher.code.trim().toUpperCase()}</span>
                    <button type="button" onClick={voucher.remove} className="font-medium underline hover:no-underline">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucher.code}
                      onChange={(e) => voucher.setCode(e.target.value)}
                      placeholder="Gift voucher code"
                      className="w-full flex-1 rounded-lg border border-blush-200 bg-white px-3 py-2.5 text-sm text-navy placeholder:text-neutral-400 focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/40"
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
                {voucher.status === 'invalid' && <p className="mt-1.5 text-xs text-red-600">No voucher available / wrong code.</p>}
                {voucher.status === 'used' && <p className="mt-1.5 text-xs text-red-600">Voucher already used.</p>}
                {voucher.error && <p className="mt-1.5 text-xs text-red-600">{voucher.error}</p>}
              </div>

              <div className="flex justify-between pb-1.5 text-[15px] text-neutral-600">
                <span>Subtotal</span>
                <span>{formatLKR(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[15px] text-neutral-600">
                <span>Delivery</span>
                <span>{deliveryIsFree ? 'Free' : formatLKR(totals.deliveryFee)}</span>
              </div>
              {voucher.status === 'ok' && voucher.discount > 0 && (
                <div className="mt-1.5 flex justify-between text-[15px] text-green-700">
                  <span>Voucher discount</span>
                  <span>−{formatLKR(voucher.discount)}</span>
                </div>
              )}
              {freeNote && <div className="pt-2 text-[13px] font-medium text-berry">{freeNote}</div>}
              <div className="mt-2.5 flex items-baseline justify-between border-t border-blush-100 pt-2.5">
                <span className="text-base font-bold text-navy">Total</span>
                <span className="text-[22px] font-bold text-navy">{formatLKR(finalTotal)}</span>
              </div>

              <button
                type="button"
                onClick={onCheckout}
                className="mt-3.5 w-full rounded-2xl bg-pink py-4 text-base font-bold text-white hover:bg-pink-dark"
              >
                Checkout
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full py-2 text-[15px] font-medium text-neutral-500 hover:text-navy"
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
