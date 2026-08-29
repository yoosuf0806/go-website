-- 040_quote_flavors_legacy.sql
--
-- Reconciles the committed schema with the live production database. The live DB
-- has a `quote_flavors` reference table and three extra `inquiries` columns
-- (flavor_id, flavor_name, piece_count) that were added by hand and never
-- captured in a committed migration. So a from-scratch rebuild (and the
-- consolidated schema) lacked them, and importing data from the live DB failed
-- with: relation "public.quote_flavors" does not exist.
--
-- quote_flavors predates the move to products-as-flavours and is no longer read
-- by the app (createQuote records the chosen flavour by name in
-- inquiries.flavor_name), but the table, its rows, and the inquiries.flavor_id
-- foreign key still exist in production, so they must be recreated to round-trip
-- the data.
--
-- Column types match the live schema exactly (verified against pg_attribute).
-- Idempotent: safe to re-run.

create table if not exists quote_flavors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  image_url text,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table quote_flavors enable row level security;

-- Reference table: public read, admin write (mirrors categories/products).
drop policy if exists "public read quote_flavors" on quote_flavors;
create policy "public read quote_flavors" on quote_flavors
  for select using (true);

drop policy if exists "admin all quote_flavors" on quote_flavors;
create policy "admin all quote_flavors" on quote_flavors
  for all using (is_admin()) with check (is_admin());

-- The three legacy columns on inquiries. flavor_id keeps its ON DELETE SET NULL
-- foreign key so removing a flavour never deletes the inquiry history.
alter table inquiries add column if not exists flavor_id uuid
  references quote_flavors (id) on delete set null;
alter table inquiries add column if not exists flavor_name text;
alter table inquiries add column if not exists piece_count integer;
