import { z } from 'zod'
import { normalizePhone } from '../lib/format'
import { DELIVERY_SLOT_CODES } from '../lib/deliverySlots'

// Checkout "Details" step (spec §6.4): name, phone (validated Sri Lankan
// format, normalised to +94…), email (required), optional alternative contact
// number, address, delivery date + time slot, optional note.
//
// Two schemas are built from this one shape because the delivery slot is only
// mandatory on the storefront: a customer must pick a time, but an admin
// converting a corporate/wedding inquiry is scheduling off-menu and may have
// no retail slot that fits. See checkoutDetailsSchema / adminOrderDetailsSchema
// below.
const detailsBase = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine((v) => normalizePhone(v) !== null, {
      message: 'Enter a valid Sri Lankan phone number',
    }),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(200),
  // Optional second contact — only validated as a SL number when provided.
  altPhone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .refine((v) => !v || normalizePhone(v) !== null, {
      message: 'Enter a valid Sri Lankan phone number',
    }),
  address: z.string().trim().min(1, 'Delivery address is required').max(500),
  deliveryDate: z.string().trim().min(1, 'Delivery date is required'),
  // Delivery time slot (migration 038). Plain string rather than z.enum so the
  // form can start empty, matching deliveryDate above; the slot codes are
  // enforced per-schema below (and by a CHECK constraint in the database).
  deliverySlot: z.string().trim(),
  note: z.string().trim().max(300, 'Max 300 characters').optional(),
  isGift: z.boolean().default(false),
  recipientName: z.string().trim().max(100).optional(),
  recipientPhone: z.string().trim().max(20).optional(),
})

type DetailsShape = z.infer<typeof detailsBase>

// Gift branch: a gift order needs a valid recipient name + phone.
function refineGift(data: DetailsShape, ctx: z.RefinementCtx) {
    if (!data.isGift) return
    if (!data.recipientName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recipientName'], message: "Recipient's name is required" })
    }
    if (!data.recipientPhone?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recipientPhone'], message: "Recipient's phone is required" })
    } else if (!normalizePhone(data.recipientPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipientPhone'],
        message: 'Enter a valid Sri Lankan phone number',
      })
    }
}

/**
 * Storefront checkout. The customer must choose one of the published delivery
 * slots, so the kitchen always has a time to schedule against.
 */
export const checkoutDetailsSchema = detailsBase.superRefine((data, ctx) => {
  refineGift(data, ctx)
  if (!(DELIVERY_SLOT_CODES as readonly string[]).includes(data.deliverySlot)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deliverySlot'],
      message: 'Pick a delivery time',
    })
  }
})

/**
 * Admin-created orders (converting a corporate/wedding inquiry). Same rules,
 * except the delivery slot is optional — these are scheduled by agreement and
 * may not land in a retail slot. A slot that IS given must still be a real one.
 */
export const adminOrderDetailsSchema = detailsBase.superRefine((data, ctx) => {
  refineGift(data, ctx)
  if (data.deliverySlot && !(DELIVERY_SLOT_CODES as readonly string[]).includes(data.deliverySlot)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deliverySlot'],
      message: 'Pick a valid delivery time',
    })
  }
})

// Payment step (spec: separate step after Review). Only bank transfer is live;
// card is wired in a later PayHere PR. Bank transfer requires BOTH a reference
// number and an uploaded slip before the order can be placed — validated here
// so the CheckoutModal and any future caller share one rule.
export const PAYMENT_METHODS = ['bank_transfer', 'card'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const paymentSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS),
    // slipUrl is the object path returned by the storage upload; the file
    // itself is uploaded before this validates.
    paymentRef: z.string().trim().max(120).optional(),
    slipUrl: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method !== 'bank_transfer') return
    if (!data.paymentRef?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentRef'],
        message: 'Enter the transfer reference number',
      })
    }
    if (!data.slipUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slipUrl'],
        message: 'Upload your bank transfer slip',
      })
    }
  })

export type PaymentDetails = z.infer<typeof paymentSchema>

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>
