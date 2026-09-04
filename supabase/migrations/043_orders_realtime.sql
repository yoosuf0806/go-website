-- 043_orders_realtime.sql
--
-- Enable Supabase Realtime for the orders table so the admin PWA can be
-- notified of new orders the moment they're placed (free OS notifications while
-- the installed app is open/backgrounded — no push server needed).
--
-- Realtime only streams changes for tables in the `supabase_realtime`
-- publication, and it still honours RLS: the admin session (authenticated) can
-- SELECT orders via the "staff read orders" policy (migration 027), so it
-- receives INSERT events; anon/customers do not.
--
-- Idempotent.

do $$
begin
  -- The publication exists by default on Supabase; create it for a from-scratch
  -- or self-hosted database so this migration is self-sufficient.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;
