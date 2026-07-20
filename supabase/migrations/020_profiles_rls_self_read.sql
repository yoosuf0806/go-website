-- 020_profiles_rls_self_read.sql
-- Fix: kitchen accounts were being redirected to /admin because useRole()'s
-- `select role from profiles where id = auth.uid()` came back empty under RLS
-- (migration 018 didn't grant authenticated users read access to their OWN
-- profile row), and the client silently falls back to 'admin' when the read
-- fails. Add the missing self-read policy — idempotent so it's safe even if
-- 018 already added something equivalent.
alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select
  using (auth.uid() = id);
