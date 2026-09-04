-- 046_legacy_columns_reconcile.sql
--
-- Final reconciliation of committed schema vs. the live production database,
-- found by diffing production's exact per-table column lists (the COPY headers
-- of a data-only pg_dump) against the rebuilt schema. These columns exist in
-- production but were never captured in a committed migration, so importing
-- that data into a fresh project failed a column at a time.
--
--   ops_sales.cust_no        -- legacy customer number carried over from the
--   ops_sales.contact_number    spreadsheet's B2C sheet (No.Cust / contact)
--   ops_sales.order_no          and a manual order reference.
--   profiles.display_name    -- optional display name on a profile.
--
-- Typed as nullable text: none are read by the app, and text accepts whatever
-- scalar the dump carries, so the import round-trips regardless of the source's
-- exact declared type. After this the schema is a superset of every column the
-- production data import writes.
--
-- Idempotent.

alter table ops_sales add column if not exists cust_no text;
alter table ops_sales add column if not exists contact_number text;
alter table ops_sales add column if not exists order_no text;

alter table profiles add column if not exists display_name text;
