import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button, Field, Input } from '../components/ui'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await signIn(email, password)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cocoa-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-cocoa-800">Golden Oven</div>
          <div className="text-sm text-cocoa-400">Ops &amp; Finance</div>
        </div>
        <div className="space-y-3">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {err && <div className="text-sm text-rose-600">{err}</div>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-cocoa-400">
          Use your storefront admin login. Access is restricted to admins.
        </p>
      </form>
    </div>
  )
}
