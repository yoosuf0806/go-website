-- 048_kitchen_note.sql
--
-- Admin → kitchen note, per order.
--
-- The existing orders.note is the CUSTOMER's note (their delivery/gift request,
-- entered at checkout) and is shown to admin + kitchen as-is. This adds a
-- SEPARATE field the admin fills in for the kitchen: a private baking/prep
-- instruction ("double-box the fragile flavours", "customer called, add extra
-- ribbon", ...). The kitchen board renders it highlighted, distinct from the
-- customer note, so it can't be missed or confused with what the customer said.
--
-- Only the admin writes it (admin RLS on orders already covers UPDATE); the
-- kitchen reads it through the existing staff-read policy. Nullable, no default
-- — an order without an admin note simply has none.
--
-- Idempotent: safe to re-run.

alter table orders
  add column if not exists kitchen_note text;

comment on column orders.kitchen_note is
  'Private note from the admin to the kitchen for this order (baking/prep '
  'instruction). Distinct from orders.note, which is the customer''s own note. '
  'Shown highlighted on the kitchen board.';
