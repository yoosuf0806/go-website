// Admin CRUD for quote_flavors — the selectable flavour options shown on the
// corporate quote page. Requires an authenticated session (service or admin key).
import { supabase } from './supabase'

export interface QuoteFlavor {
  id: string
  name: string
  image_url: string | null
  description: string | null
  is_active: boolean
  sort_order: number
}

export type QuoteFlavorInput = Omit<QuoteFlavor, 'id'>

export async function fetchQuoteFlavors(): Promise<QuoteFlavor[]> {
  const { data, error } = await supabase
    .from('quote_flavors')
    .select('*')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []) as QuoteFlavor[]
}

export async function createQuoteFlavor(input: QuoteFlavorInput): Promise<QuoteFlavor> {
  const { data, error } = await supabase
    .from('quote_flavors')
    .insert(input)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as QuoteFlavor
}

export async function updateQuoteFlavor(id: string, input: Partial<QuoteFlavorInput>): Promise<QuoteFlavor> {
  const { data, error } = await supabase
    .from('quote_flavors')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as QuoteFlavor
}

export async function deleteQuoteFlavor(id: string): Promise<void> {
  const { error } = await supabase.from('quote_flavors').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
