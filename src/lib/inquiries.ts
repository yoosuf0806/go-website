// Inquiry insert (spec §6.6). The storefront's second runtime write (after the
// order). Anon-key INSERT only — RLS permits insert but NOT select, so we must
// not use .select()/RETURNING here (it would be blocked). The caller only needs
// the normalised phone for the WhatsApp deep link, not the new row's id.
import { supabase } from './supabase'
import type { InquiryForm, QuoteForm } from '../schemas/inquiry'
import { normalizePhone } from './format'

export interface CreatedInquiry {
  phone: string
}

export async function createInquiry(form: InquiryForm): Promise<CreatedInquiry> {
  const phone = normalizePhone(form.phone)
  if (!phone) throw new Error('Invalid phone number')

  const guestCount =
    typeof form.guestCount === 'number' && Number.isFinite(form.guestCount) ? form.guestCount : null

  const { error } = await supabase.from('inquiries').insert({
    category: form.category,
    name: form.name,
    phone,
    email: form.email || null,
    event_date: form.eventDate || null,
    guest_count: guestCount,
    message: form.message || null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return { phone }
}

export async function createQuote(form: QuoteForm): Promise<CreatedInquiry> {
  const phone = normalizePhone(form.phone)
  if (!phone) throw new Error('Invalid phone number')

  const { error } = await supabase.from('inquiries').insert({
    category: form.category,
    name: form.name,
    phone,
    email: form.email || null,
    event_date: form.deliveryDate,
    piece_count: form.pieceCount,
    // flavor_id is intentionally not written: it FKs to the legacy quote_flavors
    // table, but flavours are now products. We record the chosen flavour by name.
    flavor_name: form.flavorName || null,
    message: form.message || null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return { phone }
}
