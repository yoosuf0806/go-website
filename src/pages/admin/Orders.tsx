import { useMemo, useState } from 'react'
import { useAllAdminOrders, useUpdateOrderStatus } from '../../hooks/useAdminOrders'
import type { AdminOrder } from '../../lib/adminOrders'
import { STATUS_LABELS, nextStatus, canCancel, type OrderStatus } from '../../lib/orderStatus'
import {
  ordersForTab,
  orderHasTopper,
  itemTopperLines,
  isRepeatCustomer,
  priorOrderCount,
  type OrderTab,
} from '../../lib/orderView'
import { findTier } from '../../lib/pricing'
import { formatLKR, formatDate, toWhatsAppNumber } from '../../lib/format'
import { printOrderSlip } from '../../lib/orderSlip'
import { useCatalog } from '../../contexts/CatalogContext'
import { addonSummary } from '../../lib/whatsapp'
import StatusBadge from '../../components/admin/StatusBadge'

const TABS: { id: OrderTab; label: string }[] = [
  { id: 'baking_today', label: 'Baking today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All orders' },
]

// Admin Orders (spec §7), 3-tab layout:
//  • Baking today — deliveries due TOMORROW (bake the day before), open only
//  • Upcoming — open orders delivering after tomorrow
//  • All orders — everything, including completed/cancelled
// Rows flag letter-topper orders (green) and repeat customers, and expand to
// show items, topper wording, notes, and full delivery + contact details.
export default function Orders() {
  const [tab, setTab] = useState<OrderTab>('baking_today')
  const [expanded, setExpanded] = useState<string | null>(null)
  const { data: orders, isLoading, isError, error } = useAllAdminOrders()
  const updateStatus = useUpdateOrderStatus()

  const all = orders ?? []
  const counts = useMemo(
    () => ({
      baking_today: ordersForTab(all, 'baking_today').length,
      upcoming: ordersForTab(all, 'upcoming').length,
      all: all.length,
    }),
    [all],
  )
  const visible = useMemo(() => ordersForTab(all, tab), [all, tab])

  return (
    <div>
      <h1 className="text-xl font-semibold">Orders</h1>

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
                tab === t.id ? 'bg-pink-light text-pink' : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

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
          {tab === 'baking_today'
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
}: {
  order: AdminOrder
  allOrders: AdminOrder[]
  expanded: boolean
  onToggle: () => void
  onAdvance: (to: OrderStatus) => void
  busy: boolean
}) {
  const { catalog } = useCatalog()
  const tier = findTier(order.total_pieces, catalog.deliveryTiers)
  const heavy = tier?.warnAdmin ?? false
  const next = nextStatus(order.status)
  const waNumber = toWhatsAppNumber(order.phone)
  const hasTopper = orderHasTopper(order)
  const repeat = isRepeatCustomer(order, allOrders)
  const priorCount = repeat ? priorOrderCount(order, allOrders) : 0

  return (
    <>
      <tr className="border-t border-neutral-100 align-top">
        <td className="px-3 py-3">
          <button type="button" onClick={onToggle} className="font-medium hover:underline">
            {order.order_no}
          </button>
        </td>
        <td className="px-3 py-3">
          <div>{order.customer_name}</div>
          <div className="text-xs text-neutral-500">{order.phone}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
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
          <div className="text-xs text-neutral-500">{order.total_pieces} pcs</div>
        </td>
        <td className="px-3 py-3">{formatLKR(order.total)}</td>
        <td className="px-3 py-3">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1.5">
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
                  </div>
                  <div>
                    📞 {order.phone}
                    {order.alt_phone && <span className="text-neutral-500"> · alt {order.alt_phone}</span>}
                  </div>
                  {order.email && <div>✉️ {order.email}</div>}
                  {order.note && (
                    <div className="mt-1 rounded bg-white px-2 py-1 text-neutral-600">
                      <span className="font-medium">Note:</span> {order.note}
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

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
