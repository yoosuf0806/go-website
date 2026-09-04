import { Suspense, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'
import { usePublish } from '../../hooks/usePublish'
import { useAllAdminOrders } from '../../hooks/useAdminOrders'
import { useOrderNotifications } from '../../hooks/useOrderNotifications'
import { needsReviewCount } from '../../lib/orderView'
import InstallAppButton from '../InstallAppButton'
import Toast from '../ui/Toast'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/calendar', label: 'Delivery Schedule' },
  { to: '/admin/inquiries', label: 'Inquiries' },
  { to: '/admin/content', label: 'Content & SEO' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/addon-pricing', label: 'Add-on Pricing' },
  { to: '/admin/gift-vouchers', label: 'Gift Vouchers' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/settings', label: 'Settings' },
]

// Admin shell. Desktop: a fixed sidebar + content. Mobile: a top bar with a
// hamburger that opens the same nav as an off-canvas drawer, so the whole admin
// is usable one-handed on a phone (and installable as a PWA).
export default function AdminLayout() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Live count of new orders awaiting review — a badge on the Orders nav item
  // and the mobile bell. Shares the Orders page's React Query cache (same key).
  const { data: orders } = useAllAdminOrders()
  const reviewCount = needsReviewCount(orders ?? [])

  const notify = useOrderNotifications()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
        <SidebarContent
          reviewCount={reviewCount}
          notify={notify}
          onLogout={handleLogout}
          onToast={setToast}
        />
      </aside>

      {/* Mobile off-canvas drawer + backdrop */}
      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col border-r border-neutral-200 bg-white shadow-xl md:hidden">
            <SidebarContent
              reviewCount={reviewCount}
              notify={notify}
              onLogout={handleLogout}
              onToast={setToast}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-xl hover:bg-neutral-100"
          >
            ☰
            {reviewCount > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" aria-hidden />
            )}
          </button>
          <span className="flex-1 truncate text-sm font-semibold">Golden Oven Admin</span>
          <NotifyBell notify={notify} />
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

type NotifyState = ReturnType<typeof useOrderNotifications>

function SidebarContent({
  reviewCount,
  notify,
  onLogout,
  onToast,
  onNavigate,
}: {
  reviewCount: number
  notify: NotifyState
  onLogout: () => void
  onToast: (msg: string) => void
  onNavigate?: () => void
}) {
  const { session } = useSession()
  const publish = usePublish()

  function handlePublish() {
    publish.mutate(undefined, {
      onSuccess: () => onToast('Publishing… changes live in ~1 min.'),
    })
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-lg font-semibold">Golden Oven Admin</span>
        <NotifyBell notify={notify} />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
        {navItems.map((item) => {
          const badge = item.to === '/admin/orders' && reviewCount > 0 ? reviewCount : null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center justify-between rounded px-3 py-2.5 text-sm ${
                  isActive ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`
              }
            >
              <span>{item.label}</span>
              {badge != null && (
                <span
                  className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white"
                  title={`${badge} new order${badge === 1 ? '' : 's'} to review`}
                >
                  {badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-neutral-200 p-3">
        <InstallAppButton className="mb-2 w-full rounded-full border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100" />
        <button
          type="button"
          onClick={handlePublish}
          disabled={publish.isPending}
          className="mb-2 w-full rounded-full bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {publish.isPending ? 'Publishing…' : 'Publish changes'}
        </button>
        {publish.isError && <p className="mb-2 px-1 text-xs text-red-600">{publish.error.message}</p>}
        {session?.user.email && (
          <p className="truncate px-1 pb-2 text-xs text-neutral-500" title={session.user.email}>
            {session.user.email}
          </p>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
        >
          Sign out
        </button>
      </div>
    </>
  )
}

// Bell toggle for new-order OS notifications. Filled when active; tapping it
// asks for permission the first time, then turns delivery on/off per device.
function NotifyBell({ notify }: { notify: NotifyState }) {
  if (!notify.supported) return null

  const denied = notify.permission === 'denied'
  const title = denied
    ? 'Notifications are blocked in your browser settings'
    : notify.active
      ? 'New-order notifications on — tap to turn off'
      : 'Turn on new-order notifications'

  return (
    <button
      type="button"
      onClick={() => void notify.toggle()}
      disabled={denied}
      aria-pressed={notify.active}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors ${
        notify.active ? 'bg-amber-100 text-amber-700' : 'text-neutral-500 hover:bg-neutral-100'
      } disabled:opacity-40`}
    >
      {notify.active ? '🔔' : '🔕'}
    </button>
  )
}
