// Admin settings — live read/write of the site_settings key/value table
// (spec §7 Settings, §9). Keys: banner, features, business (§4 migration 009).
import { supabase } from './supabase'
import type { BannerSetting, FeaturesSetting, BusinessSetting } from '../types/catalog'

export interface SiteSettings {
  banner: BannerSetting
  features: FeaturesSetting
  business: BusinessSetting
}

const DEFAULTS: SiteSettings = {
  banner: { enabled: false, text: '', starts_at: null, ends_at: null },
  features: { corporate_section: true, wedding_section: true, reviews_section: true },
  business: { whatsapp_number: '', google_business_url: '' },
}

export async function fetchSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from('site_settings').select('key, value')
  if (error) throw new Error(error.message)

  const byKey = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]))
  return {
    banner: { ...DEFAULTS.banner, ...(byKey.banner as Partial<BannerSetting>) },
    features: { ...DEFAULTS.features, ...(byKey.features as Partial<FeaturesSetting>) },
    business: { ...DEFAULTS.business, ...(byKey.business as Partial<BusinessSetting>) },
  }
}

export async function updateSetting(
  key: keyof SiteSettings,
  value: SiteSettings[keyof SiteSettings],
): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert({ key, value })
  if (error) throw new Error(error.message)
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}
