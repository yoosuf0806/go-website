import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'
import { useRole } from '../../hooks/useRole'

export default function KitchenLogin() {
  const { session, loading: sessionLoading } = useSession()
  // A session alone isn't enough to skip the form — someone testing the
  // admin panel in the same browser would otherwise get silently bounced
  // straight back out to /admin without ever seeing the kitchen login form.
  // Only auto-redirect once we know the *active* session is a kitchen account.
  const { role, loading: roleLoading } = useRole()
  const loading = sessionLoading || (!!session && roleLoading)
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session && role === 'kitchen') {
    return <Navigate to="/kitchen" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    navigate('/kitchen', { replace: true })
  }

  return (
    <div className="grid min-h-screen place-items-center bg-navy px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
      >
        <p className="text-2xl">🍫</p>
        <h1 className="mt-2 text-xl font-semibold text-white">Kitchen Portal</h1>
        <p className="mt-1 text-sm text-white/50">Sign in with your kitchen account.</p>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-white/80">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink/60"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-sm font-medium text-white/80">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink/60"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 min-h-[44px] w-full rounded-full bg-pink py-2.5 text-sm font-bold text-white hover:bg-pink-dark disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
