import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/sales', label: 'Sales' },
  { to: '/ad-spend', label: 'Ad Spend' },
  { to: '/purchasing', label: 'Purchasing' },
  { to: '/expenses', label: 'Expenses & Targets' },
  { to: '/income', label: 'Income Statement' },
  { to: '/costing', label: 'Costing' },
  { to: '/pipeline', label: 'B2B Pipeline' },
  { to: '/shares', label: 'Shares' },
]

export function Layout() {
  const { session, signOut } = useAuth()
  return (
    <div className="flex min-h-screen bg-cocoa-50 text-cocoa-900">
      <aside className="flex w-56 flex-col border-r border-cocoa-100 bg-white">
        <div className="border-b border-cocoa-100 px-5 py-4">
          <div className="text-lg font-bold text-cocoa-800">Golden Oven</div>
          <div className="text-xs text-cocoa-400">Ops &amp; Finance</div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-cocoa-600 text-white' : 'text-cocoa-600 hover:bg-cocoa-50'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-cocoa-100 p-3">
          <div className="mb-2 truncate px-2 text-xs text-cocoa-400">{session?.user.email}</div>
          <button
            onClick={() => signOut()}
            className="w-full rounded-lg border border-cocoa-200 px-3 py-1.5 text-sm text-cocoa-600 hover:bg-cocoa-50"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
