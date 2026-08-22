import { useMemo, useState } from 'react'
import {
  WEEKDAY_LABELS,
  addMonths,
  formatDayLong,
  groupByDate,
  monthGrid,
  monthTitle,
  piecesOn,
  todayISO,
  type ScheduleOrder,
} from '../../lib/deliverySchedule'
import { DELIVERY_SLOTS, slotShort } from '../../lib/deliverySlots'

/**
 * Month calendar of deliveries still to go out, shared by the Admin and
 * Kitchen schedule pages. Click a day to see that day's orders in delivery
 * order (morning slot → afternoon → no slot).
 *
 * The two hosts have opposite palettes — Admin is light, Kitchen is dark navy —
 * so colours come from a `variant` rather than being hard-coded.
 */

export type CalendarVariant = 'light' | 'dark'

interface Theme {
  card: string
  headerText: string
  mutedText: string
  navBtn: string
  weekday: string
  cell: string
  cellOutside: string
  cellToday: string
  cellSelected: string
  dayNum: string
  pill: string
  emptyText: string
  listRow: string
}

const THEMES: Record<CalendarVariant, Theme> = {
  light: {
    card: 'rounded-xl border border-neutral-200 bg-white',
    headerText: 'text-neutral-900',
    mutedText: 'text-neutral-500',
    navBtn: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100',
    weekday: 'text-neutral-400',
    cell: 'border-neutral-200 hover:bg-neutral-50',
    cellOutside: 'bg-neutral-50/60 text-neutral-300',
    cellToday: 'ring-1 ring-inset ring-pink',
    cellSelected: 'bg-pink/10 ring-2 ring-inset ring-pink',
    dayNum: 'text-neutral-700',
    pill: 'bg-pink/10 text-pink-dark',
    emptyText: 'text-neutral-400',
    listRow: 'border-neutral-200 bg-white',
  },
  dark: {
    card: 'rounded-2xl border border-white/10 bg-white/5',
    headerText: 'text-white',
    mutedText: 'text-white/50',
    navBtn: 'border border-white/15 text-white hover:bg-white/10',
    weekday: 'text-white/40',
    cell: 'border-white/10 hover:bg-white/10',
    cellOutside: 'bg-black/10 text-white/20',
    cellToday: 'ring-1 ring-inset ring-pink',
    cellSelected: 'bg-pink/20 ring-2 ring-inset ring-pink',
    dayNum: 'text-white/80',
    pill: 'bg-pink/20 text-pink-100',
    emptyText: 'text-white/40',
    listRow: 'border-white/10 bg-white/5',
  },
}

interface Props {
  orders: ScheduleOrder[]
  variant?: CalendarVariant
  /** Rendered for each order in the selected day's list. */
  renderOrder?: (order: ScheduleOrder) => React.ReactNode
  /** Extra label under the day count in a cell, e.g. piece totals. */
  showPieces?: boolean
}

export default function ScheduleCalendar({
  orders,
  variant = 'light',
  renderOrder,
  showPieces = true,
}: Props) {
  const t = THEMES[variant]
  const today = todayISO()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = useState<string | null>(today)

  const byDate = useMemo(() => groupByDate(orders), [orders])
  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
  const selectedOrders = selected ? (byDate.get(selected) ?? []) : []

  // Total still to deliver in the visible month — the "how busy is this month"
  // number, counted from the grid so it matches exactly what's on screen.
  const monthTotal = cells.reduce(
    (n, c) => n + (c.inMonth ? (byDate.get(c.date)?.length ?? 0) : 0),
    0,
  )

  function go(delta: number) {
    setCursor((c) => addMonths(c.year, c.month, delta))
  }

  function jumpToday() {
    const d = new Date()
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(today)
  }

  return (
    <div className="space-y-4">
      {/* Month header + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-semibold ${t.headerText}`}>
            {monthTitle(cursor.year, cursor.month)}
          </h2>
          <p className={`text-sm ${t.mutedText}`}>
            {monthTotal} {monthTotal === 1 ? 'delivery' : 'deliveries'} pending this month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous month"
            className={`min-h-[40px] rounded-lg px-3 text-sm ${t.navBtn}`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={jumpToday}
            className={`min-h-[40px] rounded-lg px-3 text-sm font-medium ${t.navBtn}`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next month"
            className={`min-h-[40px] rounded-lg px-3 text-sm ${t.navBtn}`}
          >
            →
          </button>
        </div>
      </div>

      {/* Month grid */}
      <div className={`overflow-hidden ${t.card}`}>
        <div className={`grid grid-cols-7 border-b ${t.cell.split(' ')[0]}`}>
          {WEEKDAY_LABELS.map((d) => (
            <div
              key={d}
              className={`px-1 py-2 text-center text-[11px] font-medium uppercase tracking-wide ${t.weekday}`}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const dayOrders = byDate.get(cell.date) ?? []
            const count = dayOrders.length
            const isSelected = cell.date === selected
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelected(cell.date)}
                aria-pressed={isSelected}
                aria-label={`${formatDayLong(cell.date)}, ${count} ${count === 1 ? 'delivery' : 'deliveries'}`}
                className={`relative min-h-[76px] border-b border-r p-1.5 text-left align-top transition-colors sm:min-h-[92px] ${t.cell} ${
                  cell.inMonth ? '' : t.cellOutside
                } ${isSelected ? t.cellSelected : cell.isToday ? t.cellToday : ''}`}
              >
                <span
                  className={`text-xs font-semibold ${cell.inMonth ? t.dayNum : ''} ${
                    cell.isToday ? 'text-pink' : ''
                  }`}
                >
                  {Number(cell.date.slice(8))}
                </span>
                {count > 0 && (
                  <span className={`mt-1 block rounded px-1 py-0.5 text-[11px] font-medium ${t.pill}`}>
                    {count} {count === 1 ? 'order' : 'orders'}
                    {showPieces && <span className="hidden sm:inline"> · {piecesOn(dayOrders)} pcs</span>}
                  </span>
                )}
                {/* Slot dots: a glance at whether a day is morning- or evening-heavy. */}
                {count > 0 && (
                  <span className="mt-1 flex gap-1">
                    {DELIVERY_SLOTS.map((s) => {
                      const n = dayOrders.filter((o) => o.delivery_slot === s.code).length
                      if (!n) return null
                      return (
                        <span
                          key={s.code}
                          title={`${n} × ${s.short}`}
                          className={`text-[10px] ${t.mutedText}`}
                        >
                          {s.short}:{n}
                        </span>
                      )
                    })}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day */}
      {selected && (
        <div>
          <h3 className={`mb-2 text-sm font-semibold ${t.headerText}`}>
            {formatDayLong(selected)}
            <span className={`ml-2 font-normal ${t.mutedText}`}>
              {selectedOrders.length
                ? `${selectedOrders.length} pending · ${piecesOn(selectedOrders)} pcs`
                : ''}
            </span>
          </h3>
          {selectedOrders.length === 0 ? (
            <p className={`rounded-lg border border-dashed px-4 py-6 text-center text-sm ${t.cell} ${t.emptyText}`}>
              No deliveries pending on this day.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedOrders.map((o) => (
                <li key={o.id} className={`rounded-lg border px-3 py-2 ${t.listRow}`}>
                  {renderOrder ? (
                    renderOrder(o)
                  ) : (
                    <DefaultOrderRow order={o} muted={t.mutedText} strong={t.headerText} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function DefaultOrderRow({
  order,
  muted,
  strong,
}: {
  order: ScheduleOrder
  muted: string
  strong: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`truncate text-sm font-medium ${strong}`}>
          #{order.order_no} · {order.customer_name}
        </p>
        {order.address && <p className={`truncate text-xs ${muted}`}>{order.address}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-xs font-medium ${strong}`}>{slotShort(order.delivery_slot)}</p>
        <p className={`text-xs ${muted}`}>{order.total_pieces} pcs</p>
      </div>
    </div>
  )
}
