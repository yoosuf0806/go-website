import { useAllAdminOrders } from '../../hooks/useAdminOrders'
import ScheduleCalendar from '../../components/schedule/ScheduleCalendar'
import StatusBadge from '../../components/admin/StatusBadge'
import { slotShort } from '../../lib/deliverySlots'
import type { ScheduleOrder } from '../../lib/deliverySchedule'
import type { AdminOrder } from '../../lib/adminOrders'

// Admin delivery schedule: a month calendar of every order still to go out,
// grouped by day and ordered by delivery slot. Complements the Orders page —
// Orders answers "what's in this bucket", the calendar answers "how is the
// month laid out and what's due when".
export default function Calendar() {
  const { data: orders, isLoading, isError, error } = useAllAdminOrders()
  const all = orders ?? []

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Delivery schedule</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Orders still to deliver, by date and time slot. Completed and cancelled orders are hidden.
        </p>
      </header>

      {isLoading && <p className="text-sm text-neutral-500">Loading schedule…</p>}
      {isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load orders.'}
        </p>
      )}

      {!isLoading && !isError && (
        <ScheduleCalendar
          orders={all}
          variant="light"
          renderOrder={(o) => <AdminOrderRow order={o} all={all} />}
        />
      )}
    </section>
  )
}

function AdminOrderRow({ order, all }: { order: ScheduleOrder; all: AdminOrder[] }) {
  // ScheduleCalendar works on the narrow ScheduleOrder shape; look the full
  // order back up so the row can show contact + payment context.
  const full = all.find((o) => o.id === order.id)
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-neutral-900">
          #{order.order_no} · {order.customer_name}
        </p>
        {order.address && <p className="truncate text-xs text-neutral-500">{order.address}</p>}
        {full?.phone && <p className="text-xs text-neutral-500">{full.phone}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-medium text-neutral-800">{slotShort(order.delivery_slot)}</p>
          <p className="text-xs text-neutral-500">{order.total_pieces} pcs</p>
        </div>
        <StatusBadge status={full?.status ?? 'pending'} />
      </div>
    </div>
  )
}
