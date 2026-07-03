import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// Gates admin routes behind a Supabase Auth session. Redirects to /admin/login
// when there is no session (spec §7). Any authenticated user is an admin in v1.
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
