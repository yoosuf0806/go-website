import { useQuery } from '@tanstack/react-query'
import KitchenLayout from '../../components/kitchen/KitchenLayout'
import ScheduleCalendar from '../../components/schedule/ScheduleCalendar'
import { fetchKitchenSchedule, kitchenBadge } from '../../lib/kitchenOrders'
import { slotShort } from '../../lib/deliverySlots'
import type { ScheduleOrder } from '../../lib/deliverySchedule'
import type { OrderStatus } from '../../lib/orderStatus'

// Kitchen delivery schedule. The Board is the "what am I baking right now"
// view for one day; this is the month ahead, so the kitchen can see busy days
// coming and plan prep. Same visibility rules as the Board — only orders that
// are paid/processed appear (kitchenVisible), enforced in fetchKitchenSchedule.
export default function KitchenCalendar() {
  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['kitchen-schedule'],
    queryFn: fetchKitchenSchedule,
  })

  return (
    <KitchenLayout>
      <div className="mx-auto max-w-md px-4 py-5">
        {isLoading && <p className="text-sm text-white/50">Loading schedule…</p>}
        {error && (
          <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error instanceof Error ? error.message : 'Failed to load the schedule.'}
          </p>
        )}
        {!isLoading && !error && (
          <ScheduleCalendar
            orders={orders}
            variant="dark"
            renderOrder={(o) => <KitchenOrderRow order={o} />}
          />
        )}
      </div>
    </KitchenLayout>
  )
}

function KitchenOrderRow({ order }: { order: ScheduleOrder }) {
  const badge = kitchenBadge(order.status as OrderStatus)
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">
          #{order.order_no} · {order.customer_name}
        </p>
        <p className={`text-xs ${badge.className}`}>{badge.label}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-white">{slotShort(order.delivery_slot)}</p>
        <p className="text-xs text-white/50">{order.total_pieces} pcs</p>
      </div>
    </div>
  )
}
