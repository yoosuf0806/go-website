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
