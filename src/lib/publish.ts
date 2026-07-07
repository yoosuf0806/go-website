// Client side of the Publish flow (spec §8). Calls the /api/publish serverless
// function with the admin's access token; that function holds the deploy hook
// secret and triggers the storefront rebuild.
import { supabase } from './supabase'

export async function triggerPublish(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')

  const res = await fetch('/api/publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Publish failed')
  }
}
