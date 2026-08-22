import { useEffect, useMemo, useState } from 'react'
import { useAllAdminOrders, useUpdateOrderStatus, useConfirmOrderPayment } from '../../hooks/useAdminOrders'
import type { AdminOrder } from '../../lib/adminOrders'
import { signedSlipUrl } from '../../lib/bankSlips'
import { STATUS_LABELS, nextStatus, canCancel, type OrderStatus } from '../../lib/orderStatus'
import {
  ordersForTab,
  orderHasTopper,
  itemTopperLines,
  isRepeatCustomer,
  priorOrderCount,
  orderGroup,
  type OrderTab,
} from '../../lib/orderView'
import { findTier } from '../../lib/pricing'
import { formatLKR, formatDate, toWhatsAppNumber } from '../../lib/format'
import { printOrderSlip } from '../../lib/orderSlip'
import { useCatalog } from '../../contexts/CatalogContext'
import { addonSummary, deliveryConfirmationWaLink } from '../../lib/whatsapp'
import StatusBadge from '../../components/admin/StatusBadge'
import { slotLabel, slotShort } from '../../lib/deliverySlots'

// wa.me link to the CUSTOMER carrying the order-confirmed message, built
// entirely from the order so the text can't diverge from the system.
function confirmationLink(order: AdminOrder): string {
  return deliveryConfirmationWaLink({
    orderNo: order.order_no,
    phone: order.phone,
    address: order.address,
    deliveryDate: order.delivery_date,
    deliverySlot: order.delivery_slot,
    isGift: order.is_gift,
    recipientName: order.recipient_name,
    recipientPhone: order.recipient_phone,
    items: order.order_items.map((it) => ({
      product_name: it.product_name,
      package_label: it.package_label,
      box_qty: it.box_qty,
    })),
  })
}

const TABS: { id: OrderTab; label: string }[] = [
  { id: 'needs_review', label: '🔔 Needs review' },
  { id: 'with_kitchen', label: '✓ With kitchen' },
  { id: 'baking_today', label: 'Baking today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All orders' },
]

// The at-a-glance badge for an order's workflow group. Amber = new/needs the
// admin's review; green = confirmed and shared to the kitchen.
const GROUP_BADGE: Record<'review' | 'kitchen', { label: string; row: string; pill: string }> = {
  review: {
    label: '🔔 New — needs review',
    row: 'border-l-4 border-l-amber-400',
    pill: 'bg-amber-100 text-amber-800',
  },
  kitchen: {
    label: '✓ Sent to kitchen',
    row: 'border-l-4 border-l-green-500',
    pill: 'bg-green-100 text-green-700',
  },
}

// Admin Orders (spec §7), 3-tab layout:
//  • Baking today — deliveries due TOMORROW (bake the day before), open only
//  • Upcoming — open orders delivering after tomorrow
//  • All orders — everything, including completed/cancelled
// Rows flag letter-topper orders (green) and repeat customers, and expand to
// show items, topper wording, notes, and full delivery + contact details.
export default function Orders() {
  // Land on the "Needs review" inbox so new orders are the first thing seen.
  const [tab, setTab] = useState<OrderTab>('needs_review')
  const [expanded, setExpanded] = useState<string | null>(null)
  const { data: orders, isLoading, isError, error } = useAllAdminOrders()
  const updateStatus = useUpdateOrderStatus()
  const confirmPayment = useConfirmOrderPayment()

  const all = orders ?? []
  const counts = useMemo(
    () => ({
      needs_review: ordersForTab(all, 'needs_review').length,
      with_kitchen: ordersForTab(all, 'with_kitchen').length,
      baking_today: ordersForTab(all, 'baking_today').length,
      upcoming: ordersForTab(all, 'upcoming').length,
      all: all.length,
    }),
    [all],
  )
  const reviewCount = counts.needs_review
  const visible = useMemo(() => ordersForTab(all, tab), [all, tab])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Orders</h1>
        {/* Bell: at-a-glance count of new orders waiting for review. Click to jump
            to the review inbox. Greyed out (no dot) when nothing is waiting. */}
        <button
          type="button"
          onClick={() => setTab('needs_review')}
          aria-label={`${reviewCount} new order${reviewCount === 1 ? '' : 's'} to review`}
          className={`relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            reviewCount > 0
              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-neutral-200 text-neutral-400 hover:bg-neutral-50'
          }`}
        >
          <span className="relative text-base leading-none" aria-hidden>
            🔔
            {reviewCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}
          </span>
          {reviewCount > 0 ? `${reviewCount} to review` : 'All reviewed'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === t.id
                ? 'border-pink font-semibold text-pink'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                // The "needs review" count stays red whenever there are new
                // orders, even on other tabs, so it always draws the eye.
                t.id === 'needs_review' && counts.needs_review > 0
                  ? 'bg-red-500 text-white'
                  : tab === t.id
                    ? 'bg-pink-light text-pink'
                    : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {tab === 'needs_review' && (
        <p className="mt-3 text-xs text-neutral-500">
          New orders you haven’t confirmed yet. Review the slip/details, then confirm to hand them to
          the kitchen.
        </p>
      )}
      {tab === 'with_kitchen' && (
        <p className="mt-3 text-xs text-neutral-500">
          Orders you’ve confirmed — these are now visible to the kitchen.
        </p>
      )}
      {tab === 'baking_today' && (
        <p className="mt-3 text-xs text-neutral-500">
          Deliveries due tomorrow — bake these today.
        </p>
      )}

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading orders…</p>}
      {isError && (
        <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load orders: {error.message}
        </p>
      )}

      {orders && visible.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">
          {tab === 'needs_review'
            ? '🎉 All caught up — no new orders waiting for review.'
            : tab === 'with_kitchen'
              ? 'No open orders are with the kitchen right now.'
              : tab === 'baking_today'
                ? 'Nothing to bake today — no deliveries due tomorrow.'
                : tab === 'upcoming'
                  ? 'No upcoming orders.'
                  : 'No orders yet.'}
        </p>
      )}

      {orders && visible.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Delivery</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  allOrders={all}
                  expanded={expanded === order.id}
                  onToggle={() => setExpanded((cur) => (cur === order.id ? null : order.id))}
                  onAdvance={(to) => updateStatus.mutate({ id: order.id, status: to })}
                  busy={updateStatus.isPending}
                  onConfirmPayment={() =>
                    confirmPayment.mutate(order.id, {
                      // Verifying payment releases the order to the kitchen AND
                      // opens a WhatsApp compose window to the customer with the
                      // order-confirmed message ready to send.
                      onSuccess: () => window.open(confirmationLink(order), '_blank', 'noopener'),
                    })
                  }
                  confirmingPayment={confirmPayment.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OrderRow({
  order,
  allOrders,
  expanded,
  onToggle,
  onAdvance,
  busy,
  onConfirmPayment,
  confirmingPayment,
}: {
  order: AdminOrder
  allOrders: AdminOrder[]
  expanded: boolean
  onToggle: () => void
  onAdvance: (to: OrderStatus) => void
  busy: boolean
  onConfirmPayment: () => void
  confirmingPayment: boolean
}) {
  const { catalog } = useCatalog()
  const tier = findTier(order.total_pieces, catalog.deliveryTiers)
  const heavy = tier?.warnAdmin ?? false
  const next = nextStatus(order.status)
  const waNumber = toWhatsAppNumber(order.phone)
  const hasTopper = orderHasTopper(order)
  const repeat = isRepeatCustomer(order, allOrders)
  const priorCount = repeat ? priorOrderCount(order, allOrders) : 0
  // Workflow group drives the row's left-edge tint + the leading badge, so the
  // admin can tell new/for-review orders from ones already with the kitchen.
  const group = orderGroup(order)
  const groupBadge = group === 'closed' ? null : GROUP_BADGE[group]

  return (
    <>
      <tr className={`border-t border-neutral-100 align-top ${groupBadge?.row ?? ''}`}>
        <td className="px-3 py-3">
          <button type="button" onClick={onToggle} className="font-medium hover:underline">
            {order.order_no}
          </button>
        </td>
        <td className="px-3 py-3">
          <div>{order.customer_name}</div>
          <div className="text-xs text-neutral-500">{order.phone}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {groupBadge && (
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${groupBadge.pill}`}>
                {groupBadge.label}
              </span>
            )}
            {order.is_gift && (
              <span
                className="inline-block rounded-full bg-pink-light px-2 py-0.5 text-xs font-medium text-pink"
                title={`Gift${order.recipient_name ? ` for ${order.recipient_name}` : ''}`}
              >
                🎁 Gift
              </span>
            )}
            {hasTopper && (
              <span
                className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                title="This order has letter-topper wording"
              >
                Letter topper
              </span>
            )}
            {repeat && (
              <span
                className="inline-block rounded-full bg-pink-light px-2 py-0.5 text-xs font-medium text-pink"
                title="This customer has ordered before (matched by phone or email)"
              >
                Repeat · {ordinal(priorCount + 1)} order
              </span>
            )}
            {heavy && (
              <span
                className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                title="Heavy order — check delivery capacity"
              >
                ⚠ Heavy
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          {order.delivery_date ? formatDate(order.delivery_date) : '—'}
          <div className="text-xs text-neutral-500">
            {order.delivery_slot ? `${slotShort(order.delivery_slot)} · ` : ''}
            {order.total_pieces} pcs
          </div>
        </td>
        <td className="px-3 py-3">{formatLKR(order.total)}</td>
        <td className="px-3 py-3">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onToggle}
              className={`rounded border px-2 py-1 text-xs ${
                expanded
                  ? 'border-pink bg-pink-light font-semibold text-pink'
                  : 'border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              {expanded ? 'Close' : 'Review'}
            </button>
            {next && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAdvance(next)}
                className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
              >
                → {STATUS_LABELS[next]}
              </button>
            )}
            {canCancel(order.status) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAdvance('cancelled')}
                className="rounded border border-neutral-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
              >
                WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => printOrderSlip(order)}
              className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
            >
              Slip
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-neutral-100 bg-neutral-50">
          <td colSpan={6} className="px-3 py-4">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Items</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {order.order_items.map((item) => {
                    const summary = addonSummary(item)
                    const topper = itemTopperLines(item)
                    return (
                      <li key={item.id} className="flex justify-between gap-4 text-sm">
                        <div>
                          <span>
                            {item.product_name} — {item.package_label} × {item.box_qty}
                          </span>
                          {topper.length > 0 && (
                            <div className="text-xs font-medium text-green-700">
                              Topper: “{topper.join(' / ')}”
                            </div>
                          )}
                          {summary && !topper.length && (
                            <div className="text-xs text-neutral-500">{summary}</div>
                          )}
                        </div>
                        <span className="whitespace-nowrap">{formatLKR(item.line_total)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Delivery &amp; contact
                </p>
                <dl className="mt-2 flex flex-col gap-1 text-sm text-neutral-700">
                  <div>📍 {order.address || <span className="text-neutral-400">No address</span>}</div>
                  <div>
                    🗓 {order.delivery_date ? formatDate(order.delivery_date) : 'No delivery date'}
                    {order.delivery_slot ? ` · ${slotLabel(order.delivery_slot)}` : ''}
                  </div>
                  <div>
                    📞 {order.phone}
                    {order.alt_phone && <span className="text-neutral-500"> · alt {order.alt_phone}</span>}
                  </div>
                  {order.email && <div>✉️ {order.email}</div>}
                  {order.is_gift && (
                    <div className="mt-1 rounded bg-pink-light px-2 py-1 text-pink">
                      🎁 Gift for: {order.recipient_name || '—'}
                      {order.recipient_phone && ` · 📞 ${order.recipient_phone}`}
                    </div>
                  )}
                  {order.note && (
                    <div className="mt-1 rounded bg-white px-2 py-1 text-neutral-600">
                      <span className="font-medium">Note:</span> {order.note}
                    </div>
                  )}
                  {order.payment_method && (
                    <div className="mt-1 rounded bg-white px-2 py-1.5 text-neutral-700">
                      <span className="font-medium">Payment:</span>{' '}
                      {order.payment_method === 'bank_transfer' ? 'Bank transfer' : 'Card'}
                      {order.payment_status && (
                        <span
                          className={`ml-1.5 rounded px-1.5 py-0.5 text-xs font-semibold ${
                            order.payment_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : order.payment_status === 'awaiting_verification'
                                ? 'bg-amber-100 text-amber-700'
                                : order.payment_status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {order.payment_status.replace(/_/g, ' ')}
                        </span>
                      )}
                      {order.payment_ref && (
                        <div className="text-xs text-neutral-500">Ref: {order.payment_ref}</div>
                      )}
                      {order.slip_url && <SlipLink path={order.slip_url} />}
                      {order.payment_status === 'awaiting_verification' && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={onConfirmPayment}
                            disabled={confirmingPayment}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {confirmingPayment ? 'Confirming…' : '✓ Confirm & verified'}
                          </button>
                          <p className="mt-1 text-[11px] text-neutral-400">
                            Sends this order to the kitchen and opens a WhatsApp confirmation to the customer.
                          </p>
                        </div>
                      )}
                      {order.payment_status === 'paid' && (
                        <div className="mt-2">
                          <a
                            href={confirmationLink(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block rounded-lg border border-green-300 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-50"
                          >
                            Send confirmation on WhatsApp
                          </a>
                          <p className="mt-1 text-[11px] text-neutral-400">
                            Re-open the order-confirmed message to the customer.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function SlipLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    signedSlipUrl(path).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [path])
  if (!url) return <div className="text-xs text-neutral-400">Loading slip…</div>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-medium text-pink underline hover:no-underline"
    >
      View bank slip
    </a>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
