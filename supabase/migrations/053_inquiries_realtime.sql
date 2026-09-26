-- 053_inquiries_realtime.sql
--
-- Enable Supabase Realtime for the inquiries table so the admin PWA is notified
-- the moment a new wedding/corporate inquiry is submitted from the website —
-- the same free OS-notification path migration 047 set up for orders.
--
-- Realtime honours RLS: the admin session (is_admin) has the "admin manage
-- inquiries" ALL policy (migration 027) so it can SELECT inquiries and therefore
-- receive INSERT events; anon/customers cannot.
--
-- Idempotent.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inquiries'
  ) then
    alter publication supabase_realtime add table inquiries;
  end if;
end $$;
