import { Suspense, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'
import { usePublish } from '../../hooks/usePublish'
import Toast from '../ui/Toast'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/inquiries', label: 'Inquiries' },
  { to: '/admin/content', label: 'Content & SEO' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/addon-pricing', label: 'Add-on Pricing' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/settings', label: 'Settings' },
]

// Admin shell: sidebar + content area. Rendered inside ProtectedRoute.
export default function AdminLayout() {
  const { session } = useSession()
  const navigate = useNavigate()
  const publish = usePublish()
  const [toast, setToast] = useState<string | null>(null)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  function handlePublish() {
    publish.mutate(undefined, {
      onSuccess: () => setToast('Publishing… changes live in ~1 min.'),
    })
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="px-4 py-4 text-lg font-semibold">Golden Oven Admin</div>
        <nav className="flex flex-1 flex-col px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-neutral-200 p-3">
          <button
            type="button"
            onClick={handlePublish}
            disabled={publish.isPending}
            className="mb-2 w-full rounded-full bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {publish.isPending ? 'Publishing…' : 'Publish changes'}
          </button>
          {publish.isError && (
            <p className="mb-2 px-1 text-xs text-red-600">{publish.error.message}</p>
          )}
          {session?.user.email && (
            <p className="truncate px-1 pb-2 text-xs text-neutral-500" title={session.user.email}>
              {session.user.email}
            </p>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
