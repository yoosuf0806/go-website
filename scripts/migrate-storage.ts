/// <reference types="node" />
// One-off utility: copy every object in the public `product-images` Storage
// bucket from an OLD Supabase project to a NEW one, preserving paths. Used when
// the database rows (image URLs) were migrated to a new project but the actual
// image FILES were not — so the repointed URLs 404 until the files exist.
//
// Requires BOTH projects' SERVICE ROLE keys (full access) — pass them as env
// vars, never commit them. The OLD project must be reachable (resume it if it's
// paused). Idempotent: re-running overwrites (upsert), so it's safe to re-run.
//
//   OLD_SUPABASE_URL=https://<old-ref>.supabase.co \
//   OLD_SERVICE_KEY=<old service_role key> \
//   NEW_SUPABASE_URL=https://<new-ref>.supabase.co \
//   NEW_SERVICE_KEY=<new service_role key> \
//   npx tsx scripts/migrate-storage.ts
//
// Optional: BUCKET=product-images (the default; the only public image bucket).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const BUCKET = process.env.BUCKET ?? 'product-images'

function need(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

const oldDb = createClient(need('OLD_SUPABASE_URL'), need('OLD_SERVICE_KEY'))
const newDb = createClient(need('NEW_SUPABASE_URL'), need('NEW_SERVICE_KEY'))

const PAGE = 100

// Recursively list every file path under `prefix` in the bucket. Supabase marks
// "folders" with a null id (no file metadata), so we recurse into those.
async function listAll(client: SupabaseClient, prefix = ''): Promise<string[]> {
  const out: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`list "${prefix}": ${error.message}`)
    if (!data || data.length === 0) break
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) out.push(...(await listAll(client, path)))
      else out.push(path)
    }
    if (data.length < PAGE) break
  }
  return out
}

async function main() {
  console.log(`Listing objects in "${BUCKET}" on the old project…`)
  const paths = await listAll(oldDb)
  console.log(`Found ${paths.length} file(s). Copying to the new project…`)

  let ok = 0
  let fail = 0
  for (const path of paths) {
    const { data: blob, error: dlErr } = await oldDb.storage.from(BUCKET).download(path)
    if (dlErr || !blob) {
      console.error(`✗ download ${path}: ${dlErr?.message ?? 'no data'}`)
      fail++
      continue
    }
    const { error: upErr } = await newDb.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || 'application/octet-stream',
      upsert: true,
      cacheControl: '31536000',
    })
    if (upErr) {
      console.error(`✗ upload ${path}: ${upErr.message}`)
      fail++
      continue
    }
    ok++
    if (ok % 10 === 0) console.log(`  …${ok}/${paths.length}`)
  }

  console.log(`Done. Copied ${ok}, failed ${fail}.`)
  if (fail) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
