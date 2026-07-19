import { z } from 'zod'
import { normalizePhone } from '../lib/format'

// Corporate/wedding inquiry form (spec §6.6). Zod is the single source of
// truth for the fields and limits, shared by the modal and the insert.
export const inquiryCategorySchema = z.enum(['corporate', 'wedding'])

export const inquiryFormSchema = z.object({
  category: inquiryCategorySchema,
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine((v) => normalizePhone(v) !== null, {
      message: 'Enter a valid Sri Lankan phone number',
    }),
  email: z
    .union([z.string().trim().email('Enter a valid email'), z.literal('')])
    .optional(),
  eventDate: z.string().trim().optional(),
  guestCount: z
    .union([z.coerce.number().int().positive('Enter a valid guest count'), z.nan()])
    .optional(),
  message: z.string().trim().max(500, 'Max 500 characters').optional(),
})

export type InquiryForm = z.infer<typeof inquiryFormSchema>
export type InquiryCategory = z.infer<typeof inquiryCategorySchema>

// Corporate quote request (spec §6.6 extension). Submitted by the quote form on
// the Corporate page and inserted into the inquiries table with the new fields
// added by migration 017.
// QuoteForm: shape used for the DB insert (category required, pieceCount is number).
export interface QuoteForm {
  category: 'corporate'
  name: string
  phone: string
  email?: string
  pieceCount: number
  deliveryDate: string
  flavorId?: string
  flavorName?: string
  message?: string
}

// Raw form values collected by react-hook-form (pieceCount is a string from <input type="number">).
export const quoteFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine((v) => normalizePhone(v) !== null, {
      message: 'Enter a valid Sri Lankan phone number',
    }),
  email: z
    .union([z.string().trim().email('Enter a valid email'), z.literal('')])
    .optional(),
  pieceCount: z
    .string()
    .trim()
    .min(1, 'Piece count is required')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, {
      message: 'Enter a valid piece count',
    }),
  deliveryDate: z.string().trim().min(1, 'Delivery date is required'),
  flavorId: z.string().uuid().optional(),
  flavorName: z.string().trim().optional(),
  message: z.string().trim().max(500, 'Max 500 characters').optional(),
})

export type QuoteFormRaw = z.infer<typeof quoteFormSchema>
