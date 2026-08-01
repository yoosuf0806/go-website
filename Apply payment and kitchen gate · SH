#!/usr/bin/env bash
# apply_payment_and_kitchen_gate.sh
# Run from the repo root in your Codespace, on a fresh branch off main:
#
#   git checkout main && git pull
#   git checkout -b claude/payment-and-kitchen-gate
#   bash apply_payment_and_kitchen_gate.sh
#   git add -A && git commit -m "feat(checkout+kitchen): bank transfer payment step + slip upload; payment/processing gate releases orders to kitchen"
#   git push -u origin claude/payment-and-kitchen-gate
#
# Open the PR:
#   https://github.com/yoosuf0806/go-website/compare/main...claude/payment-and-kitchen-gate
#
# *** NOTE: an earlier PR committed the apply-SCRIPT files but never ran them,
# *** so the payment feature is NOT actually in main. This script contains the
# *** real code. IMPORTANT: it must be RUN (bash apply_...sh) so it applies the
# *** patch, and you must `git add -A` AFTER running it, before committing.
#
# *** AFTER MERGING, run supabase/migrations/026_payment_method.sql in the
# *** Supabase SQL editor. Verify:
#     select column_name from information_schema.columns
#     where table_name='orders'
#       and column_name in ('payment_method','payment_status','payment_ref','slip_url');
#     select id, public from storage.buckets where id='bank-slips';   -- public=false
#
# WHAT THIS DOES:
#  1. Checkout gains a Payment step. Bank transfer shows your Nations Trust
#     details, a reference field, and slip upload (both required); the order
#     lands as payment_status='awaiting_verification' and SKIPS WhatsApp. Card
#     (PayHere) is shown but disabled until a later PR. Cart "Place order" now
#     has a confirm / keep-shopping step.
#  2. Kitchen gate — the kitchen board only shows an order when:
#       - payment is confirmed (card auto-paid, or bank transfer that admin
#         verified via the new "Confirm payment received" button), OR
#       - it's a corporate/wedding conversion admin has advanced past 'pending', OR
#       - it's a legacy WhatsApp order (no payment method) — unchanged.
#     No new migration for the gate — it reuses the 026 payment columns.
#  setup.sql is updated for fresh one-shot installs; no action for your live DB.

set -euo pipefail
PATCH_FILE="$(mktemp)"
cat > "$PATCH_FILE" << 'PATCH_EOF'
diff --git a/scripts/seed-data.ts b/scripts/seed-data.ts
index 206b139..8bbb58c 100644
--- a/scripts/seed-data.ts
+++ b/scripts/seed-data.ts
@@ -89,6 +89,7 @@ export interface RawSettings {
   banner: Record<string, unknown>
   features: Record<string, unknown>
   business: Record<string, unknown>
+  bankTransfer: Record<string, unknown>
   /** Editable storefront content blob; undefined → DEFAULT_CONTENT at build. */
   content?: Record<string, unknown>
 }
@@ -285,6 +286,13 @@ export const seedData: SeedData = {
     banner: { enabled: false, text: '', starts_at: null, ends_at: null },
     features: { corporate_section: true, wedding_section: true, reviews_section: true },
     business: { whatsapp_number: '94771234567', google_business_url: 'https://g.page/golden-oven' },
+    bankTransfer: {
+      bank_name: 'Nations Trust Bank',
+      account_name: 'M N AHAMED',
+      account_no: '200520120714',
+      branch: 'Mt Lavinia',
+      enabled: true,
+    },
   },
 
   // No row = in stock. Cashew Brownie (a3333333…) is in stock as 9pc but
diff --git a/scripts/snapshot.ts b/scripts/snapshot.ts
index f7160ef..c69adb9 100644
--- a/scripts/snapshot.ts
+++ b/scripts/snapshot.ts
@@ -37,6 +37,7 @@ import type {
   BannerSetting,
   FeaturesSetting,
   BusinessSetting,
+  BankTransferSetting,
   ProductPackageStockMap,
 } from '../src/types/catalog.ts'
 import { stockKey } from '../src/types/catalog.ts'
@@ -145,6 +146,7 @@ function mapSettings(raw: SeedData['settings']): CatalogSettings {
     banner: raw.banner as unknown as BannerSetting,
     features: raw.features as unknown as FeaturesSetting,
     business: raw.business as unknown as BusinessSetting,
+    bankTransfer: raw.bankTransfer as unknown as BankTransferSetting,
   }
 }
 
@@ -212,6 +214,7 @@ async function fetchFromSupabase(url: string, serviceKey: string): Promise<SeedD
       banner: (settingsByKey.banner ?? {}) as Record<string, unknown>,
       features: (settingsByKey.features ?? {}) as Record<string, unknown>,
       business: (settingsByKey.business ?? {}) as Record<string, unknown>,
+      bankTransfer: (settingsByKey.bank_transfer ?? {}) as Record<string, unknown>,
       content: (settingsByKey.content ?? undefined) as Record<string, unknown> | undefined,
     },
     productPackageStock: (productPackageStock.data ?? []) as RawProductPackageStock[],
diff --git a/src/components/storefront/CartDrawer.tsx b/src/components/storefront/CartDrawer.tsx
index 3ee1b3c..7908c3c 100644
--- a/src/components/storefront/CartDrawer.tsx
+++ b/src/components/storefront/CartDrawer.tsx
@@ -1,3 +1,4 @@
+import { useState } from 'react'
 import { useCartStore } from '../../stores/cart'
 import { useVoucherStore } from '../../stores/voucher'
 import { cartTotals, lineTotal, totalAfterVoucher, findTier } from '../../lib/pricing'
@@ -17,6 +18,7 @@ interface CartDrawerProps {
 // and the WhatsApp message use, so nothing can drift (spec §11).
 export default function CartDrawer({ onClose, onCheckout }: CartDrawerProps) {
   const { catalog } = useCatalog()
+  const [confirming, setConfirming] = useState(false)
   const items = useCartStore((s) => s.items)
   const incrementBoxQty = useCartStore((s) => s.incrementBoxQty)
   const removeItem = useCartStore((s) => s.removeItem)
@@ -198,20 +200,44 @@ export default function CartDrawer({ onClose, onCheckout }: CartDrawerProps) {
                 <span className="text-[22px] font-bold text-navy">{formatLKR(finalTotal)}</span>
               </div>
 
-              <button
-                type="button"
-                onClick={onCheckout}
-                className="mt-3.5 w-full rounded-2xl bg-pink py-4 text-base font-bold text-white hover:bg-pink-dark"
-              >
-                Checkout
-              </button>
-              <button
-                type="button"
-                onClick={onClose}
-                className="mt-2 w-full py-2 text-[15px] font-medium text-neutral-500 hover:text-navy"
-              >
-                Continue shopping
-              </button>
+              {confirming ? (
+                <div className="mt-3.5 animate-tin">
+                  <p className="pb-2.5 text-center text-[14px] text-neutral-600">
+                    Ready to place your order for <span className="font-bold text-navy">{formatLKR(finalTotal)}</span>?
+                  </p>
+                  <button
+                    type="button"
+                    onClick={onCheckout}
+                    className="w-full rounded-2xl bg-pink py-4 text-base font-bold text-white hover:bg-pink-dark"
+                  >
+                    Place order
+                  </button>
+                  <button
+                    type="button"
+                    onClick={() => setConfirming(false)}
+                    className="mt-2 w-full py-2 text-[15px] font-medium text-neutral-500 hover:text-navy"
+                  >
+                    ← Keep shopping
+                  </button>
+                </div>
+              ) : (
+                <>
+                  <button
+                    type="button"
+                    onClick={() => setConfirming(true)}
+                    className="mt-3.5 w-full rounded-2xl bg-pink py-4 text-base font-bold text-white hover:bg-pink-dark"
+                  >
+                    Place order
+                  </button>
+                  <button
+                    type="button"
+                    onClick={onClose}
+                    className="mt-2 w-full py-2 text-[15px] font-medium text-neutral-500 hover:text-navy"
+                  >
+                    Continue shopping
+                  </button>
+                </>
+              )}
             </div>
           </>
         )}
diff --git a/src/components/storefront/CheckoutModal.tsx b/src/components/storefront/CheckoutModal.tsx
index 65c8d4f..a4a0d89 100644
--- a/src/components/storefront/CheckoutModal.tsx
+++ b/src/components/storefront/CheckoutModal.tsx
@@ -4,11 +4,12 @@ import { useVoucherStore } from '../../stores/voucher'
 import { cartTotals, lineTotal, totalAfterVoucher } from '../../lib/pricing'
 import { formatLKR, normalizePhone, toWhatsAppNumber } from '../../lib/format'
 import { addonSummary, buildOrderMessage, orderWhatsAppLink } from '../../lib/whatsapp'
-import { checkoutDetailsSchema, type CheckoutDetails } from '../../schemas/checkout'
+import { checkoutDetailsSchema, paymentSchema, type CheckoutDetails, type PaymentMethod } from '../../schemas/checkout'
 import { useCreateOrder } from '../../hooks/useCreateOrder'
 import { useCatalog } from '../../contexts/CatalogContext'
+import { uploadBankSlip, validateSlipFile } from '../../lib/bankSlips'
 
-type Step = 'details' | 'review'
+type Step = 'details' | 'review' | 'payment'
 
 const emptyForm: CheckoutDetails = {
   name: '',
@@ -58,8 +59,19 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
     isGift: boolean
     recipientName: string
     recipientPhone: string | null
+    paymentMethod: PaymentMethod | null
   } | null>(null)
 
+  // Payment step state (bank transfer is the only live method; card is
+  // disabled until the PayHere PR). Slip is uploaded to a private bucket the
+  // moment it's picked, so by "Place order" time we already hold its path.
+  const [payMethod, setPayMethod] = useState<PaymentMethod>('bank_transfer')
+  const [payRef, setPayRef] = useState('')
+  const [slipPath, setSlipPath] = useState<string | null>(null)
+  const [slipName, setSlipName] = useState<string | null>(null)
+  const [slipUploading, setSlipUploading] = useState(false)
+  const [payErrors, setPayErrors] = useState<{ paymentRef?: string; slipUrl?: string }>({})
+
   // The voucher code is entered in the Cart Drawer (shared store) — this step
   // only reflects the already-applied discount in the totals.
   const voucher = useVoucherStore()
@@ -67,6 +79,7 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
   const finalTotal = totalAfterVoucher(totals.total, appliedDiscount)
   const itemCount = items.reduce((n, i) => n + i.boxQty, 0)
   const waFallback = toWhatsAppNumber(settings.business.whatsapp_number)
+  const bank = settings.bankTransfer
 
   const today = new Date().toISOString().slice(0, 10)
   const set = (patch: Partial<CheckoutDetails>) => setForm((f) => ({ ...f, ...patch }))
@@ -87,12 +100,75 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
     setStep('review')
   }
 
+  // Review → Payment. Details are already validated at this point.
+  function handleToPayment() {
+    setStep('payment')
+  }
+
+  // Upload the slip the instant it's chosen, so "Place order" is a single tap
+  // that never waits on a network upload. Store only the object path.
+  async function handleSlipFile(file: File | null) {
+    if (!file) return
+    const guard = validateSlipFile(file)
+    if (guard) {
+      setPayErrors((e) => ({ ...e, slipUrl: guard }))
+      return
+    }
+    setPayErrors((e) => ({ ...e, slipUrl: undefined }))
+    setSlipUploading(true)
+    try {
+      const { path } = await uploadBankSlip(file)
+      setSlipPath(path)
+      setSlipName(file.name)
+    } catch (err) {
+      setPayErrors((e) => ({
+        ...e,
+        slipUrl: err instanceof Error ? err.message : 'Upload failed — try again.',
+      }))
+    } finally {
+      setSlipUploading(false)
+    }
+  }
+
   async function handleConfirm() {
     if (!details) return
+
+    // Validate the payment step (bank transfer needs ref + slip).
+    const payResult = paymentSchema.safeParse({
+      method: payMethod,
+      paymentRef: payRef,
+      slipUrl: slipPath ?? '',
+    })
+    if (!payResult.success) {
+      const pe: { paymentRef?: string; slipUrl?: string } = {}
+      for (const issue of payResult.error.issues) {
+        const key = issue.path[0] as 'paymentRef' | 'slipUrl'
+        if (!pe[key]) pe[key] = issue.message
+      }
+      setPayErrors(pe)
+      return
+    }
+    setPayErrors({})
+
+    const isBank = payMethod === 'bank_transfer'
     const appliedVoucher =
       voucher.status === 'ok' ? { code: voucher.code.trim(), discount: voucher.discount } : null
     try {
-      const { orderNo, phone } = await mutation.mutateAsync({ items, totals, details, voucher: appliedVoucher })
+      const { orderNo, phone } = await mutation.mutateAsync({
+        items,
+        totals,
+        details,
+        voucher: appliedVoucher,
+        payment: {
+          method: payMethod,
+          paymentRef: isBank ? payRef.trim() : null,
+          slipUrl: isBank ? slipPath : null,
+        },
+      })
+
+      // Bank transfer skips the WhatsApp handoff — the order lands as
+      // "awaiting verification" and admin checks the slip. Only card/legacy
+      // flows build a WhatsApp message.
       const messageInput = {
         orderNo,
         items,
@@ -111,13 +187,13 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
         },
         voucher: appliedVoucher,
       }
-      const link = orderWhatsAppLink(settings.business.whatsapp_number, messageInput)
+      const link = isBank ? '' : orderWhatsAppLink(settings.business.whatsapp_number, messageInput)
       // Snapshot everything the confirmation screen needs BEFORE clearing the
       // cart — items/totals are about to become empty.
       setSuccess({
         orderNo,
         waLink: link,
-        message: buildOrderMessage(messageInput),
+        message: isBank ? '' : buildOrderMessage(messageInput),
         lines: items.map((i) => ({
           name: i.productName,
           qty: i.boxQty,
@@ -128,8 +204,9 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
         isGift: details.isGift,
         recipientName: details.recipientName ?? '',
         recipientPhone: details.recipientPhone ? normalizePhone(details.recipientPhone) : null,
+        paymentMethod: payMethod,
       })
-      window.open(link, '_blank', 'noopener,noreferrer')
+      if (!isBank && link) window.open(link, '_blank', 'noopener,noreferrer')
       clearCart()
       voucher.remove()
     } catch (err) {
@@ -138,12 +215,12 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
       if (appliedVoucher && err instanceof Error && /voucher/i.test(err.message)) {
         voucher.remove()
       }
-      // mutation.error already holds the message; stay on review so the
-      // customer can retry without losing their details or cart.
+      // mutation.error already holds the message; stay on payment so the
+      // customer can retry without losing their details, cart, or slip.
     }
   }
 
-  const stepNo = step === 'details' ? 1 : 2
+  const stepNo = step === 'details' ? 1 : step === 'review' ? 2 : 3
 
   return (
     <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
@@ -156,10 +233,14 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
             <button type="button" onClick={onClose} className="text-sm font-medium text-neutral-500 hover:text-navy">
               ← Cart
             </button>
-          ) : success == null ? (
+          ) : success == null && step === 'review' ? (
             <button type="button" onClick={() => setStep('details')} className="text-sm font-medium text-neutral-500 hover:text-navy">
               ← Details
             </button>
+          ) : success == null ? (
+            <button type="button" onClick={() => setStep('review')} className="text-sm font-medium text-neutral-500 hover:text-navy">
+              ← Review
+            </button>
           ) : (
             <button
               type="button"
@@ -177,9 +258,9 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
           <div className="flex items-center gap-1.5 border-b border-blush-200 bg-white px-5 py-4">
             <TrackStep n={1} label="Details" state={stepNo > 1 ? 'done' : 'active'} />
             <TrackLine active={stepNo > 1} />
-            <TrackStep n={2} label="Review" state={stepNo === 2 ? 'active' : 'upcoming'} />
-            <TrackLine active={false} />
-            <TrackStep n={3} label="Confirm" state="upcoming" />
+            <TrackStep n={2} label="Review" state={stepNo > 2 ? 'done' : stepNo === 2 ? 'active' : 'upcoming'} />
+            <TrackLine active={stepNo > 2} />
+            <TrackStep n={3} label="Payment" state={stepNo === 3 ? 'active' : 'upcoming'} />
           </div>
         )}
 
@@ -297,13 +378,13 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
               </div>
             </div>
           </>
-        ) : (
+        ) : step === 'review' ? (
           /* ── REVIEW ────────────────────────────────────────── */
           <>
             <div className="flex-1 overflow-y-auto px-5 py-5">
               <h2 className="font-display text-[26px] text-navy">Look right?</h2>
               <p className="mt-1 text-sm leading-relaxed text-neutral-500">
-                Nothing is charged here. We'll confirm everything on WhatsApp.
+                Check your details, then choose how you'd like to pay on the next step.
               </p>
 
               {details && (
@@ -384,53 +465,211 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
                       </div>
                     </div>
                   </div>
+                </div>
+              )}
+            </div>
 
-                  {/* Failure retry state */}
-                  {mutation.isError && (
-                    <div className="rounded-2xl border border-pink bg-white p-4 animate-tin">
-                      <div className="pb-1.5 font-bold text-pink">We couldn't save that order</div>
-                      <p className="pb-3 text-sm leading-relaxed text-neutral-600">
-                        Nothing was lost and nothing was charged — your details are still here. Try again, or message us
-                        and we'll take it from there.
-                      </p>
-                      <div className="flex gap-2.5">
-                        <button
-                          type="button"
-                          onClick={handleConfirm}
-                          disabled={mutation.isPending}
-                          className="flex-1 rounded-xl bg-pink py-3.5 text-sm font-bold text-white hover:bg-pink-dark disabled:opacity-50"
-                        >
-                          Try again
-                        </button>
-                        {waFallback && (
-                          <a
-                            href={`https://wa.me/${waFallback}`}
-                            target="_blank"
-                            rel="noopener noreferrer"
-                            className="flex-1 rounded-xl bg-[#25d366] py-3.5 text-center text-sm font-bold text-white"
-                          >
-                            WhatsApp us
-                          </a>
-                        )}
-                      </div>
+            {/* Sticky footer: continue to payment */}
+            <div className="border-t border-blush-200 bg-white px-4 pb-[max(1.125rem,env(safe-area-inset-bottom))] pt-3.5">
+              <button
+                type="button"
+                onClick={handleToPayment}
+                className="w-full rounded-2xl bg-pink py-4 text-base font-bold text-white transition-colors hover:bg-pink-dark"
+              >
+                Continue to payment
+              </button>
+              <p className="pt-2.5 text-center text-[13px] text-neutral-500">
+                Next: choose how you'd like to pay.
+              </p>
+            </div>
+          </>
+        ) : (
+          /* ── PAYMENT ───────────────────────────────────────── */
+          <>
+            <div className="flex-1 overflow-y-auto px-5 py-5">
+              <h2 className="font-display text-[26px] text-navy">How would you like to pay?</h2>
+              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
+                Pay by bank transfer and upload your slip — we'll verify it and confirm your order.
+              </p>
+
+              <div className="mt-4 flex flex-col gap-3">
+                {/* Card — coming soon (PayHere), shown but disabled */}
+                <div className="flex items-center justify-between rounded-2xl border border-blush-200 bg-white/60 p-4 opacity-70">
+                  <div className="flex items-center gap-3">
+                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 border-blush-200" />
+                    <div>
+                      <div className="font-bold text-navy">Pay by card</div>
+                      <div className="text-[13px] text-neutral-500">Visa · Mastercard · Genie</div>
                     </div>
-                  )}
+                  </div>
+                  <span className="rounded-full bg-blush-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
+                    Soon
+                  </span>
                 </div>
-              )}
+
+                {/* Bank transfer — the live method */}
+                <button
+                  type="button"
+                  onClick={() => setPayMethod('bank_transfer')}
+                  className={`rounded-2xl border p-4 text-left transition-colors ${
+                    payMethod === 'bank_transfer'
+                      ? 'border-pink bg-white ring-1 ring-pink'
+                      : 'border-blush-200 bg-white'
+                  }`}
+                >
+                  <div className="flex items-center justify-between">
+                    <div className="flex items-center gap-3">
+                      <span
+                        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
+                          payMethod === 'bank_transfer' ? 'border-pink' : 'border-blush-200'
+                        }`}
+                      >
+                        {payMethod === 'bank_transfer' && <span className="h-2.5 w-2.5 rounded-full bg-pink" />}
+                      </span>
+                      <div>
+                        <div className="font-bold text-navy">Bank transfer</div>
+                        <div className="text-[13px] text-neutral-500">Upload slip · manual verify</div>
+                      </div>
+                    </div>
+                  </div>
+                </button>
+
+                {/* Transfer-to details (from admin-editable settings) */}
+                {payMethod === 'bank_transfer' && bank.enabled && (
+                  <div className="rounded-2xl border border-blush-200 bg-blush-50 p-4">
+                    <div className="pb-3 text-[13px] font-bold uppercase tracking-wide text-neutral-500">
+                      Transfer to
+                    </div>
+                    <dl className="flex flex-col gap-2 text-sm">
+                      <div className="flex items-center justify-between gap-3">
+                        <dt className="text-neutral-500">Bank</dt>
+                        <dd className="font-medium text-navy">{bank.bank_name}</dd>
+                      </div>
+                      <div className="flex items-center justify-between gap-3">
+                        <dt className="text-neutral-500">Name</dt>
+                        <dd className="font-medium text-navy">{bank.account_name}</dd>
+                      </div>
+                      <div className="flex items-center justify-between gap-3">
+                        <dt className="text-neutral-500">Account No</dt>
+                        <dd className="font-medium text-navy">{bank.account_no}</dd>
+                      </div>
+                      <div className="flex items-center justify-between gap-3">
+                        <dt className="text-neutral-500">Branch</dt>
+                        <dd className="font-medium text-navy">{bank.branch}</dd>
+                      </div>
+                    </dl>
+                    <div className="mt-3 flex items-baseline justify-between border-t border-blush-200 pt-3">
+                      <span className="font-bold text-navy">Amount</span>
+                      <span className="text-lg font-bold text-navy">{formatLKR(finalTotal)}</span>
+                    </div>
+                  </div>
+                )}
+
+                {/* Reference number */}
+                {payMethod === 'bank_transfer' && (
+                  <Field label="Transfer reference number" error={payErrors.paymentRef}>
+                    <input
+                      type="text"
+                      inputMode="text"
+                      value={payRef}
+                      onChange={(e) => {
+                        setPayRef(e.target.value)
+                        if (payErrors.paymentRef) setPayErrors((x) => ({ ...x, paymentRef: undefined }))
+                      }}
+                      placeholder="e.g. 9F3K2109"
+                      className="w-full rounded-xl border border-blush-200 bg-white px-4 py-3 text-navy placeholder:text-neutral-400 focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/40"
+                    />
+                  </Field>
+                )}
+
+                {/* Slip upload */}
+                {payMethod === 'bank_transfer' && (
+                  <div>
+                    <label className="mb-1.5 block text-sm font-medium text-navy">Bank slip screenshot</label>
+                    <label
+                      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
+                        payErrors.slipUrl
+                          ? 'border-pink bg-white'
+                          : slipPath
+                            ? 'border-green-400 bg-green-50'
+                            : 'border-blush-200 bg-white hover:border-pink'
+                      }`}
+                    >
+                      <input
+                        type="file"
+                        accept="image/jpeg,image/png,image/webp"
+                        className="sr-only"
+                        onChange={(e) => handleSlipFile(e.target.files?.[0] ?? null)}
+                      />
+                      {slipUploading ? (
+                        <span className="text-sm font-medium text-neutral-500">Uploading…</span>
+                      ) : slipPath ? (
+                        <>
+                          <span className="text-sm font-bold text-green-700">✓ Slip uploaded</span>
+                          <span className="mt-0.5 max-w-full truncate text-[13px] text-neutral-500">{slipName}</span>
+                          <span className="mt-1 text-[13px] font-medium text-pink">Replace</span>
+                        </>
+                      ) : (
+                        <>
+                          <span className="text-sm font-medium text-navy">Tap to upload your slip</span>
+                          <span className="mt-0.5 text-[13px] text-neutral-500">JPG, PNG or WebP · max 5 MB</span>
+                        </>
+                      )}
+                    </label>
+                    {payErrors.slipUrl && <p className="mt-1.5 text-[13px] text-pink">{payErrors.slipUrl}</p>}
+                  </div>
+                )}
+
+                {/* Failure retry state */}
+                {mutation.isError && (
+                  <div className="rounded-2xl border border-pink bg-white p-4 animate-tin">
+                    <div className="pb-1.5 font-bold text-pink">We couldn't place that order</div>
+                    <p className="pb-3 text-sm leading-relaxed text-neutral-600">
+                      Nothing was lost — your details and slip are still here. Try again, or message us and we'll take
+                      it from there.
+                    </p>
+                    <div className="flex gap-2.5">
+                      <button
+                        type="button"
+                        onClick={handleConfirm}
+                        disabled={mutation.isPending}
+                        className="flex-1 rounded-xl bg-pink py-3.5 text-sm font-bold text-white hover:bg-pink-dark disabled:opacity-50"
+                      >
+                        Try again
+                      </button>
+                      {waFallback && (
+                        <a
+                          href={`https://wa.me/${waFallback}`}
+                          target="_blank"
+                          rel="noopener noreferrer"
+                          className="flex-1 rounded-xl bg-[#25d366] py-3.5 text-center text-sm font-bold text-white"
+                        >
+                          WhatsApp us
+                        </a>
+                      )}
+                    </div>
+                  </div>
+                )}
+              </div>
             </div>
 
-            {/* Sticky footer: Confirm */}
+            {/* Sticky footer: place order */}
             <div className="border-t border-blush-200 bg-white px-4 pb-[max(1.125rem,env(safe-area-inset-bottom))] pt-3.5">
+              <div className="flex items-baseline justify-between pb-2.5">
+                <span className="text-sm text-neutral-500">Total</span>
+                <span className="text-lg font-bold text-navy">{formatLKR(finalTotal)}</span>
+              </div>
               <button
                 type="button"
                 onClick={handleConfirm}
-                disabled={mutation.isPending}
+                disabled={mutation.isPending || slipUploading}
                 className="w-full rounded-2xl bg-pink py-4 text-base font-bold text-white transition-colors hover:bg-pink-dark disabled:opacity-50"
               >
-                {mutation.isPending ? 'Confirming…' : 'Confirm order'}
+                {mutation.isPending ? 'Placing order…' : 'Place order'}
               </button>
               <p className="pt-2.5 text-center text-[13px] text-neutral-500">
-                Next: we open WhatsApp with your order pre-filled.
+                Your order is placed as <span className="font-medium text-navy">Awaiting verification</span> — we'll
+                confirm once we've checked your slip.
               </p>
             </div>
           </>
@@ -457,6 +696,7 @@ function OrderConfirmation({
     isGift: boolean
     recipientName: string
     recipientPhone: string | null
+    paymentMethod: PaymentMethod | null
   }
   customerName: string
   waFallback: string | null
@@ -467,6 +707,7 @@ function OrderConfirmation({
   const [handoffOpen, setHandoffOpen] = useState(false)
   const [copied, setCopied] = useState(false)
   const firstName = customerName.trim().split(/\s+/)[0] || 'there'
+  const isBank = success.paymentMethod === 'bank_transfer'
 
   async function copyMessage() {
     try {
@@ -485,7 +726,9 @@ function OrderConfirmation({
         <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink text-3xl text-white">✓</div>
         <h2 className="font-display text-[32px] leading-tight text-navy">Thank you, {firstName}.</h2>
         <p className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed text-neutral-600">
-          Your order is in. Send us the WhatsApp message below and we'll confirm timing and lettering within the hour.
+          {isBank
+            ? "Your order is in and marked awaiting verification. We'll check your transfer slip and confirm timing within the hour."
+            : "Your order is in. Send us the WhatsApp message below and we'll confirm timing and lettering within the hour."}
         </p>
         <div className="pt-2 text-sm text-neutral-500">
           Order <span className="font-bold text-navy">#{success.orderNo}</span>
@@ -535,24 +778,37 @@ function OrderConfirmation({
       </div>
 
       <div className="px-6 pt-5">
-        <a
-          href={success.waLink}
-          target="_blank"
-          rel="noopener noreferrer"
-          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25d366] py-4 text-[17px] font-bold text-white shadow-[0_14px_26px_-12px_rgba(37,211,102,0.9)]"
-        >
-          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
-            <path d="M21 11.6a8.4 8.4 0 0 1-12.4 7.4L4 20.5l1.6-4.4A8.4 8.4 0 1 1 21 11.6Z" />
-          </svg>
-          Continue on WhatsApp
-        </a>
-        <button type="button" onClick={onClose} className="mt-2.5 w-full py-3 text-[15px] font-medium text-neutral-500 hover:text-navy">
-          Back to shopping
-        </button>
+        {isBank ? (
+          <button
+            type="button"
+            onClick={onClose}
+            className="w-full rounded-2xl bg-pink py-4 text-[17px] font-bold text-white hover:bg-pink-dark"
+          >
+            Back to shopping
+          </button>
+        ) : (
+          <>
+            <a
+              href={success.waLink}
+              target="_blank"
+              rel="noopener noreferrer"
+              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25d366] py-4 text-[17px] font-bold text-white shadow-[0_14px_26px_-12px_rgba(37,211,102,0.9)]"
+            >
+              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
+                <path d="M21 11.6a8.4 8.4 0 0 1-12.4 7.4L4 20.5l1.6-4.4A8.4 8.4 0 1 1 21 11.6Z" />
+              </svg>
+              Continue on WhatsApp
+            </a>
+            <button type="button" onClick={onClose} className="mt-2.5 w-full py-3 text-[15px] font-medium text-neutral-500 hover:text-navy">
+              Back to shopping
+            </button>
+          </>
+        )}
       </div>
 
-      {/* Handoff fallback — WhatsApp may not open on some devices */}
-      <div className="mx-6 mt-4 border-t border-blush-200 pb-6 pt-3.5">
+      {/* Handoff fallback — WhatsApp may not open on some devices (card flow only) */}
+      {!isBank && (
+        <div className="mx-6 mt-4 border-t border-blush-200 pb-6 pt-3.5">
         <button
           type="button"
           onClick={() => setHandoffOpen((o) => !o)}
@@ -585,7 +841,8 @@ function OrderConfirmation({
             </div>
           </div>
         )}
-      </div>
+        </div>
+      )}
     </div>
   )
 }
diff --git a/src/hooks/useAdminOrders.ts b/src/hooks/useAdminOrders.ts
index 0420e0a..336cebd 100644
--- a/src/hooks/useAdminOrders.ts
+++ b/src/hooks/useAdminOrders.ts
@@ -1,5 +1,5 @@
 import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
-import { fetchOrders, updateOrderStatus, type OrderFilters } from '../lib/adminOrders'
+import { fetchOrders, updateOrderStatus, confirmOrderPayment, type OrderFilters } from '../lib/adminOrders'
 import type { OrderStatus } from '../lib/orderStatus'
 
 // Admin order list, live from Supabase with a short staleTime (spec §8). Status
@@ -29,6 +29,21 @@ export function useUpdateOrderStatus() {
     onSuccess: () => {
       qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
       qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
+      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
+    },
+  })
+}
+
+// Confirm a bank-transfer payment (admin verified the slip). Invalidates the
+// kitchen board too, since confirming payment is what surfaces the job there.
+export function useConfirmOrderPayment() {
+  const qc = useQueryClient()
+  return useMutation({
+    mutationFn: (id: string) => confirmOrderPayment(id),
+    onSuccess: () => {
+      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
+      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
+      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
     },
   })
 }
diff --git a/src/lib/adminOrders.ts b/src/lib/adminOrders.ts
index cd178c0..2fe4e66 100644
--- a/src/lib/adminOrders.ts
+++ b/src/lib/adminOrders.ts
@@ -30,6 +30,10 @@ export interface AdminOrder {
   is_gift?: boolean
   recipient_name?: string | null
   recipient_phone?: string | null
+  payment_method?: string | null
+  payment_status?: string | null
+  payment_ref?: string | null
+  slip_url?: string | null
   subtotal: number
   delivery_fee: number
   total: number
@@ -49,7 +53,7 @@ export async function fetchOrders(filters: OrderFilters = {}): Promise<AdminOrde
   let query = supabase
     .from('orders')
     .select(
-      'id, order_no, status, customer_name, phone, email, alt_phone, address, delivery_date, note, is_gift, recipient_name, recipient_phone, subtotal, delivery_fee, total, total_pieces, source, created_at, order_items(id, product_name, package_label, piece_count, box_qty, unit_price, addons, line_total)',
+      'id, order_no, status, customer_name, phone, email, alt_phone, address, delivery_date, note, is_gift, recipient_name, recipient_phone, payment_method, payment_status, payment_ref, slip_url, subtotal, delivery_fee, total, total_pieces, source, created_at, order_items(id, product_name, package_label, piece_count, box_qty, unit_price, addons, line_total)',
     )
     .order('created_at', { ascending: false })
 
@@ -69,3 +73,10 @@ export async function updateOrderStatus(id: string, status: OrderStatus): Promis
   const { error } = await supabase.from('orders').update({ status }).eq('id', id)
   if (error) throw new Error(error.message)
 }
+
+// Mark a bank-transfer order's payment as confirmed after the admin has
+// checked the slip. Setting payment_status='paid' releases it to the kitchen.
+export async function confirmOrderPayment(id: string): Promise<void> {
+  const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', id)
+  if (error) throw new Error(error.message)
+}
diff --git a/src/lib/bankSlips.test.ts b/src/lib/bankSlips.test.ts
new file mode 100644
index 0000000..e7d6618
--- /dev/null
+++ b/src/lib/bankSlips.test.ts
@@ -0,0 +1,26 @@
+import { describe, it, expect } from 'vitest'
+import { validateSlipFile } from './bankSlips'
+
+// Minimal File stub — only the fields validateSlipFile reads (type, size).
+function fakeFile(type: string, bytes: number): File {
+  return { type, size: bytes, name: `slip.${type.split('/')[1] ?? 'bin'}` } as File
+}
+
+describe('validateSlipFile (private bank-slip upload guard)', () => {
+  it('accepts a JPEG under 5 MB', () => {
+    expect(validateSlipFile(fakeFile('image/jpeg', 1_000_000))).toBeNull()
+  })
+
+  it('accepts PNG and WebP', () => {
+    expect(validateSlipFile(fakeFile('image/png', 500_000))).toBeNull()
+    expect(validateSlipFile(fakeFile('image/webp', 500_000))).toBeNull()
+  })
+
+  it('rejects a PDF (wrong type)', () => {
+    expect(validateSlipFile(fakeFile('application/pdf', 100_000))).toMatch(/JPG|PNG|WebP/)
+  })
+
+  it('rejects a file over 5 MB', () => {
+    expect(validateSlipFile(fakeFile('image/jpeg', 6 * 1024 * 1024))).toMatch(/5 MB/)
+  })
+})
diff --git a/src/lib/bankSlips.ts b/src/lib/bankSlips.ts
new file mode 100644
index 0000000..a154261
--- /dev/null
+++ b/src/lib/bankSlips.ts
@@ -0,0 +1,57 @@
+// Bank transfer slip handling. Slips are customer financial documents, so they
+// live in the PRIVATE `bank-slips` bucket (migration 026): anon may upload,
+// only authenticated admins may read them back via a signed URL.
+//
+// Unlike product images (public bucket → getPublicUrl), we store the object
+// PATH on the order (slip_url column), never a public URL — a public URL to a
+// private bucket wouldn't resolve, and we don't want a guessable link anyway.
+import { supabase } from './supabase'
+
+const BUCKET = 'bank-slips'
+const MAX_BYTES = 5 * 1024 * 1024 // 5 MB, matches the checkout hint
+const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
+
+export interface SlipUploadResult {
+  /** Object path within the private bucket, stored on orders.slip_url. */
+  path: string
+}
+
+/** Human-readable guard errors so the checkout UI can show them inline. */
+export function validateSlipFile(file: File): string | null {
+  if (!ACCEPTED.includes(file.type)) return 'Upload a JPG, PNG or WebP image.'
+  if (file.size > MAX_BYTES) return 'File is too large — keep it under 5 MB.'
+  return null
+}
+
+/**
+ * Upload a slip to the private bucket. Returns the object path to store on the
+ * order. Throws with a readable message on failure so checkout can offer retry.
+ */
+export async function uploadBankSlip(file: File): Promise<SlipUploadResult> {
+  const guard = validateSlipFile(file)
+  if (guard) throw new Error(guard)
+
+  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
+  // Date-prefixed folder keeps the bucket browsable in the Supabase dashboard.
+  const day = new Date().toISOString().slice(0, 10)
+  const path = `${day}/${crypto.randomUUID()}.${ext}`
+
+  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
+    cacheControl: '3600',
+    upsert: false,
+    contentType: file.type,
+  })
+  if (error) throw new Error(error.message || 'Could not upload the slip. Please try again.')
+  return { path }
+}
+
+/**
+ * Admin-only: turn a stored slip path into a short-lived signed URL for viewing
+ * in Admin › Orders. Returns null if there's no slip or the sign fails.
+ */
+export async function signedSlipUrl(path: string | null | undefined): Promise<string | null> {
+  if (!path) return null
+  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10)
+  if (error || !data) return null
+  return data.signedUrl
+}
diff --git a/src/lib/kitchenOrders.test.ts b/src/lib/kitchenOrders.test.ts
new file mode 100644
index 0000000..55481ad
--- /dev/null
+++ b/src/lib/kitchenOrders.test.ts
@@ -0,0 +1,34 @@
+import { describe, it, expect } from 'vitest'
+import { kitchenVisible } from './kitchenOrders'
+
+describe('kitchenVisible (payment + processing gate for the kitchen board)', () => {
+  it('shows a paid bank-transfer order', () => {
+    expect(kitchenVisible({ payment_status: 'paid', payment_method: 'bank_transfer', source: 'web', status: 'pending' })).toBe(true)
+  })
+
+  it('hides an unverified bank-transfer order', () => {
+    expect(kitchenVisible({ payment_status: 'awaiting_verification', payment_method: 'bank_transfer', source: 'web', status: 'pending' })).toBe(false)
+  })
+
+  it('shows a paid card order (PayHere auto-confirmed)', () => {
+    expect(kitchenVisible({ payment_status: 'paid', payment_method: 'card', source: 'web', status: 'pending' })).toBe(true)
+  })
+
+  it('hides an unpaid card order', () => {
+    expect(kitchenVisible({ payment_status: 'unpaid', payment_method: 'card', source: 'web', status: 'pending' })).toBe(false)
+  })
+
+  it('hides a corporate/wedding conversion still at pending (not yet processed)', () => {
+    expect(kitchenVisible({ source: 'inquiry_conversion', status: 'pending', payment_method: null })).toBe(false)
+  })
+
+  it('shows a corporate/wedding conversion once admin advances it past pending', () => {
+    expect(kitchenVisible({ source: 'inquiry_conversion', status: 'confirmed', payment_method: null })).toBe(true)
+    expect(kitchenVisible({ source: 'inquiry_conversion', status: 'baking', payment_method: null })).toBe(true)
+  })
+
+  it('shows a legacy web order with no payment method (pre-payment WhatsApp flow)', () => {
+    expect(kitchenVisible({ source: 'web', payment_method: null, status: 'pending' })).toBe(true)
+    expect(kitchenVisible({})).toBe(true)
+  })
+})
diff --git a/src/lib/kitchenOrders.ts b/src/lib/kitchenOrders.ts
index a92c0a5..7e098c9 100644
--- a/src/lib/kitchenOrders.ts
+++ b/src/lib/kitchenOrders.ts
@@ -87,18 +87,41 @@ export function offsetDate(days: number): string {
   return d.toISOString().split('T')[0]
 }
 
+// Payment/processing gate as a pure predicate so the rule is unit-testable.
+// An order is visible to the kitchen when:
+//   - its payment is confirmed (card auto-paid, or bank transfer admin-verified), OR
+//   - it's a corporate/wedding conversion (source='inquiry_conversion') that
+//     admin has processed by advancing it past 'pending', OR
+//   - it's a legacy web order with no payment step (pre-payment WhatsApp flow),
+//     which has no payment_method and isn't an inquiry conversion.
+export function kitchenVisible(o: {
+  payment_status?: string | null
+  payment_method?: string | null
+  source?: string | null
+  status?: string | null
+}): boolean {
+  if (o.payment_status === 'paid') return true
+  if (o.source === 'inquiry_conversion') return o.status != null && o.status !== 'pending'
+  // Legacy web order with no payment method: flows through as before.
+  return o.payment_method == null
+}
+
 export async function fetchKitchenOrders(deliveryDate: string): Promise<KitchenOrder[]> {
   const { data, error } = await supabase
     .from('orders')
     .select(
-      'id, order_no, status, customer_name, address, delivery_date, note, total_pieces, order_items(id, product_name, package_label, piece_count, box_qty, addons)',
+      'id, order_no, status, customer_name, address, delivery_date, note, total_pieces, payment_status, payment_method, source, order_items(id, product_name, package_label, piece_count, box_qty, addons)',
     )
     .eq('delivery_date', deliveryDate)
     .neq('status', 'cancelled')
     .order('order_no', { ascending: true })
 
   if (error) throw new Error(error.message)
-  return (data ?? []) as unknown as KitchenOrder[]
+  return ((data ?? []) as unknown as (KitchenOrder & {
+    payment_status?: string | null
+    payment_method?: string | null
+    source?: string | null
+  })[]).filter(kitchenVisible)
 }
 
 export async function advanceKitchenStatus(id: string, to: OrderStatus): Promise<void> {
diff --git a/src/lib/liveCatalog.ts b/src/lib/liveCatalog.ts
index 28739fd..59ef898 100644
--- a/src/lib/liveCatalog.ts
+++ b/src/lib/liveCatalog.ts
@@ -133,6 +133,9 @@ export async function fetchLiveCatalog(seed: Catalog): Promise<Catalog> {
       (settingsMap.get('features') as Catalog['settings']['features']) ?? seed.settings.features,
     business:
       (settingsMap.get('business') as Catalog['settings']['business']) ?? seed.settings.business,
+    bankTransfer:
+      (settingsMap.get('bank_transfer') as Catalog['settings']['bankTransfer']) ??
+      seed.settings.bankTransfer,
   }
   const content = mergeContent(settingsMap.get('content') ?? seed.content)
 
diff --git a/src/lib/orders.ts b/src/lib/orders.ts
index 411fe2c..00f9cfd 100644
--- a/src/lib/orders.ts
+++ b/src/lib/orders.ts
@@ -15,11 +15,19 @@ export interface AppliedVoucher {
   discount: number
 }
 
+/** Payment selection carried from the checkout Payment step into the RPC. */
+export interface OrderPayment {
+  method: 'bank_transfer' | 'card'
+  paymentRef?: string | null
+  slipUrl?: string | null
+}
+
 export interface CreateOrderInput {
   items: CartLine[]
   totals: CartTotals
   details: CheckoutDetails
   voucher?: AppliedVoucher | null
+  payment?: OrderPayment | null
 }
 
 export interface CreatedOrder {
@@ -43,7 +51,7 @@ export function orderItemsPayload(items: CartLine[]) {
   }))
 }
 
-export async function createOrder({ items, totals, details, voucher }: CreateOrderInput): Promise<CreatedOrder> {
+export async function createOrder({ items, totals, details, voucher, payment }: CreateOrderInput): Promise<CreatedOrder> {
   const phone = normalizePhone(details.phone)
   if (!phone) throw new Error('Invalid phone number')
   // Optional second number: normalise if given, otherwise omit.
@@ -69,6 +77,9 @@ export async function createOrder({ items, totals, details, voucher }: CreateOrd
       p_is_gift: details.isGift ?? false,
       p_recipient_name: details.isGift ? details.recipientName || null : null,
       p_recipient_phone: details.isGift && details.recipientPhone ? normalizePhone(details.recipientPhone) : null,
+      p_payment_method: payment?.method ?? null,
+      p_payment_ref: payment?.paymentRef || null,
+      p_slip_url: payment?.slipUrl || null,
     })
     .single()
 
diff --git a/src/pages/admin/Orders.tsx b/src/pages/admin/Orders.tsx
index 3adc60b..6260fa4 100644
--- a/src/pages/admin/Orders.tsx
+++ b/src/pages/admin/Orders.tsx
@@ -1,6 +1,7 @@
-import { useMemo, useState } from 'react'
-import { useAllAdminOrders, useUpdateOrderStatus } from '../../hooks/useAdminOrders'
+import { useEffect, useMemo, useState } from 'react'
+import { useAllAdminOrders, useUpdateOrderStatus, useConfirmOrderPayment } from '../../hooks/useAdminOrders'
 import type { AdminOrder } from '../../lib/adminOrders'
+import { signedSlipUrl } from '../../lib/bankSlips'
 import { STATUS_LABELS, nextStatus, canCancel, type OrderStatus } from '../../lib/orderStatus'
 import {
   ordersForTab,
@@ -34,6 +35,7 @@ export default function Orders() {
   const [expanded, setExpanded] = useState<string | null>(null)
   const { data: orders, isLoading, isError, error } = useAllAdminOrders()
   const updateStatus = useUpdateOrderStatus()
+  const confirmPayment = useConfirmOrderPayment()
 
   const all = orders ?? []
   const counts = useMemo(
@@ -120,6 +122,8 @@ export default function Orders() {
                   onToggle={() => setExpanded((cur) => (cur === order.id ? null : order.id))}
                   onAdvance={(to) => updateStatus.mutate({ id: order.id, status: to })}
                   busy={updateStatus.isPending}
+                  onConfirmPayment={() => confirmPayment.mutate(order.id)}
+                  confirmingPayment={confirmPayment.isPending}
                 />
               ))}
             </tbody>
@@ -137,6 +141,8 @@ function OrderRow({
   onToggle,
   onAdvance,
   busy,
+  onConfirmPayment,
+  confirmingPayment,
 }: {
   order: AdminOrder
   allOrders: AdminOrder[]
@@ -144,6 +150,8 @@ function OrderRow({
   onToggle: () => void
   onAdvance: (to: OrderStatus) => void
   busy: boolean
+  onConfirmPayment: () => void
+  confirmingPayment: boolean
 }) {
   const { catalog } = useCatalog()
   const tier = findTier(order.total_pieces, catalog.deliveryTiers)
@@ -307,6 +315,44 @@ function OrderRow({
                       <span className="font-medium">Note:</span> {order.note}
                     </div>
                   )}
+                  {order.payment_method && (
+                    <div className="mt-1 rounded bg-white px-2 py-1.5 text-neutral-700">
+                      <span className="font-medium">Payment:</span>{' '}
+                      {order.payment_method === 'bank_transfer' ? 'Bank transfer' : 'Card'}
+                      {order.payment_status && (
+                        <span
+                          className={`ml-1.5 rounded px-1.5 py-0.5 text-xs font-semibold ${
+                            order.payment_status === 'paid'
+                              ? 'bg-green-100 text-green-700'
+                              : order.payment_status === 'awaiting_verification'
+                                ? 'bg-amber-100 text-amber-700'
+                                : order.payment_status === 'failed'
+                                  ? 'bg-red-100 text-red-700'
+                                  : 'bg-neutral-100 text-neutral-600'
+                          }`}
+                        >
+                          {order.payment_status.replace(/_/g, ' ')}
+                        </span>
+                      )}
+                      {order.payment_ref && (
+                        <div className="text-xs text-neutral-500">Ref: {order.payment_ref}</div>
+                      )}
+                      {order.slip_url && <SlipLink path={order.slip_url} />}
+                      {order.payment_status === 'awaiting_verification' && (
+                        <div className="mt-2">
+                          <button
+                            type="button"
+                            onClick={onConfirmPayment}
+                            disabled={confirmingPayment}
+                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
+                          >
+                            {confirmingPayment ? 'Confirming…' : '✓ Confirm payment received'}
+                          </button>
+                          <p className="mt-1 text-[11px] text-neutral-400">Sends this order to the kitchen board.</p>
+                        </div>
+                      )}
+                    </div>
+                  )}
                 </dl>
               </div>
             </div>
@@ -317,6 +363,30 @@ function OrderRow({
   )
 }
 
+function SlipLink({ path }: { path: string }) {
+  const [url, setUrl] = useState<string | null>(null)
+  useEffect(() => {
+    let alive = true
+    signedSlipUrl(path).then((u) => {
+      if (alive) setUrl(u)
+    })
+    return () => {
+      alive = false
+    }
+  }, [path])
+  if (!url) return <div className="text-xs text-neutral-400">Loading slip…</div>
+  return (
+    <a
+      href={url}
+      target="_blank"
+      rel="noopener noreferrer"
+      className="text-xs font-medium text-pink underline hover:no-underline"
+    >
+      View bank slip
+    </a>
+  )
+}
+
 function ordinal(n: number): string {
   const s = ['th', 'st', 'nd', 'rd']
   const v = n % 100
diff --git a/src/schemas/checkout.ts b/src/schemas/checkout.ts
index fdae9f9..e22c6ee 100644
--- a/src/schemas/checkout.ts
+++ b/src/schemas/checkout.ts
@@ -51,4 +51,39 @@ export const checkoutDetailsSchema = z.object({
     }
   })
 
+// Payment step (spec: separate step after Review). Only bank transfer is live;
+// card is wired in a later PayHere PR. Bank transfer requires BOTH a reference
+// number and an uploaded slip before the order can be placed — validated here
+// so the CheckoutModal and any future caller share one rule.
+export const PAYMENT_METHODS = ['bank_transfer', 'card'] as const
+export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
+
+export const paymentSchema = z
+  .object({
+    method: z.enum(PAYMENT_METHODS),
+    // slipUrl is the object path returned by the storage upload; the file
+    // itself is uploaded before this validates.
+    paymentRef: z.string().trim().max(120).optional(),
+    slipUrl: z.string().trim().max(500).optional(),
+  })
+  .superRefine((data, ctx) => {
+    if (data.method !== 'bank_transfer') return
+    if (!data.paymentRef?.trim()) {
+      ctx.addIssue({
+        code: z.ZodIssueCode.custom,
+        path: ['paymentRef'],
+        message: 'Enter the transfer reference number',
+      })
+    }
+    if (!data.slipUrl?.trim()) {
+      ctx.addIssue({
+        code: z.ZodIssueCode.custom,
+        path: ['slipUrl'],
+        message: 'Upload your bank transfer slip',
+      })
+    }
+  })
+
+export type PaymentDetails = z.infer<typeof paymentSchema>
+
 export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>
diff --git a/src/schemas/payment.test.ts b/src/schemas/payment.test.ts
new file mode 100644
index 0000000..564e41c
--- /dev/null
+++ b/src/schemas/payment.test.ts
@@ -0,0 +1,52 @@
+import { describe, it, expect } from 'vitest'
+import { paymentSchema } from './checkout'
+
+describe('payment schema (PR-A: bank transfer requires ref + slip)', () => {
+  it('accepts a complete bank transfer (ref + slip present)', () => {
+    const r = paymentSchema.safeParse({
+      method: 'bank_transfer',
+      paymentRef: '9F3K2109',
+      slipUrl: '2026-08-01/abc.jpg',
+    })
+    expect(r.success).toBe(true)
+  })
+
+  it('rejects a bank transfer with no reference', () => {
+    const r = paymentSchema.safeParse({
+      method: 'bank_transfer',
+      paymentRef: '',
+      slipUrl: '2026-08-01/abc.jpg',
+    })
+    expect(r.success).toBe(false)
+    if (!r.success) {
+      expect(r.error.issues.some((i) => i.path[0] === 'paymentRef')).toBe(true)
+    }
+  })
+
+  it('rejects a bank transfer with no slip uploaded', () => {
+    const r = paymentSchema.safeParse({
+      method: 'bank_transfer',
+      paymentRef: '9F3K2109',
+      slipUrl: '',
+    })
+    expect(r.success).toBe(false)
+    if (!r.success) {
+      expect(r.error.issues.some((i) => i.path[0] === 'slipUrl')).toBe(true)
+    }
+  })
+
+  it('rejects a bank transfer missing both ref and slip', () => {
+    const r = paymentSchema.safeParse({ method: 'bank_transfer' })
+    expect(r.success).toBe(false)
+  })
+
+  it('accepts a card payment without ref or slip (card has no manual proof)', () => {
+    const r = paymentSchema.safeParse({ method: 'card' })
+    expect(r.success).toBe(true)
+  })
+
+  it('rejects an unknown payment method', () => {
+    const r = paymentSchema.safeParse({ method: 'crypto' })
+    expect(r.success).toBe(false)
+  })
+})
diff --git a/src/types/catalog.ts b/src/types/catalog.ts
index 660ffdd..49e9aff 100644
--- a/src/types/catalog.ts
+++ b/src/types/catalog.ts
@@ -125,10 +125,18 @@ export interface BusinessSetting {
   whatsapp_number: string
   google_business_url: string
 }
+export interface BankTransferSetting {
+  bank_name: string
+  account_name: string
+  account_no: string
+  branch: string
+  enabled: boolean
+}
 export interface CatalogSettings {
   banner: BannerSetting
   features: FeaturesSetting
   business: BusinessSetting
+  bankTransfer: BankTransferSetting
 }
 
 export interface Catalog {
diff --git a/supabase/migrations/026_payment_method.sql b/supabase/migrations/026_payment_method.sql
new file mode 100644
index 0000000..af1d46f
--- /dev/null
+++ b/supabase/migrations/026_payment_method.sql
@@ -0,0 +1,165 @@
+-- 026_payment_method.sql
+--
+-- Adds a payment step to checkout. Two methods at launch: bank transfer
+-- (customer transfers manually, enters a reference, uploads a slip) and card
+-- (PayHere — wired in a later PR). Payment state is modelled on a SEPARATE
+-- axis from fulfilment `status`: an order can be `awaiting_verification` on
+-- payment while still `pending` on fulfilment. This deliberately does NOT
+-- touch the `order_status` enum, so the kitchen portal's "existing enum
+-- values only" rule stays intact.
+--
+--   payment_method : 'bank_transfer' | 'card'   (null for legacy/whatsapp orders)
+--   payment_status : 'unpaid' | 'awaiting_verification' | 'paid' | 'failed'
+--   payment_ref    : customer-entered bank transfer reference number
+--   slip_url       : object path in the private `bank-slips` bucket
+--
+-- All nullable / defaulted; existing orders are unaffected.
+
+alter table orders
+  add column if not exists payment_method text
+    check (payment_method in ('bank_transfer', 'card')),
+  add column if not exists payment_status text not null default 'unpaid'
+    check (payment_status in ('unpaid', 'awaiting_verification', 'paid', 'failed')),
+  add column if not exists payment_ref text,
+  add column if not exists slip_url text;
+
+-- Editable bank-transfer details shown to customers on the Payment step.
+-- Lives in site_settings so the account can change without a code deploy.
+-- Seeded with the current business account; admin can edit later.
+insert into site_settings (key, value)
+values (
+  'bank_transfer',
+  '{"bank_name": "Nations Trust Bank", "account_name": "M N AHAMED", "account_no": "200520120714", "branch": "Mt Lavinia", "enabled": true}'::jsonb
+)
+on conflict (key) do nothing;
+
+-- Allow the public storefront read of this new settings key (matches the
+-- existing public-readable settings allow-list pattern).
+drop policy if exists "site_settings_public_read" on site_settings;
+create policy "site_settings_public_read" on site_settings
+  for select
+  using (key in ('banner', 'features', 'business', 'bank_transfer'));
+
+-- ── Private bucket for bank slips ──────────────────────────────────────────
+-- Slips are customer financial documents — NOT public like product-images.
+-- Anon may upload (insert) so guests can attach a slip at checkout; only
+-- authenticated admins may read them back (via signed URLs in Admin › Orders).
+insert into storage.buckets (id, name, public)
+values ('bank-slips', 'bank-slips', false)
+on conflict (id) do nothing;
+
+drop policy if exists "bank_slips_anon_insert" on storage.objects;
+create policy "bank_slips_anon_insert" on storage.objects
+  for insert to anon, authenticated
+  with check (bucket_id = 'bank-slips');
+
+drop policy if exists "bank_slips_admin_read" on storage.objects;
+create policy "bank_slips_admin_read" on storage.objects
+  for select to authenticated
+  using (bucket_id = 'bank-slips');
+
+-- ── Extend create_order with the payment fields ────────────────────────────
+-- Drop the migration-024 signature, then recreate with three new trailing
+-- params (defaulted, so callers that don't pass them still work).
+drop function if exists create_order(
+  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
+  text, numeric, boolean, text, text
+);
+
+create or replace function create_order(
+  p_customer_name text,
+  p_phone text,
+  p_email text,
+  p_alt_phone text,
+  p_address text,
+  p_delivery_date date,
+  p_note text,
+  p_subtotal numeric,
+  p_delivery_fee numeric,
+  p_total numeric,
+  p_total_pieces int,
+  p_items jsonb,
+  p_voucher_code text default null,
+  p_voucher_discount numeric default 0,
+  p_is_gift boolean default false,
+  p_recipient_name text default null,
+  p_recipient_phone text default null,
+  p_payment_method text default null,
+  p_payment_ref text default null,
+  p_slip_url text default null
+)
+returns table (id uuid, order_no int)
+language plpgsql
+security definer
+set search_path = public
+as $$
+declare
+  v_id uuid;
+  v_order_no int;
+  v_code text := nullif(upper(trim(coalesce(p_voucher_code, ''))), '');
+  v_voucher gift_vouchers%rowtype;
+  -- Bank transfers land as awaiting_verification (admin checks the slip);
+  -- card orders are marked paid by the PayHere callback in a later PR, so
+  -- they start unpaid here; anything else (legacy) stays unpaid.
+  v_payment_status text := case
+    when p_payment_method = 'bank_transfer' then 'awaiting_verification'
+    else 'unpaid'
+  end;
+begin
+  if v_code is not null then
+    select * into v_voucher from gift_vouchers where code = v_code for update;
+    if not found or not v_voucher.is_active then
+      raise exception 'VOUCHER_INVALID';
+    end if;
+    if v_voucher.used_at is not null then
+      raise exception 'VOUCHER_USED';
+    end if;
+  end if;
+
+  insert into orders (
+    customer_name, phone, email, alt_phone, address, delivery_date, note,
+    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id,
+    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone,
+    payment_method, payment_status, payment_ref, slip_url
+  )
+  values (
+    p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
+    p_address, p_delivery_date, p_note,
+    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null,
+    v_code, coalesce(p_voucher_discount, 0),
+    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, ''),
+    p_payment_method, v_payment_status, nullif(p_payment_ref, ''), nullif(p_slip_url, '')
+  )
+  returning orders.id, orders.order_no into v_id, v_order_no;
+
+  if v_code is not null then
+    update gift_vouchers
+      set used_at = now(), used_by_order_id = v_id
+      where code = v_code;
+  end if;
+
+  insert into order_items (
+    order_id, product_id, product_name, package_id, package_label,
+    piece_count, box_qty, unit_price, addons, line_total
+  )
+  select
+    v_id,
+    nullif(item->>'product_id', '')::uuid,
+    item->>'product_name',
+    item->>'package_id',
+    item->>'package_label',
+    (item->>'piece_count')::int,
+    (item->>'box_qty')::int,
+    (item->>'unit_price')::numeric,
+    coalesce(item->'addons', '[]'::jsonb),
+    (item->>'line_total')::numeric
+  from jsonb_array_elements(p_items) as item;
+
+  return query select v_id, v_order_no;
+end;
+$$;
+
+grant execute on function create_order(
+  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
+  text, numeric, boolean, text, text, text, text, text
+) to anon, authenticated;
diff --git a/supabase/setup.sql b/supabase/setup.sql
index 8ccdae5..5a1c3de 100644
--- a/supabase/setup.sql
+++ b/supabase/setup.sql
@@ -114,6 +114,11 @@ create table if not exists orders (
   is_gift boolean not null default false,
   recipient_name text,
   recipient_phone text,
+  payment_method text check (payment_method in ('bank_transfer', 'card')),
+  payment_status text not null default 'unpaid'
+    check (payment_status in ('unpaid', 'awaiting_verification', 'paid', 'failed')),
+  payment_ref text,
+  slip_url text,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );
@@ -230,6 +235,7 @@ insert into site_settings (key, value) values
   ('banner',   '{"enabled": false, "text": "", "starts_at": null, "ends_at": null}'::jsonb),
   ('features', '{"corporate_section": true, "wedding_section": true, "reviews_section": true}'::jsonb),
   ('business', '{"whatsapp_number": "", "google_business_url": ""}'::jsonb),
+  ('bank_transfer', '{"bank_name": "Nations Trust Bank", "account_name": "M N AHAMED", "account_no": "200520120714", "branch": "Mt Lavinia", "enabled": true}'::jsonb),
   -- Editable storefront content (admin Content & SEO). Starts empty: the app
   -- fills defaults until the admin saves, which writes the full blob here.
   ('content',  '{}'::jsonb)
@@ -307,7 +313,7 @@ create policy "admin all delivery tiers" on delivery_tiers for all
 
 drop policy if exists "public read public settings" on site_settings;
 create policy "public read public settings" on site_settings for select
-  using (key in ('banner', 'features', 'business'));
+  using (key in ('banner', 'features', 'business', 'bank_transfer'));
 drop policy if exists "admin all settings" on site_settings;
 create policy "admin all settings" on site_settings for all
   using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
@@ -344,12 +350,17 @@ drop function if exists create_order(
 drop function if exists create_order(
   text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb, text, numeric
 );
+drop function if exists create_order(
+  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
+  text, numeric, boolean, text, text
+);
 create or replace function create_order(
   p_customer_name text, p_phone text, p_email text, p_alt_phone text,
   p_address text, p_delivery_date date, p_note text,
   p_subtotal numeric, p_delivery_fee numeric, p_total numeric, p_total_pieces int, p_items jsonb,
   p_voucher_code text default null, p_voucher_discount numeric default 0,
-  p_is_gift boolean default false, p_recipient_name text default null, p_recipient_phone text default null
+  p_is_gift boolean default false, p_recipient_name text default null, p_recipient_phone text default null,
+  p_payment_method text default null, p_payment_ref text default null, p_slip_url text default null
 )
 returns table (id uuid, order_no int)
 language plpgsql security definer set search_path = public as $$
@@ -357,6 +368,10 @@ declare
   v_id uuid; v_order_no int;
   v_code text := nullif(upper(trim(coalesce(p_voucher_code, ''))), '');
   v_voucher gift_vouchers%rowtype;
+  v_payment_status text := case
+    when p_payment_method = 'bank_transfer' then 'awaiting_verification'
+    else 'unpaid'
+  end;
 begin
   if v_code is not null then
     select * into v_voucher from gift_vouchers where code = v_code for update;
@@ -371,13 +386,15 @@ begin
   insert into orders (
     customer_name, phone, email, alt_phone, address, delivery_date, note,
     subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id,
-    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone
+    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone,
+    payment_method, payment_status, payment_ref, slip_url
   ) values (
     p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
     p_address, p_delivery_date, p_note,
     p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null,
     v_code, coalesce(p_voucher_discount, 0),
-    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, '')
+    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, ''),
+    p_payment_method, v_payment_status, nullif(p_payment_ref, ''), nullif(p_slip_url, '')
   ) returning orders.id, orders.order_no into v_id, v_order_no;
 
   if v_code is not null then
@@ -405,7 +422,7 @@ end; $$;
 
 grant execute on function create_order(
   text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
-  text, numeric, boolean, text, text
+  text, numeric, boolean, text, text, text, text, text
 ) to anon, authenticated;
 
 -- Read-only "is this code valid?" check for the checkout Apply button.
PATCH_EOF
echo "→ Applying patch…"; git apply --index "$PATCH_FILE"; rm -f "$PATCH_FILE"
echo "→ Installing deps…"; npm install --silent
echo "→ Snapshot…"; npm run snapshot --silent || true
echo "→ Typecheck…"; npx tsc -b
echo "→ Lint…"; npx oxlint
echo "→ Tests…"; npx vitest run
echo "→ Build…"; npm run build
echo
echo "✅ Done. Remember: git add -A && commit && push, then open the PR."
echo "⚠️  After merging, run supabase/migrations/026_payment_method.sql in Supabase."