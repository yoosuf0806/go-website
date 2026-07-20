import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from './useSession'

export type UserRole = 'admin' | 'kitchen'

// Reads the current user's role from the profiles table (migration 018).
// Falls back to 'admin' when no profile row exists so existing admin accounts
// keep working without needing a profiles row.
export function useRole(): { role: UserRole; loading: boolean } {
  const { session, loading: sessionLoading } = useSession()
  const [role, setRole] = useState<UserRole>('admin')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionLoading) return
    if (!session) {
      setRole('admin')
      setLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Surface RLS/config issues in the console instead of silently
          // treating every unreadable row as "admin" — that masked the
          // kitchen-redirect bug (missing self-read policy on profiles).
          console.error('[useRole] failed to read profile role:', error.message)
        }
        setRole((data?.role as UserRole | null) ?? 'admin')
        setLoading(false)
      })
  }, [session, sessionLoading])

  return { role, loading: sessionLoading || loading }
}
