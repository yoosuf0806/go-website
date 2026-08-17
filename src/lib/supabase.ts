import { createClient } from '@supabase/supabase-js'

// Single Supabase client instance for the storefront. Uses the anon key only;
// RLS restricts anon to public reads (via snapshot at build time) and INSERT-only
// writes at checkout / inquiry submit. Never ship the service_role key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Foundation phase: env may not be wired yet. Warn rather than crash so the
  // app still boots for local UI work.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill them in.',
  )
}

// createClient throws on an empty URL; fall back to a harmless placeholder so the
// app still boots before env is configured. Real calls will fail loudly, which is
// the intended signal that env needs wiring.
//
// `storageKey` is set EXPLICITLY (and identically to the ops dashboard's client)
// so the two apps share one auth session when served from the same origin: sign
// in on the admin UI and the ops dashboard is already authenticated — no second
// login. Relying on Supabase's default per-project key would also match today,
// but pinning it here keeps admin ↔ ops SSO from silently breaking on a future
// supabase-js bump that changes the default key format.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storageKey: 'golden-oven-auth',
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
