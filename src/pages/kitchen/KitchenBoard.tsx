import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchKitchenOrders,
  advanceKitchenStatus,
  KITCHEN_NEXT,
  KITCHEN_STATUS_LABEL,
  offsetDate,
  type KitchenOrder,
} from '../../lib/kitchenOrders'
import KitchenLayout from '../../components/kitchen/KitchenLayout'
import type { OrderStatus } from '../../lib/orderStatus'

const DATE_CHIPS = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'Day after', offset: 2 },
]

export default function KitchenBoard() {
  const [selectedDate, setSelectedDate] = useState(offsetDate(0))

  const qc = useQueryClient()
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['kitchen-orders', selectedDate],
    queryFn: () => fetchKitchenOrders(selectedDate),
  })

  const advance = useMutation({
    mutationFn: ({ id, to }: { id: string; to: OrderStatus }) => advanceKitchenStatus(id, to),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchen-orders', selectedDate] }),
  })

  const toBake = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length
  const ready = orders.filter((o) => o.status === 'ready').length
  const baking = orders.filter((o) => o.status === 'baking').length

  return (
    <KitchenLayout>
      <div className="mx-auto max-w-xl px-4 py-6">
        {/* Summary card */}
        <div className="rounded-2xl bg-navy p-5 text-white">
          <p className="text-xs uppercase tracking-widest text-white/50">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-LK', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <div className="mt-3 flex gap-6">
            <Stat label="To bake" value={toBake} />
            <Stat label="Baking" value={baking} />
            <Stat label="Ready" value={ready} />
          </div>
        </div>

        {/* Date picker: chips + custom date */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {DATE_CHIPS.map(({ label, offset }) => {
            const date = offsetDate(offset)
            const active = date === selectedDate
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`min-h-[44px] rounded-full px-4 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-pink text-white'
                    : 'bg-white text-neutral-700 shadow-sm hover:bg-pink-light'
                }`}
              >
                {label}
              </button>
            )
          })}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="min-h-[44px] rounded-full border border-neutral-200 bg-white px-3 text-sm text-neutral-700 shadow-sm"
          />
        </div>

        {/* Order cards */}
        <div className="mt-5 space-y-3">
          {isLoading && (
            <p className="text-center text-sm text-neutral-400">Loading orders…</p>
          )}
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Failed to load orders'}
            </p>
          )}
          {!isLoading && !error && orders.length === 0 && (
            <p className="py-10 text-center text-sm text-neutral-400">
              No orders for this date.
            </p>
          )}
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={(to) => advance.mutate({ id: order.id, to })}
              advancing={advance.isPending}
            />
          ))}
        </div>
      </div>
    </KitchenLayout>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  )
}

function OrderCard({
  order,
  onAdvance,
  advancing,
}: {
  order: KitchenOrder
  onAdvance: (to: OrderStatus) => void
  advancing: boolean
}) {
  const next = KITCHEN_NEXT[order.status]

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    baking: 'bg-orange-100 text-orange-800',
    ready: 'bg-green-100 text-green-800',
    completed: 'bg-neutral-100 text-neutral-500',
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy">#{order.order_no}</p>
          <p className="text-sm text-neutral-500">{order.customer_name}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor[order.status] ?? 'bg-neutral-100 text-neutral-500'}`}
        >
          {KITCHEN_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Items */}
      <ul className="mt-3 space-y-1">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex gap-2 text-sm">
            <span className="font-medium text-neutral-900">
              {item.box_qty > 1 ? `${item.box_qty}×` : ''}{item.piece_count}pc
            </span>
            <span className="text-neutral-600">{item.product_name}</span>
            <span className="text-neutral-400">({item.package_label})</span>
          </li>
        ))}
      </ul>

      {/* Meta */}
      <div className="mt-3 space-y-0.5 text-xs text-neutral-500">
        {order.address && <p>📍 {order.address}</p>}
        {order.note && <p>📝 {order.note}</p>}
      </div>

      {/* Advance button */}
      {next && (
        <button
          type="button"
          disabled={advancing}
          onClick={() => onAdvance(next.to)}
          className="mt-4 min-h-[44px] w-full rounded-full bg-pink py-2.5 text-sm font-bold text-white hover:bg-pink-dark disabled:opacity-50"
        >
          {next.label}
        </button>
      )}
    </div>
  )
}
