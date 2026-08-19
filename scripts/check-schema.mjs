// check-schema.mjs
// ----------------------------------------------------------------------------
// Probes the Supabase REST API (PostgREST) — i.e. exactly what the storefront &
// admin apps see — to check the columns/functions the slab + voucher features
// need. Run it after applying migrations 034/035/036:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/check-schema.mjs
//
// It also auto-loads a local `.env` (VITE_SUPABASE_URL / SUPABASE_SERVICE_KEY /
// VITE_SUPABASE_ANON_KEY) so `node scripts/check-schema.mjs` usually just works.
//
// Read WITH scripts/verify_migrations.sql:
//   • SQL says PASS but this says MISSING  → the DB has it, PostgREST's cache is
//     stale. Fix: run `notify pgrst, 'reload schema';` in the SQL editor.
//   • Both say MISSING                     → the migration didn't apply to THIS
//     database (wrong project/branch?). Re-run it here.
// ----------------------------------------------------------------------------
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Minimal .env loader (no dependency): fill process.env from ../.env if present.
try {
  const envText = readFileSync(resolve(__dirname, '../.env'), 'utf8')
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {
  /* no .env — rely on real env vars */
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY
const usingAnon = !(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)

if (!url || !key) {
  console.error(
    'Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_KEY (preferred) or ' +
      'VITE_SUPABASE_ANON_KEY, or put them in .env.',
  )
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// A PostgREST "column/function not in schema cache" error (codes PGRST204 /
// PGRST202, or a message mentioning the schema cache) is the signal we care
// about — it's distinct from a row-level-security or empty-result outcome.
function isSchemaMiss(error) {
  if (!error) return false
  const msg = `${error.message ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return (
    error.code === 'PGRST204' ||
    error.code === 'PGRST202' ||
    error.code === '42703' || // undefined_column
    msg.includes('schema cache') ||
    msg.includes('could not find') ||
    msg.includes('does not exist')
  )
}

const results = []
function record(name, present, note = '') {
  results.push({ name, present, note })
}

async function probeColumn(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1)
  if (isSchemaMiss(error)) return record(`${table}.${column}`, false, error.message)
  // Any other error (e.g. RLS) still means the column resolved in PostgREST.
  record(`${table}.${column}`, true, error && usingAnon ? '(readable check blocked by RLS, column exists)' : '')
}

async function probeValidateVoucherShape() {
  const { data, error } = await supabase.rpc('validate_gift_voucher', { p_code: '__SCHEMA_PROBE__' })
  if (isSchemaMiss(error)) return record('validate_gift_voucher() has discount_type', false, error.message)
  const row = Array.isArray(data) ? data[0] : data
  const hasField = !!row && Object.prototype.hasOwnProperty.call(row, 'discount_type')
  record('validate_gift_voucher() returns discount_type', hasField, hasField ? '' : 'function exists but old signature — run 035')
}

const run = async () => {
  console.log(`\nProbing ${url}\nAuth: ${usingAnon ? 'anon key (RLS applies)' : 'service key'}\n`)

  await probeColumn('products', 'is_slab_product') // 034
  await probeColumn('products', 'flavors') // 034
  await probeColumn('gift_vouchers', 'discount_type') // 035
  await probeValidateVoucherShape() // 035

  let anyMissing = false
  for (const r of results) {
    const tag = r.present ? 'OK     ' : 'MISSING'
    console.log(`  [${tag}] ${r.name}${r.note ? `  — ${r.note}` : ''}`)
    if (!r.present) anyMissing = true
  }

  console.log('')
  if (!anyMissing) {
    console.log('All good — the API can see every column/function the app needs.\n')
    return
  }
  console.log(
    'Something is MISSING from the REST API.\n' +
      '  → If scripts/verify_migrations.sql shows these as PASS, the migration IS\n' +
      "    applied and PostgREST's cache is stale. In the SQL editor run:\n" +
      "        notify pgrst, 'reload schema';\n" +
      '    then re-run this probe.\n' +
      '  → If the SQL check also shows FAIL, the migration did not apply to THIS\n' +
      '    database — re-run 034/035/036 here.\n',
  )
  process.exitCode = 2
}

run().catch((e) => {
  console.error('Probe failed to run:', e)
  process.exit(1)
})
