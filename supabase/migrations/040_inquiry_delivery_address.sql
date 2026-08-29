-- 040_inquiry_delivery_address.sql
--
-- Delivery address for corporate/wedding quote requests.
--
-- The storefront quote form (Corporate + Wedding, QuoteLandingPage) only ever
-- captured a delivery DATE, never WHERE to deliver. Admins then had to chase
-- the address over WhatsApp before a quote could be turned into an order.
--
-- This adds an optional free-text delivery address so customers can supply it
-- up front. It is nullable — existing rows and any request that skips the field
-- stay valid — and it prefills the address when an inquiry is converted into an
-- order (ConvertToOrderModal).
alter table inquiries
  add column if not exists delivery_address text;
