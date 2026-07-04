import { Link } from 'react-router-dom'
import { useDashboard } from '../../hooks/useDashboard'
import { formatLKR } from '../../lib/format'

// Admin Dashboard (spec §7): today's orders, pending, revenue this week, new
// inquiries, and the low-piece vs heavy-order breakdown. Live via React Query.
export default function Dashboard() {
  const { data, isLoading, isError, error } = useDashboard()

  return (
    <div>
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading…</p>}
      {isError && (
        <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load dashboard: {error.message}
        </p>
      )}

      {data && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Today's orders" value={data.todayOrders} to="/admin/orders" />
          <Stat label="Pending orders" value={data.pendingOrders} to="/admin/orders" />
          <Stat label="Revenue this week" value={formatLKR(data.revenueThisWeek)} />
          <Stat label="New inquiries" value={data.newInquiries} to="/admin/inquiries" />
          <Stat label="Low-piece orders" value={data.lowPieceOrders} />
          <Stat label="Heavy orders" value={data.heavyOrders} accent={data.heavyOrders > 0} />
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  to,
  accent,
}: {
  label: string
  value: string | number
  to?: string
  accent?: boolean
}) {
  const card = (
    <div
      className={`rounded-lg border bg-white p-5 ${
        accent ? 'border-red-200' : 'border-neutral-200'
      }`}
    >
      <p className="text-sm text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? 'text-red-700' : ''}`}>{value}</p>
    </div>
  )
  return to ? (
    <Link to={to} className="block transition-shadow hover:shadow-sm">
      {card}
    </Link>
  ) : (
    card
  )
}
