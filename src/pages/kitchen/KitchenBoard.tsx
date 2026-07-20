import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchKitchenOrders,
  advanceKitchenStatus,
  describeAddon,
  kitchenBadge,
  KITCHEN_NEXT,
  offsetDate,
  type KitchenButtonVariant,
  type KitchenOrder,
} from '../../lib/kitchenOrders'
import KitchenLayout from '../../components/kitchen/KitchenLayout'
import type { OrderStatus } from '../../lib/orderStatus'

const DATE_CHIPS = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'Day after', offset: 2 },
]

const BUTTON_VARIANT: Record<KitchenButtonVariant, string> = {
  pink: 'bg-pink text-white hover:bg-pink-dark',
  green: 'bg-green-600 text-white hover:bg-green-500',
  navy: 'bg-white/10 text-white hover:bg-white/20',
}

function formatLongDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function KitchenBoard() {
  const [selectedDate, setSelectedDate] = useState(offsetDate(0))

  const qc = useQueryClient()
  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['kitchen-orders', selectedDate],
    queryFn: () => fetchKitchenOrders(selectedDate),
  })

  const advance = useMutation({
    mutationFn: ({ id, to }: { id: string; to: OrderStatus }) => advanceKitchenStatus(id, to),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchen-orders', selectedDate] }),
  })

  // Two-bucket summary: everything not yet ready ("to bake") vs ready to go out.
  const toBake = orders.filter(
    (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'baking',
  ).length
  const ready = orders.filter((o) => o.status === 'ready').length

  return (
    <KitchenLayout>
      <div className="mx-auto max-w-md px-4 py-5">
        <p className="text-sm text-white/50">{formatLongDate(selectedDate)}</p>

        {/* Summary card */}
        <div className="mt-3 grid grid-cols-2 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 p-5">
          <SummaryStat label="To bake" value={toBake} />
          <SummaryStat label="Ready" value={ready} className="pl-6" />
        </div>

        {/* Date picker: chips + native input */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {DATE_CHIPS.map(({ label, offset }) => {
            const date = offsetDate(offset)
            const active = date === selectedDate
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`min-h-[44px] rounded-full px-5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-pink text-white'
                    : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
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
            className="min-h-[44px] rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white [color-scheme:dark]"
          />
        </div>

        {/* Job cards */}
        <div className="mt-5 space-y-3">
          {isLoading && <p className="py-10 text-center text-sm text-white/40">Loading orders…</p>}
          {error && (
            <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">
              {error instanceof Error ? error.message : 'Failed to load orders'}
            </p>
          )}
          {!isLoading && !error && orders.length === 0 && (
            <p className="py-12 text-center text-sm text-white/40">No orders for this date.</p>
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

function SummaryStat({
  label,
  value,
  className = '',
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
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
  const badge = kitchenBadge(order.status)
  const next = KITCHEN_NEXT[order.status]

  // Extra notes: free-text order note + a short line per addon on any item.
  const extras = [
    order.note ?? '',
    ...order.order_items.flatMap((i) => (i.addons ?? []).map(describeAddon)),
  ].filter(Boolean)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-white/40">#{order.order_no}</p>
        <span className={`text-xs font-semibold ${badge.className}`}>{badge.label}</span>
      </div>

      {/* qty × brownie type — one line per item */}
      <div className="mt-1 space-y-0.5">
        {order.order_items.map((item) => (
          <p key={item.id} className="text-base font-semibold text-white">
            {item.piece_count} × {item.product_name}
            {item.box_qty > 1 && <span className="text-white/50"> ({item.box_qty} boxes)</span>}
          </p>
        ))}
      </div>

      {/* Details */}
      <div className="mt-3 space-y-1 text-sm text-white/60">
        {extras.length > 0 && <p>📝 {extras.join(', ')}</p>}
        <p>📅 Deliver {formatShortDate(order.delivery_date)}</p>
        {order.address && <p>📍 {order.address}</p>}
      </div>

      {/* Advance button */}
      {next && (
        <button
          type="button"
          disabled={advancing}
          onClick={() => onAdvance(next.to)}
          className={`mt-4 min-h-[44px] w-full rounded-full text-sm font-bold transition-colors disabled:opacity-50 ${BUTTON_VARIANT[next.variant]}`}
        >
          {next.label}
        </button>
      )}
    </div>
  )
}
