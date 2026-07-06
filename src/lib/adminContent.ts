// Admin content editing — reads/writes the `content` key in site_settings
// (JSONB). The storefront bakes this into the snapshot at build (Publish).
import { supabase } from './supabase'
import { mergeContent, type SiteContent } from '../types/content'

export async function fetchContent(): Promise<SiteContent> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'content')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return mergeContent((data?.value as Partial<SiteContent> | undefined) ?? null)
}

export async function updateContent(content: SiteContent): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert({ key: 'content', value: content })
  if (error) throw new Error(error.message)
}
