import { z } from 'zod'
import { normalizePhone } from '../lib/format'

// Checkout "Details" step (spec §6.4): name, phone (validated Sri Lankan
// format, normalised to +94…), address, delivery date, optional note.
export const checkoutDetailsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine((v) => normalizePhone(v) !== null, {
      message: 'Enter a valid Sri Lankan phone number',
    }),
  address: z.string().trim().min(1, 'Delivery address is required').max(500),
  deliveryDate: z.string().trim().min(1, 'Delivery date is required'),
  note: z.string().trim().max(300, 'Max 300 characters').optional(),
})

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>
