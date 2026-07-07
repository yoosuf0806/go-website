import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

// Gates admin routes behind a Supabase Auth session. Redirects to /admin/login
// when there is no session (spec §7). Any authenticated user is an admin in v1.
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()

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
