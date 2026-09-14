-- 051_whatsapp_payment_method.sql
--
-- Allow 'whatsapp' as an order payment method.
--
-- Migration 026 added orders.payment_method with a CHECK limiting it to
-- 'bank_transfer' | 'card'. The storefront checkout now offers a third option,
-- "Pay with WhatsApp": the customer places the order and is handed a WhatsApp
-- deep-link to the business, pre-filled with their order summary and a request
-- for payment details. The order is stored with payment_method = 'whatsapp' and
-- lands unpaid (create_order's non-bank branch), so it stays OUT of the kitchen
-- (kitchenVisible gate) until an admin confirms payment was received — exactly
-- like a bank transfer, minus the uploaded slip.
--
-- This only widens the CHECK constraint; create_order() is unchanged (whatsapp
-- flows through its existing else → 'unpaid' path), so no function is replaced.
--
-- Idempotent: safe to re-run.

alter table orders drop constraint if exists orders_payment_method_check;
alter table orders
  add constraint orders_payment_method_check
  check (payment_method in ('bank_transfer', 'card', 'whatsapp'));
