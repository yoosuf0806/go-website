import { useMutation } from '@tanstack/react-query'
import { createInquiry, createQuote, type CreatedInquiry } from '../lib/inquiries'
import type { InquiryForm, QuoteForm } from '../schemas/inquiry'

// The storefront's second (and last) runtime write — the corporate/wedding
// inquiry insert (spec §8). Everything else reads from catalog.json.
export function useCreateInquiry() {
  return useMutation<CreatedInquiry, Error, InquiryForm>({
    mutationFn: createInquiry,
  })
}

export function useCreateQuote() {
  return useMutation<CreatedInquiry, Error, QuoteForm>({
    mutationFn: createQuote,
  })
}
