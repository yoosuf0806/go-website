-- ============================================================================
-- orders_wipe_and_reseed.sql
-- ----------------------------------------------------------------------------
-- Deletes ALL order data, then re-adds orders ONE AT A TIME from a template.
--
-- ⚠️  DESTRUCTIVE. This permanently removes every row in `orders` and
--     `order_items`. There is no undo. Take a Supabase backup / DB snapshot
--     first (Dashboard → Database → Backups), and ideally run STEP 1 inside the
--     transaction below so you can review the row counts before you COMMIT.
--
-- How to run:
--   Supabase Dashboard → SQL Editor → paste this file.
--   Run STEP 1 to wipe. Then, for each real order, copy the STEP 2 template,
--   fill in the values, and run it — that is the "re-add everything
--   individually" part.
--
-- What references orders (so the wipe order matters):
--   • order_items.order_id            → ON DELETE CASCADE  (auto-removed)
--   • gift_vouchers.used_by_order_id  → ON DELETE SET NULL (link cleared)
--   • inquiries.converted_order_id    → NO ACTION          (must clear first,
--                                        or the DELETE is blocked by the FK)
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 1 — WIPE ALL ORDER DATA                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Wrapped in a transaction: inspect the RAISE NOTICE counts in the output, and
-- if anything looks wrong, run `ROLLBACK;` instead of letting it COMMIT.
begin;

-- 1a. Detach inquiries that were converted into an order. inquiries.converted
--     _order_id has no ON DELETE rule, so leaving it set would block the delete.
--     Clearing it (and reverting the status) makes those inquiries look
--     un-converted again — remove the `status` line if you want to keep the
--     'converted' status on record.
update inquiries
   set converted_order_id = null,
       status = 'new'
 where converted_order_id is not null;

-- 1b. OPTIONAL — make redeemed gift vouchers reusable again. Wiping orders only
--     nulls their used_by_order_id link (ON DELETE SET NULL); the voucher still
--     reads as "used" because used_at stays set. Uncomment to fully reset them.
--     Leave commented if you want voucher redemption history preserved.
-- update gift_vouchers
--    set used_at = null,
--        used_by_order_id = null
--  where used_at is not null;

-- 1c. Delete the orders. order_items rows are removed automatically by the
--     ON DELETE CASCADE, but we delete them explicitly first so the counts are
--     visible and the intent is unambiguous.
do $$
declare
  v_items  bigint;
  v_orders bigint;
begin
  delete from order_items;              get diagnostics v_items  = row_count;
  delete from orders;                   get diagnostics v_orders = row_count;
  raise notice 'Deleted % order_items and % orders.', v_items, v_orders;
end $$;

-- 1d. Reset the order number counter so re-added orders start again at #1.
--     (Uses pg_get_serial_sequence so it works regardless of the sequence's
--     actual name.) Change the `1` if you want to resume from a specific number.
select setval(pg_get_serial_sequence('orders', 'order_no'), 1, false);

-- Review the notices above, then finish:
commit;
-- rollback;   -- ← run this INSTEAD of commit to abort the wipe.


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 2 — RE-ADD ONE ORDER (copy this block per order, fill in, run)       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Direct insert of a historical order plus its line items in one transaction.
-- Prefer this for re-entering past orders because it lets you set the status,
-- source and created_at exactly (the create_order() RPC always forces
-- status='pending', source='web' and created_at=now()). See STEP 2-ALT for the
-- RPC approach if you'd rather reproduce a fresh checkout.
--
-- Money math (keep consistent with the storefront's lib/pricing.ts):
--   line_total   = (unit_price * piece_count + Σ add-on prices) * box_qty
--                  (unit_price is the PER-PIECE price; add-ons are charged per box)
--   subtotal     = Σ line_total
--   total        = subtotal + delivery_fee - voucher_discount
--   total_pieces = Σ (piece_count * box_qty)
--
-- `addons` is a JSON array; use '[]'::jsonb when there are none. Example with
-- add-ons: '[{"id":"gift_ribbon","label":"Gift Ribbon","price":150}]'::jsonb
--
-- The values below are a worked example: one 9-piece box at Rs. 250/piece →
-- line_total = 250 * 9 = 2250; subtotal 2250 + delivery 580 = total 2830.

do $$
declare
  v_order_id uuid;
begin
  -- ── Order header ─────────────────────────────────────────────────────────
  insert into orders (
    customer_name, phone, email, alt_phone, address, delivery_date, note,
    subtotal, delivery_fee, total, total_pieces,
    status, source, payment_method, payment_status, created_at
    -- , order_no          -- optional: set a specific number instead of the next serial value
  ) values (
    'CUSTOMER NAME',        -- customer_name  (required)
    '07XXXXXXXX',           -- phone          (required)
    null,                   -- email
    null,                   -- alt_phone
    'Delivery address',     -- address
    null,                   -- delivery_date  e.g. '2026-08-20'
    null,                   -- note
    2250.00,                -- subtotal       = Σ line_total
    580.00,                 -- delivery_fee
    2830.00,                -- total          = subtotal + delivery_fee - voucher_discount
    9,                      -- total_pieces   = Σ (piece_count * box_qty)
    'completed',            -- status         pending|confirmed|baking|ready|out_for_delivery|completed|cancelled
    'manual',               -- source         'manual' marks a hand-entered order (vs 'web')
    null,                   -- payment_method 'bank_transfer' | 'card' | null
    'paid',                 -- payment_status unpaid|awaiting_verification|paid|failed
    now()                   -- created_at     set the real order date, e.g. '2026-07-01 10:30+05:30'
    -- , 1                  -- order_no (if you enabled the column above)
  )
  returning id into v_order_id;

  -- ── Line items (one INSERT ... VALUES row per line) ──────────────────────
  insert into order_items (
    order_id, product_id, product_name, package_id, package_label,
    piece_count, box_qty, unit_price, addons, line_total
  ) values
    (
      v_order_id,
      null,                              -- product_id: real products.id uuid, or null
      'Cashew Brownie',                  -- product_name
      'box-9',                           -- package_id: box-9 | box-12 | box-15 | slab-12 | slab-15
      '9 Pieces',                        -- package_label
      9,                                 -- piece_count
      1,                                 -- box_qty
      250.00,                            -- unit_price (PER PIECE)
      '[]'::jsonb,                       -- addons
      2250.00                            -- line_total = (250 * 9 + 0) * 1
    );
    -- , ( v_order_id, ... second line ... )   -- add more line rows here

  raise notice 'Inserted order % (order_no assigned automatically).', v_order_id;
end $$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 2-ALT — RE-ADD via the create_order() RPC (reproduces a checkout)     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Use this only if you want the order created exactly as a website checkout
-- would (status='pending', source='web', created_at=now()). Items are passed as
-- a JSON array. Returns the new id + order_no.
--
-- select * from create_order(
--   'CUSTOMER NAME',                 -- p_customer_name
--   '07XXXXXXXX',                    -- p_phone
--   null,                           -- p_email
--   null,                           -- p_alt_phone
--   'Delivery address',             -- p_address
--   null,                           -- p_delivery_date
--   null,                           -- p_note
--   2250.00,                        -- p_subtotal
--   580.00,                         -- p_delivery_fee
--   2830.00,                        -- p_total
--   9,                              -- p_total_pieces
--   '[{"product_id":null,"product_name":"Cashew Brownie","package_id":"box-9","package_label":"9 Pieces","piece_count":9,"box_qty":1,"unit_price":250.00,"addons":[],"line_total":2250.00}]'::jsonb
-- );
