import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'

export default function KitchenLayout({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const navigate = useNavigate()
  const initials = session?.user.email?.slice(0, 2).toUpperCase() ?? 'KT'

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/kitchen/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-navy px-4 py-3 safe-top">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍫</span>
          <span className="font-display font-semibold text-white">Golden Oven Kitchen</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink text-xs font-bold text-white">
            {initials}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-[44px] min-w-[44px] rounded-full px-3 text-sm text-white/60 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 safe-bottom">{children}</main>
    </div>
  )
}
