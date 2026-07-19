import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useRole, type UserRole } from '../hooks/useRole'

interface Props {
  children: ReactNode
  requireRole?: UserRole
}

// Gates routes behind a Supabase Auth session (spec §7). When requireRole is
// set, also checks the profiles.role column; a mismatch redirects to the
// appropriate login page. Any authenticated user with no profile row is
// treated as admin (useRole fallback).
export default function ProtectedRoute({ children, requireRole }: Props) {
  const { session, loading: sessionLoading } = useSession()
  const { role, loading: roleLoading } = useRole()

  const loading = sessionLoading || (!!session && requireRole !== undefined && roleLoading)

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  if (!session) {
    const loginPath = requireRole === 'kitchen' ? '/kitchen/login' : '/admin/login'
    return <Navigate to={loginPath} replace />
  }

  if (requireRole && role !== requireRole) {
    const redirectPath = role === 'kitchen' ? '/kitchen' : '/admin'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}
