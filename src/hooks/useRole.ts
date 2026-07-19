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
      .single()
      .then(({ data }) => {
        setRole((data?.role as UserRole | null) ?? 'admin')
        setLoading(false)
      })
  }, [session, sessionLoading])

  return { role, loading: sessionLoading || loading }
}
