import { createClient } from '@supabase/supabase-js'

// Shared Supabase client for the ops dashboard. Uses the anon key + an
// authenticated admin session; every ops_* table is admin-only via RLS
// (is_admin(), migration 027), so an unauthenticated visitor sees nothing.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  console.warn(
    '[ops] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and point them at the storefront Supabase project.',
  )
}

// `storageKey` matches the storefront/admin client (src/lib/supabase.ts) so the
// two apps share one auth session when served from the same origin: if the admin
// UI is already signed in, this dashboard picks up that session and never shows
// its own login screen (single sign-on). Keep this key in sync with the admin.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anon || 'placeholder-anon-key',
  {
    auth: {
      storageKey: 'golden-oven-auth',
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
