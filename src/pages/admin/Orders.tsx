import { useState } from 'react'
import { useAdminOrders, useUpdateOrderStatus } from '../../hooks/useAdminOrders'
import type { AdminOrder } from '../../lib/adminOrders'
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  nextStatus,
  canCancel,
  type OrderStatus,
} from '../../lib/orderStatus'
import { findTier } from '../../lib/pricing'
import { formatLKR, formatDate, toWhatsAppNumber } from '../../lib/format'
import { printOrderSlip } from '../../lib/orderSlip'
import { useCatalog } from '../../contexts/CatalogContext'
import { addonSummary } from '../../lib/whatsapp'
import StatusBadge from '../../components/admin/StatusBadge'

// Admin Orders (spec §7): filterable table with status progression, WhatsApp
// quick-chat, a weight-tier warning badge, a printable order slip, and an
// expandable row showing full items + add-on details.
export default function Orders() {
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: orders, isLoading, isError, error } = useAdminOrders({
    status,
    deliveryDate: deliveryDate || undefined,
  })
  const updateStatus = useUpdateOrderStatus()

  return (
    <div>
      <h1 className="text-xl font-semibold">Orders</h1>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-neutral-600">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')}
            className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-neutral-600">Delivery date</span>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        {(status !== 'all' || deliveryDate) && (
          <button
            type="button"
            onClick={() => {
              setStatus('all')
              setDeliveryDate('')
            }}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading orders…</p>}
      {isError && (
        <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load orders: {error.message}
        </p>
      )}

      {orders && orders.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">No orders match these filters.</p>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
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
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
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
  expanded,
  onToggle,
  onAdvance,
  busy,
}: {
  order: AdminOrder
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
          {heavy && (
            <span
              className="mt-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
              title="Heavy order — check delivery capacity"
            >
              ⚠ Heavy order
            </span>
          )}
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
          <td colSpan={6} className="px-3 py-3">
            <ul className="flex flex-col gap-2">
              {order.order_items.map((item) => {
                const summary = addonSummary(item)
                return (
                  <li key={item.id} className="flex justify-between gap-4 text-sm">
                    <div>
                      <span>
                        {item.product_name} — {item.package_label} × {item.box_qty}
                      </span>
                      {summary && <div className="text-xs text-neutral-500">{summary}</div>}
                    </div>
                    <span className="whitespace-nowrap">{formatLKR(item.line_total)}</span>
                  </li>
                )
              })}
            </ul>
            {order.note && (
              <p className="mt-3 text-sm text-neutral-600">
                <span className="font-medium">Note:</span> {order.note}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
