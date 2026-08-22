import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'

// Minimal kitchen header: title + account avatar with a sign-out popover.
// Dark navy theme, mobile-first, honours the top safe-area inset.
export default function KitchenLayout({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const email = session?.user.email ?? ''
  const initial = email.slice(0, 1).toUpperCase() || 'K'

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/kitchen/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-navy text-white">
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-navy px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <span className="font-display text-lg font-semibold">Kitchen</span>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-pink text-sm font-bold text-white"
          >
            {initial}
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-white/10 bg-navy-light p-3 shadow-xl">
                {email && <p className="truncate px-1 pb-2 text-xs text-white/50">{email}</p>}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-[44px] w-full rounded-lg bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Board = today's baking; Schedule = the month ahead. */}
      <nav className="flex gap-1 border-b border-white/10 bg-navy px-4 py-2">
        {[
          { to: '/kitchen', label: 'Board' },
          { to: '/kitchen/schedule', label: 'Schedule' },
        ].map((tab) => {
          const active = pathname === tab.to
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={`min-h-[40px] flex-1 rounded-lg px-4 text-center text-sm font-medium leading-10 transition-colors ${
                active ? 'bg-pink text-white' : 'text-white/60 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </NavLink>
          )
        })}
      </nav>

      <main style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>{children}</main>
    </div>
  )
}
