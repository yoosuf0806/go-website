// Inquiry insert (spec §6.6). The storefront's second runtime write (after the
// order insert). Anon-key INSERT only — RLS permits insert but not select.
import { supabase } from './supabase'
import type { InquiryForm } from '../schemas/inquiry'
import { normalizePhone } from './format'

export interface CreatedInquiry {
  id: string
  phone: string
}

export async function createInquiry(form: InquiryForm): Promise<CreatedInquiry> {
  const phone = normalizePhone(form.phone)
  if (!phone) throw new Error('Invalid phone number')

  const guestCount =
    typeof form.guestCount === 'number' && Number.isFinite(form.guestCount) ? form.guestCount : null

  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      category: form.category,
      name: form.name,
      phone,
      email: form.email || null,
      event_date: form.eventDate || null,
      guest_count: guestCount,
      message: form.message || null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to submit inquiry')
  }

  return { id: data.id, phone }
}
