-- 025_kitchen_profiles.sql
--
-- Root cause of "the kitchen portal isn't working": ProtectedRoute /
-- useRole() (frontend, already deployed) reads `profiles.role` to decide
-- whether a logged-in user is 'admin' or 'kitchen'. Migration 020 patched a
-- missing self-read RLS policy on that assumption `profiles` already
-- existed — but the table itself was never actually created by a committed
-- migration. On a database where it was never created by hand either,
-- `select role from profiles where id = auth.uid()` fails outright,
-- useRole() silently falls back to 'admin', and kitchen accounts get
-- redirected into the full Admin dashboard instead of the Kitchen Board.
--
-- This migration creates the table for real. Idempotent — safe to run even
-- if `profiles` (or migration 020's policy) already exists.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'kitchen')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Each signed-in user may read their own role (what useRole() queries).
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select
  using (auth.uid() = id);

-- Admin (any authenticated user, matching this project's v1 "any
-- authenticated user is an admin" model) can manage all profile rows — e.g.
-- to promote a teammate's account to 'kitchen' without touching SQL.
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- No profiles row is required for admin accounts — useRole() already
-- defaults to 'admin' when a row is missing. Only kitchen accounts need one:
--
--   insert into profiles (id, role)
--   select id, 'kitchen' from auth.users where email = 'kitchen@example.com';
