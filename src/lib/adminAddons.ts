// Admin add-on pricing — live CRUD for the addons table (spec §7 Addon pricing,
// §4 migration 004). Price + enable toggle per addon, plus the config JSON
// surfaced as friendly fields (ribbon colours, topper char limits).
import { supabase } from './supabase'

export interface AdminAddon {
  id: string
  label: string
  price: number
  is_enabled: boolean
  config: Record<string, unknown>
}

export async function fetchAddons(): Promise<AdminAddon[]> {
  const { data, error } = await supabase.from('addons').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminAddon[]
}

export async function updateAddon(
  id: string,
  patch: Partial<Pick<AdminAddon, 'price' | 'is_enabled' | 'config'>>,
): Promise<void> {
  const { error } = await supabase.from('addons').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}
