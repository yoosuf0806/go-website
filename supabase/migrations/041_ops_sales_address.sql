-- 041_ops_sales_address.sql
--
-- Another column present in the live database but never captured in a committed
-- migration: ops_sales.address. Found by diffing the live column inventory
-- against the rebuilt schema while migrating to a new Supabase project — a
-- data-only import of ops_sales failed because the target lacked this column.
--
-- Nullable text, matching how it exists in production (a free-text delivery
-- address on a manual B2B/offline sale; the ops app does not currently write
-- it, but rows carry it, so it must exist to round-trip the data).
--
-- Idempotent.

alter table ops_sales add column if not exists address text;
