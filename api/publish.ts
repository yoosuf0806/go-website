// Vercel serverless function (spec §8 Publish flow / §9). The admin "Publish
// changes" button POSTs here; the function verifies the caller's Supabase Auth
// token, then triggers the Vercel Deploy Hook that rebuilds the storefront with
// a fresh catalogue snapshot.
//
// The deploy hook URL lives in ADMIN_DEPLOY_HOOK_URL — a server-only env var
// that is NEVER bundled into the browser (that is the whole reason this runs
// server-side rather than calling the hook from the admin SPA directly).
export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const deployHook = process.env.ADMIN_DEPLOY_HOOK_URL

  if (!supabaseUrl || !anonKey || !deployHook) {
    return json({ error: 'Publish is not configured on the server.' }, 500)
  }

  // Verify the caller is a signed-in admin by validating their access token.
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return json({ error: 'Not authenticated' }, 401)
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!userRes.ok) {
    return json({ error: 'Not authorised' }, 401)
  }

  // Authentication is not enough — kitchen accounts are signed-in users too, and
  // must not be able to trigger production rebuilds. Check the caller's role in
  // profiles (readable via their own token thanks to profiles_select_own). No
  // row == a legacy admin account (mirrors is_admin() in migration 027).
  const user = (await userRes.json()) as { id?: string } | null
  if (!user?.id) {
    return json({ error: 'Not authorised' }, 401)
  }
  const profRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } },
  )
  const rows = profRes.ok ? ((await profRes.json()) as Array<{ role?: string }>) : []
  const role = rows[0]?.role
  if (role && role !== 'admin') {
    return json({ error: 'Admin only' }, 403)
  }

  // Trigger the rebuild.
  const hookRes = await fetch(deployHook, { method: 'POST' })
  if (!hookRes.ok) {
    return json({ error: 'Deploy hook failed' }, 502)
  }

  return json({ ok: true }, 200)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
