-- 020_profiles_rls_self_read.sql
-- Fix: kitchen accounts were being redirected to /admin because useRole()'s
-- `select role from profiles where id = auth.uid()` came back empty under RLS
-- (migration 018 didn't grant authenticated users read access to their OWN
-- profile row), and the client silently falls back to 'admin' when the read
-- fails. Add the missing self-read policy — idempotent so it's safe even if
-- 018 already added something equivalent.
--
-- Ordering note: this migration predates 025, which is where `profiles` is
-- actually CREATED by a committed migration (before that the table existed
-- only on databases where it had been made by hand — see 025's header). On a
-- brand-new project the migrations run in numeric order, so 020 would hit
-- "relation profiles does not exist" and abort the whole chain. Creating the
-- table here if it's missing makes 020 self-sufficient; 025 is itself written
-- with `create table if not exists`, so it stays a no-op either way and the
-- column definition below is kept identical to it.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'kitchen')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select
  using (auth.uid() = id);
