#!/usr/bin/env bash
# apply_checkout_redesign.sh
# Run from the repo root in your Codespace, on a fresh branch off main:
#
#   git checkout main && git pull
#   git checkout -b claude/trustbar-reorder-checkout-redesign
#   bash apply_checkout_redesign.sh
#   git add -A && git commit -m "feat(checkout): redesign checkout to match new mockup + Gift toggle; reorder Home trust bar"
#   git push -u origin claude/trustbar-reorder-checkout-redesign
#
# Then open the PR at:
#   https://github.com/yoosuf0806/go-website/compare/main...claude/trustbar-reorder-checkout-redesign
#
# *** After merging, apply supabase/migrations/024_gift_recipient.sql
# *** in the Supabase SQL editor, then verify:
#   select column_name from information_schema.columns
#   where table_name = 'orders' and column_name in ('is_gift','recipient_name','recipient_phone');
#
# setup.sql was also brought up to date in this PR (it was missing the
# gift_vouchers table + voucher columns from migrations 021/022, plus
# now the new gift/recipient fields) — no action needed for your live
# database from that part, it only matters for a fresh one-shot setup.

set -euo pipefail

PATCH_FILE="$(mktemp)"
cat > "$PATCH_FILE" << 'PATCH_EOF'
diff --git a/src/components/admin/ConvertToOrderModal.tsx b/src/components/admin/ConvertToOrderModal.tsx
index d618418..50b507a 100644
--- a/src/components/admin/ConvertToOrderModal.tsx
+++ b/src/components/admin/ConvertToOrderModal.tsx
@@ -39,6 +39,7 @@ export default function ConvertToOrderModal({
     address: '',
     deliveryDate: inquiry.event_date ?? '',
     note: inquiry.message ?? '',
+    isGift: false,
   })
   const [rows, setRows] = useState<LineRow[]>([
     { productId: products[0]?.id ?? '', packageId: packages[0]?.id ?? '', boxQty: 1 },
diff --git a/src/components/storefront/CheckoutModal.tsx b/src/components/storefront/CheckoutModal.tsx
index 73fd5aa..f5d1602 100644
--- a/src/components/storefront/CheckoutModal.tsx
+++ b/src/components/storefront/CheckoutModal.tsx
@@ -18,6 +18,9 @@ const emptyForm: CheckoutDetails = {
   address: '',
   deliveryDate: '',
   note: '',
+  isGift: false,
+  recipientName: '',
+  recipientPhone: '',
 }
 
 interface CheckoutModalProps {
@@ -91,6 +94,9 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
           address: details.address,
           deliveryDate: details.deliveryDate,
           note: details.note,
+          isGift: details.isGift,
+          recipientName: details.recipientName,
+          recipientPhone: details.recipientPhone ? normalizePhone(details.recipientPhone) : null,
         },
         voucher: appliedVoucher,
       })
@@ -113,19 +119,30 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
     <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
       <button aria-label="Close checkout" className="absolute inset-0 bg-black/40" onClick={onClose} />
       <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
-        {/* Sticky header */}
-        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4 sm:px-6">
-          <h2 className="font-display text-lg text-navy">
-            {successOrderNo != null ? 'Order confirmed' : step === 'details' ? 'Checkout' : 'Review your order'}
-          </h2>
-          <button
-            type="button"
-            onClick={onClose}
-            aria-label="Close"
-            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
-          >
-            ✕
-          </button>
+        {/* Branded header + step tracker */}
+        <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white">
+          <div className="flex items-center justify-between px-5 py-3.5 sm:px-6">
+            <span className="font-display text-lg font-extrabold text-pink">Golden Oven</span>
+            <button
+              type="button"
+              onClick={onClose}
+              aria-label="Close"
+              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
+            >
+              ✕
+            </button>
+          </div>
+          {successOrderNo == null && (
+            <div className="flex items-center justify-center gap-2 pb-4">
+              <StepDot label="Cart" state="done" />
+              <StepLine done />
+              <StepDot label="Details" state={step === 'details' ? 'active' : 'done'} icon="📋" />
+              <StepLine done={step === 'review'} />
+              <StepDot label="Review" state={step === 'review' ? 'active' : 'upcoming'} icon="🔍" />
+              <StepLine />
+              <StepDot label="WhatsApp" state="upcoming" icon="💬" />
+            </div>
+          )}
         </div>
 
         <div className="px-5 py-5 pb-safe sm:px-6">
@@ -149,10 +166,72 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
             </div>
           ) : step === 'details' ? (
             <>
+              <h2 className="font-display text-lg text-navy">Checkout</h2>
+
+              {/* ── Gift / For me toggle ────────────────────────── */}
+              <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200">
+                <button
+                  type="button"
+                  onClick={() => set({ isGift: false })}
+                  className={`flex flex-col items-center gap-1 px-3 py-3.5 text-sm font-bold transition-colors ${
+                    !form.isGift ? 'bg-pink text-white' : 'text-navy hover:bg-neutral-50'
+                  }`}
+                >
+                  <span className="text-lg">🙂</span>
+                  It's for me
+                </button>
+                <button
+                  type="button"
+                  onClick={() => set({ isGift: true })}
+                  className={`flex flex-col items-center gap-1 border-l border-neutral-200 px-3 py-3.5 text-sm font-bold transition-colors ${
+                    form.isGift ? 'bg-pink text-white' : 'text-navy hover:bg-neutral-50'
+                  }`}
+                >
+                  <span className="text-lg">🎁</span>
+                  It's a gift
+                </button>
+              </div>
+
+              {form.isGift && (
+                <section className="mt-5 rounded-xl border border-neutral-200 p-4">
+                  <CardTitle icon="🎁" title="Recipient Information" />
+                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
+                    <Field label="Recipient's name" error={errors.recipientName} required>
+                      <Input
+                        type="text"
+                        placeholder="Full name"
+                        value={form.recipientName ?? ''}
+                        invalid={!!errors.recipientName}
+                        onChange={(e) => set({ recipientName: e.target.value })}
+                      />
+                    </Field>
+                    <Field label="Recipient's phone" error={errors.recipientPhone} required>
+                      <Input
+                        type="tel"
+                        placeholder="07X XXX XXXX"
+                        value={form.recipientPhone ?? ''}
+                        invalid={!!errors.recipientPhone}
+                        onChange={(e) => set({ recipientPhone: e.target.value })}
+                      />
+                    </Field>
+                  </div>
+                </section>
+              )}
+
               {/* ── Contact ─────────────────────────────────────── */}
-              <section>
-                <h3 className="font-display text-base text-navy">Contact</h3>
+              <section className="mt-5 rounded-xl border border-neutral-200 p-4">
+                <CardTitle icon="👤" title="Contact" />
                 <div className="mt-3 flex flex-col gap-3">
+                  <Field label="Full name" error={errors.name} required>
+                    <Input
+                      type="text"
+                      autoComplete="name"
+                      placeholder="Your name"
+                      value={form.name}
+                      invalid={!!errors.name}
+                      onChange={(e) => set({ name: e.target.value })}
+                    />
+                  </Field>
                   <Field label="Email" error={errors.email} required>
                     <Input
                       type="email"
@@ -189,19 +268,9 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
               </section>
 
               {/* ── Delivery ────────────────────────────────────── */}
-              <section className="mt-6">
-                <h3 className="font-display text-base text-navy">Delivery</h3>
+              <section className="mt-5 rounded-xl border border-neutral-200 p-4">
+                <CardTitle icon="📍" title="Address Details" />
                 <div className="mt-3 flex flex-col gap-3">
-                  <Field label="Full name" error={errors.name} required>
-                    <Input
-                      type="text"
-                      autoComplete="name"
-                      placeholder="Your name"
-                      value={form.name}
-                      invalid={!!errors.name}
-                      onChange={(e) => set({ name: e.target.value })}
-                    />
-                  </Field>
                   <Field label="Delivery address" error={errors.address} required>
                     <textarea
                       rows={2}
@@ -243,7 +312,8 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
             </>
           ) : (
             <>
-              <ul className="flex flex-col gap-3">
+              <h2 className="font-display text-lg text-navy">Review your order</h2>
+              <ul className="mt-4 flex flex-col gap-3">
                 {items.map((item) => (
                   <li key={item.key} className="text-sm">
                     <div className="flex justify-between">
@@ -299,6 +369,12 @@ export default function CheckoutModal({ onClose }: CheckoutModalProps) {
                   </div>
                   <div>✉️ {details.email}</div>
                   <div>📍 {details.address}</div>
+                  {details.isGift && (
+                    <div className="mt-2 border-t border-neutral-200 pt-2">
+                      <span className="font-semibold text-pink">🎁 Gift for:</span> {details.recipientName}
+                      {details.recipientPhone ? ` · 📞 ${details.recipientPhone}` : ''}
+                    </div>
+                  )}
                 </div>
               )}
 
@@ -373,3 +449,45 @@ function Field({
     </label>
   )
 }
+
+function CardTitle({ icon, title }: { icon: string; title: string }) {
+  return (
+    <div className="flex items-center gap-2.5">
+      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-light text-sm">{icon}</span>
+      <h3 className="font-display text-base text-navy">{title}</h3>
+    </div>
+  )
+}
+
+function StepDot({
+  label,
+  state,
+  icon,
+}: {
+  label: string
+  state: 'done' | 'active' | 'upcoming'
+  icon?: string
+}) {
+  return (
+    <div className="flex flex-col items-center gap-1">
+      <div
+        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
+          state === 'done'
+            ? 'bg-pink text-white'
+            : state === 'active'
+              ? 'bg-pink text-white shadow-[0_0_0_3px_rgba(217,45,86,0.25)]'
+              : 'bg-neutral-100 text-neutral-400'
+        }`}
+      >
+        {state === 'done' ? '✓' : icon}
+      </div>
+      <span className={`text-[10px] font-semibold ${state === 'upcoming' ? 'text-neutral-400' : 'text-navy'}`}>
+        {label}
+      </span>
+    </div>
+  )
+}
+
+function StepLine({ done = false }: { done?: boolean }) {
+  return <div className={`mb-3.5 h-0.5 w-6 rounded ${done ? 'bg-pink' : 'bg-neutral-200'}`} />
+}
diff --git a/src/lib/adminOrders.ts b/src/lib/adminOrders.ts
index b32ea73..cd178c0 100644
--- a/src/lib/adminOrders.ts
+++ b/src/lib/adminOrders.ts
@@ -27,6 +27,9 @@ export interface AdminOrder {
   address: string | null
   delivery_date: string | null
   note: string | null
+  is_gift?: boolean
+  recipient_name?: string | null
+  recipient_phone?: string | null
   subtotal: number
   delivery_fee: number
   total: number
@@ -46,7 +49,7 @@ export async function fetchOrders(filters: OrderFilters = {}): Promise<AdminOrde
   let query = supabase
     .from('orders')
     .select(
-      'id, order_no, status, customer_name, phone, email, alt_phone, address, delivery_date, note, subtotal, delivery_fee, total, total_pieces, source, created_at, order_items(id, product_name, package_label, piece_count, box_qty, unit_price, addons, line_total)',
+      'id, order_no, status, customer_name, phone, email, alt_phone, address, delivery_date, note, is_gift, recipient_name, recipient_phone, subtotal, delivery_fee, total, total_pieces, source, created_at, order_items(id, product_name, package_label, piece_count, box_qty, unit_price, addons, line_total)',
     )
     .order('created_at', { ascending: false })
 
diff --git a/src/lib/orderSlip.ts b/src/lib/orderSlip.ts
index 69e110c..5a46226 100644
--- a/src/lib/orderSlip.ts
+++ b/src/lib/orderSlip.ts
@@ -52,6 +52,13 @@ export function buildOrderSlipHtml(order: AdminOrder): string {
   if (order.address) meta.push(`<div><strong>Address:</strong> ${esc(order.address)}</div>`)
   if (order.delivery_date)
     meta.push(`<div><strong>Delivery:</strong> ${esc(formatDate(order.delivery_date))}</div>`)
+  if (order.is_gift) {
+    meta.push(
+      `<div><strong>🎁 Gift for:</strong> ${esc(order.recipient_name || '—')}${
+        order.recipient_phone ? ` · ${esc(order.recipient_phone)}` : ''
+      }</div>`,
+    )
+  }
   if (order.note) meta.push(`<div><strong>Note:</strong> ${esc(order.note)}</div>`)
 
   return `<!doctype html>
diff --git a/src/lib/orders.ts b/src/lib/orders.ts
index 4fa6852..411fe2c 100644
--- a/src/lib/orders.ts
+++ b/src/lib/orders.ts
@@ -66,6 +66,9 @@ export async function createOrder({ items, totals, details, voucher }: CreateOrd
       p_items: orderItemsPayload(items),
       p_voucher_code: voucher?.code ?? null,
       p_voucher_discount: voucher?.discount ?? 0,
+      p_is_gift: details.isGift ?? false,
+      p_recipient_name: details.isGift ? details.recipientName || null : null,
+      p_recipient_phone: details.isGift && details.recipientPhone ? normalizePhone(details.recipientPhone) : null,
     })
     .single()
 
diff --git a/src/lib/whatsapp.ts b/src/lib/whatsapp.ts
index b3796f9..97a9e07 100644
--- a/src/lib/whatsapp.ts
+++ b/src/lib/whatsapp.ts
@@ -14,6 +14,9 @@ export interface OrderCustomer {
   address?: string
   deliveryDate?: string | null
   note?: string
+  isGift?: boolean
+  recipientName?: string | null
+  recipientPhone?: string | null
 }
 
 export interface OrderMessageInput {
@@ -91,6 +94,9 @@ export function buildOrderMessage(input: OrderMessageInput): string {
   if (customer.email) lines.push(`✉️ ${customer.email}`)
   if (customer.address) lines.push(`📍 ${customer.address}`)
   if (customer.deliveryDate) lines.push(`🗓 Delivery: ${formatDate(customer.deliveryDate)}`)
+  if (customer.isGift && customer.recipientName) {
+    lines.push(`🎁 Gift for: ${customer.recipientName}${customer.recipientPhone ? ` | 📞 ${customer.recipientPhone}` : ''}`)
+  }
   if (customer.note) lines.push(`📝 ${customer.note}`)
 
   return lines.join('\n')
diff --git a/src/pages/Home.tsx b/src/pages/Home.tsx
index 347be3d..0280e9a 100644
--- a/src/pages/Home.tsx
+++ b/src/pages/Home.tsx
@@ -82,17 +82,28 @@ export default function Home() {
         </section>
       )}
 
+      {/* TRUST BAR */}
+      {vis.trust !== false && (
+      <div className="bg-warmgray py-7">
+        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
+          {trust.map((t) => (
+            <Trust key={t.title} icon={t.icon} title={t.title} body={t.body} />
+          ))}
+        </div>
+      </div>
+      )}
+
       {/* HOT PICKS — admin-flagged featured products, directly below the hero */}
       {vis.hotPicks !== false && hotPicks.length > 0 && (
-        <section className="bg-white px-6 py-20">
+        <section className="bg-white px-6 py-14">
           <div className="mx-auto max-w-6xl">
             <SectionHeader title="Hot Picks 🔥" sub="Our most-loved brownies right now." />
-            <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
+            <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
               {hotPicks.map((product) => (
                 <ProductTile key={product.id} product={product} packages={packages} />
               ))}
             </div>
-            <div className="mt-10 text-center">
+            <div className="mt-8 text-center">
               <Link
                 to="/shop"
                 className="inline-block rounded-full border-2 border-navy px-7 py-3.5 text-[15px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
@@ -104,22 +115,11 @@ export default function Home() {
         </section>
       )}
 
-      {/* TRUST BAR */}
-      {vis.trust !== false && (
-      <div className="bg-warmgray py-10">
-        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
-          {trust.map((t) => (
-            <Trust key={t.title} icon={t.icon} title={t.title} body={t.body} />
-          ))}
-        </div>
-      </div>
-      )}
-
       {/* SLIDESHOW */}
       {vis.slideshow !== false && <Slideshow promoSlides={content.promoSlides} />}
 
       {/* SLAB SPOTLIGHT — "Say It With a Brownie Slab" */}
-      <section className="bg-warmgray px-6 py-24">
+      <section className="bg-warmgray px-6 py-16">
         <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
           <div
             className="aspect-square rounded-[20px] bg-navy bg-cover bg-center shadow-[0_30px_60px_rgba(26,10,0,0.2)]"
@@ -159,7 +159,7 @@ export default function Home() {
 
       {/* FLAVOUR GRID — "Pick Your Flavour" */}
       {flavourGrid.length > 0 && (
-        <section className="bg-white px-6 py-24">
+        <section className="bg-white px-6 py-16">
           <div className="mx-auto max-w-6xl">
             <SectionHeader title="Pick Your Flavour 🍫" sub="Every brownie baked fresh. Never pre-made, never sitting." />
             <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
@@ -181,7 +181,7 @@ export default function Home() {
 
       {/* CATEGORY GRID */}
       {vis.categories !== false && (
-      <section className="bg-warmgray px-6 py-24">
+      <section className="bg-warmgray px-6 py-16">
         <div className="mx-auto max-w-6xl">
           <SectionHeader
             title="Find Your Perfect Box"
@@ -206,7 +206,7 @@ export default function Home() {
       )}
 
       {/* CORPORATE / BULK ORDERS CTA — split image + copy */}
-      <section className="bg-white px-6 py-24">
+      <section className="bg-white px-6 py-16">
         <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
           <div>
             <span className="inline-block rounded-full bg-pink-light px-4 py-1.5 text-xs font-bold tracking-wide text-pink">
@@ -235,7 +235,7 @@ export default function Home() {
 
       {/* CTA BANNER */}
       {vis.ctaBanner !== false && (
-      <section className="bg-warmgray px-6 py-20 text-center">
+      <section className="bg-warmgray px-6 py-14 text-center">
         <h2 className="text-[clamp(2rem,4vw,3.5rem)] text-navy">{ctaBanner.title}</h2>
         <p className="mx-auto mt-4 max-w-md text-lg text-neutral-500">{ctaBanner.body}</p>
         <Link
@@ -249,7 +249,7 @@ export default function Home() {
 
       {/* HOW IT WORKS */}
       {vis.howItWorks !== false && (
-      <section className="bg-white px-6 py-24">
+      <section className="bg-white px-6 py-16">
         <div className="mx-auto max-w-6xl">
           <SectionHeader title="How It Works" sub="From box to door in 4 simple steps." />
           <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
@@ -263,7 +263,7 @@ export default function Home() {
 
       {/* TESTIMONIALS */}
       {vis.testimonials !== false && reviews_section && featuredReviews.length > 0 && (
-        <section className="bg-warmgray px-6 py-24">
+        <section className="bg-warmgray px-6 py-16">
           <div className="mx-auto max-w-6xl">
             <SectionHeader title={testimonialsHeading.title} sub={testimonialsHeading.sub} />
             <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
diff --git a/src/pages/admin/Orders.tsx b/src/pages/admin/Orders.tsx
index 8169d5f..3adc60b 100644
--- a/src/pages/admin/Orders.tsx
+++ b/src/pages/admin/Orders.tsx
@@ -166,6 +166,14 @@ function OrderRow({
           <div>{order.customer_name}</div>
           <div className="text-xs text-neutral-500">{order.phone}</div>
           <div className="mt-1 flex flex-wrap gap-1.5">
+            {order.is_gift && (
+              <span
+                className="inline-block rounded-full bg-pink-light px-2 py-0.5 text-xs font-medium text-pink"
+                title={`Gift${order.recipient_name ? ` for ${order.recipient_name}` : ''}`}
+              >
+                🎁 Gift
+              </span>
+            )}
             {hasTopper && (
               <span
                 className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
@@ -288,6 +296,12 @@ function OrderRow({
                     {order.alt_phone && <span className="text-neutral-500"> · alt {order.alt_phone}</span>}
                   </div>
                   {order.email && <div>✉️ {order.email}</div>}
+                  {order.is_gift && (
+                    <div className="mt-1 rounded bg-pink-light px-2 py-1 text-pink">
+                      🎁 Gift for: {order.recipient_name || '—'}
+                      {order.recipient_phone && ` · 📞 ${order.recipient_phone}`}
+                    </div>
+                  )}
                   {order.note && (
                     <div className="mt-1 rounded bg-white px-2 py-1 text-neutral-600">
                       <span className="font-medium">Note:</span> {order.note}
diff --git a/src/schemas/checkout.ts b/src/schemas/checkout.ts
index 51c352a..fdae9f9 100644
--- a/src/schemas/checkout.ts
+++ b/src/schemas/checkout.ts
@@ -31,6 +31,24 @@ export const checkoutDetailsSchema = z.object({
   address: z.string().trim().min(1, 'Delivery address is required').max(500),
   deliveryDate: z.string().trim().min(1, 'Delivery date is required'),
   note: z.string().trim().max(300, 'Max 300 characters').optional(),
+  isGift: z.boolean().default(false),
+  recipientName: z.string().trim().max(100).optional(),
+  recipientPhone: z.string().trim().max(20).optional(),
 })
+  .superRefine((data, ctx) => {
+    if (!data.isGift) return
+    if (!data.recipientName?.trim()) {
+      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recipientName'], message: "Recipient's name is required" })
+    }
+    if (!data.recipientPhone?.trim()) {
+      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recipientPhone'], message: "Recipient's phone is required" })
+    } else if (!normalizePhone(data.recipientPhone)) {
+      ctx.addIssue({
+        code: z.ZodIssueCode.custom,
+        path: ['recipientPhone'],
+        message: 'Enter a valid Sri Lankan phone number',
+      })
+    }
+  })
 
 export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>
diff --git a/supabase/migrations/024_gift_recipient.sql b/supabase/migrations/024_gift_recipient.sql
new file mode 100644
index 0000000..8dd3041
--- /dev/null
+++ b/supabase/migrations/024_gift_recipient.sql
@@ -0,0 +1,102 @@
+-- 024_gift_recipient.sql
+-- "Is this a gift?" toggle on checkout (spec: new Recipient Information card,
+-- shown only when the order is a gift). Recipient name/phone are separate from
+-- the orderer's own contact fields — the person paying isn't necessarily the
+-- person receiving. All three are nullable/optional; existing orders are
+-- unaffected (is_gift defaults false).
+
+alter table orders
+  add column if not exists is_gift boolean not null default false,
+  add column if not exists recipient_name text,
+  add column if not exists recipient_phone text;
+
+drop function if exists create_order(
+  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb, text, numeric
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
+  p_recipient_phone text default null
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
+begin
+  if v_code is not null then
+    select * into v_voucher from gift_vouchers where code = v_code for update;
+
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
+    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone
+  )
+  values (
+    p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
+    p_address, p_delivery_date, p_note,
+    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null,
+    v_code, coalesce(p_voucher_discount, 0),
+    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, '')
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
+  text, numeric, boolean, text, text
+) to anon, authenticated;
diff --git a/supabase/setup.sql b/supabase/setup.sql
index 86a1812..330ab06 100644
--- a/supabase/setup.sql
+++ b/supabase/setup.sql
@@ -109,6 +109,11 @@ create table if not exists orders (
   total_pieces int not null,
   source text not null default 'web',
   inquiry_id uuid,
+  voucher_code text,
+  voucher_discount numeric(10,2) not null default 0,
+  is_gift boolean not null default false,
+  recipient_name text,
+  recipient_phone text,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );
@@ -128,6 +133,19 @@ create table if not exists order_items (
   line_total numeric(10,2) not null
 );
 
+-- Admin-defined gift vouchers, redeemable once at storefront checkout for a
+-- flat discount off the order total. Only touched by admin CRUD and the two
+-- RPCs below — no direct anon table access.
+create table if not exists gift_vouchers (
+  id uuid primary key default uuid_generate_v4(),
+  code text not null unique,
+  amount numeric(10,2) not null check (amount > 0),
+  is_active boolean not null default true,
+  used_at timestamptz,
+  used_by_order_id uuid references orders(id) on delete set null,
+  created_at timestamptz not null default now()
+);
+
 create table if not exists inquiries (
   id uuid primary key default uuid_generate_v4(),
   category inquiry_category not null,
@@ -219,6 +237,16 @@ alter table reviews        enable row level security;
 alter table orders         enable row level security;
 alter table order_items    enable row level security;
 alter table inquiries      enable row level security;
+alter table gift_vouchers  enable row level security;
+
+-- Admin (any authenticated user, matching this project's v1 "any authenticated
+-- user is an admin" model) has full CRUD on vouchers. No anon policy — anon
+-- only ever interacts through validate_gift_voucher() / create_order() below.
+drop policy if exists "gift_vouchers_admin_all" on gift_vouchers;
+create policy "gift_vouchers_admin_all" on gift_vouchers
+  for all
+  using (auth.role() = 'authenticated')
+  with check (auth.role() = 'authenticated');
 
 -- Public reads of visible/active catalogue rows.
 drop policy if exists "public read visible categories" on categories;
@@ -294,24 +322,49 @@ create policy "admin manage inquiries" on inquiries for all
 drop function if exists create_order(
   text, text, text, date, text, numeric, numeric, numeric, int, jsonb
 );
+drop function if exists create_order(
+  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb, text, numeric
+);
 create or replace function create_order(
   p_customer_name text, p_phone text, p_email text, p_alt_phone text,
   p_address text, p_delivery_date date, p_note text,
-  p_subtotal numeric, p_delivery_fee numeric, p_total numeric, p_total_pieces int, p_items jsonb
+  p_subtotal numeric, p_delivery_fee numeric, p_total numeric, p_total_pieces int, p_items jsonb,
+  p_voucher_code text default null, p_voucher_discount numeric default 0,
+  p_is_gift boolean default false, p_recipient_name text default null, p_recipient_phone text default null
 )
 returns table (id uuid, order_no int)
 language plpgsql security definer set search_path = public as $$
-declare v_id uuid; v_order_no int;
+declare
+  v_id uuid; v_order_no int;
+  v_code text := nullif(upper(trim(coalesce(p_voucher_code, ''))), '');
+  v_voucher gift_vouchers%rowtype;
 begin
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
   insert into orders (
     customer_name, phone, email, alt_phone, address, delivery_date, note,
-    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id
+    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id,
+    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone
   ) values (
     p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
     p_address, p_delivery_date, p_note,
-    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null
+    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null,
+    v_code, coalesce(p_voucher_discount, 0),
+    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, '')
   ) returning orders.id, orders.order_no into v_id, v_order_no;
 
+  if v_code is not null then
+    update gift_vouchers set used_at = now(), used_by_order_id = v_id where code = v_code;
+  end if;
+
   insert into order_items (
     order_id, product_id, product_name, package_id, package_label,
     piece_count, box_qty, unit_price, addons, line_total
@@ -332,9 +385,31 @@ begin
 end; $$;
 
 grant execute on function create_order(
-  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb
+  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
+  text, numeric, boolean, text, text
 ) to anon, authenticated;
 
+-- Read-only "is this code valid?" check for the checkout Apply button.
+-- Actual redemption happens atomically inside create_order() above.
+create or replace function validate_gift_voucher(p_code text)
+returns table (status text, amount numeric)
+language plpgsql security definer set search_path = public as $$
+declare v gift_vouchers%rowtype;
+begin
+  select * into v from gift_vouchers where code = upper(trim(p_code));
+  if not found or not v.is_active then
+    return query select 'invalid'::text, null::numeric;
+    return;
+  end if;
+  if v.used_at is not null then
+    return query select 'used'::text, null::numeric;
+    return;
+  end if;
+  return query select 'ok'::text, v.amount;
+end; $$;
+
+grant execute on function validate_gift_voucher(text) to anon, authenticated;
+
 -- ============================================================================
 -- Part B (OPTIONAL) — demo catalogue. Delete this block to start empty and add
 -- your own products via the admin panel instead.
PATCH_EOF

git apply "$PATCH_FILE"
rm -f "$PATCH_FILE"

echo "Applied. Files changed:"
echo "  - supabase/migrations/024_gift_recipient.sql (new)"
echo "  - supabase/setup.sql"
echo "  - src/schemas/checkout.ts"
echo "  - src/lib/orders.ts"
echo "  - src/lib/whatsapp.ts"
echo "  - src/lib/adminOrders.ts"
echo "  - src/lib/orderSlip.ts"
echo "  - src/components/storefront/CheckoutModal.tsx"
echo "  - src/components/admin/ConvertToOrderModal.tsx"
echo "  - src/pages/admin/Orders.tsx"
echo "  - src/pages/Home.tsx"
