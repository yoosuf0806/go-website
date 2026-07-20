/**
 * One-off: create a kitchen portal auth user and give it the 'kitchen' role.
 *
 * The kitchen portal (/kitchen) is gated by ProtectedRoute requireRole="kitchen",
 * which reads profiles.role for the signed-in user (migration 018). This script
 * creates the Supabase Auth user AND inserts/updates the matching profiles row so
 * that account — and only that account — lands on the kitchen board.
 *
 * Requires the SERVICE ROLE key (admin API), never the anon key. Run:
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=<service-role-key> \
 *   KITCHEN_EMAIL=kitchen@goldenoven.lk \
 *   KITCHEN_PASSWORD='a-strong-password' \
 *   npm run create-kitchen-user
 */
import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const email = process.env.KITCHEN_EMAIL
  const password = process.env.KITCHEN_PASSWORD

  const missing = [
    !url && 'SUPABASE_URL',
    !serviceKey && 'SUPABASE_SERVICE_KEY',
    !email && 'KITCHEN_EMAIL',
    !password && 'KITCHEN_PASSWORD',
  ].filter(Boolean)
  if (missing.length) {
    console.error(`[create-kitchen-user] Missing env: ${missing.join(', ')}`)
    process.exit(1)
  }

  const supabase = createClient(url!, serviceKey!, { auth: { persistSession: false } })

  console.log(`[create-kitchen-user] Creating auth user ${email}…`)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no confirmation email — usable immediately
  })
  if (error || !data.user) {
    console.error('[create-kitchen-user] Failed to create user:', error?.message)
    process.exit(1)
  }

  const userId = data.user.id
  console.log(`[create-kitchen-user] Auth user created: ${userId}`)

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, role: 'kitchen' }, { onConflict: 'id' })
  if (profileError) {
    console.error('[create-kitchen-user] Failed to set profile role:', profileError.message)
    process.exit(1)
  }

  console.log(`[create-kitchen-user] Done — ${email} is now a kitchen user. Sign in at /kitchen/login.`)
}

main()
