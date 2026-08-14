-- 032_finance_role_enum_fix.sql
--
-- Fix for 031_finance_role.sql. On the deployed database `profiles.role` is a
-- Postgres ENUM (`app_role`), created outside the committed migrations, not the
-- text-with-CHECK column that migration 025 (and 031) assumed. So 031 failed
-- with: invalid input value for enum app_role: "finance".
--
-- This migration adds the 'finance' value the right way for whichever shape the
-- column actually has, then (re)creates can_view_ops() and re-gates the ops_*
-- tables. Enum-safe: it never coerces the literal 'finance' to the enum type in
-- the same statement/transaction that introduces it (can_view_ops compares
-- role::text), so it is safe to run as one script.
--
-- Idempotent: safe to re-run.

-- ── Allow the 'finance' role value, handling enum OR text column ─────────────
do $$
declare
  coltype text;
begin
  select t.typname into coltype
  from pg_attribute a
  join pg_type t on t.oid = a.atttypid
  where a.attrelid = 'public.profiles'::regclass
    and a.attname = 'role'
    and a.attnum > 0
    and not a.attisdropped;

  if coltype = 'text' then
    -- Text column with a CHECK constraint (the repo-fresh shape).
    alter table profiles drop constraint if exists profiles_role_check;
    alter table profiles
      add constraint profiles_role_check check (role in ('admin', 'kitchen', 'finance'));
  else
    -- Enum column (the deployed shape). Add the label if it is missing.
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = coltype and e.enumlabel = 'finance'
    ) then
      execute format('alter type %I add value %L', coltype, 'finance');
    end if;
  end if;
end $$;

-- ── Ops-viewer helper (admin OR finance; legacy no-row = admin) ─────────────
-- Compares role::text so it works whether the column is an enum or text, and
-- never coerces 'finance' to the enum type.
create or replace function can_view_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role::text from profiles where id = auth.uid()) in ('admin', 'finance'),
    auth.uid() is not null
  );
$$;

revoke execute on function can_view_ops() from public;
grant execute on function can_view_ops() to anon, authenticated;

-- ── Re-gate every ops_* table on can_view_ops() ─────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'ops_sales', 'ops_ad_spend', 'ops_purchases', 'ops_operating_expenses',
    'ops_monthly_targets', 'ops_b2b_pipeline', 'ops_recipes',
    'ops_recipe_ingredients', 'ops_shares', 'ops_investments'
  ] loop
    execute format('drop policy if exists %I on %I', 'admin all ' || t, t);
    execute format('drop policy if exists %I on %I', 'ops view ' || t, t);
    execute format(
      'create policy %I on %I for all using (can_view_ops()) with check (can_view_ops())',
      'ops view ' || t, t
    );
  end loop;
end $$;

-- ── Creating the finance login (run SEPARATELY, after this migration) ────────
-- The enum value must be committed before it can be used, so run the profile
-- insert as its own statement/run once this migration has completed:
--
--   insert into profiles (id, role)
--   select id, 'finance' from auth.users where email = 'finance@goldenoven.lk'
--   on conflict (id) do update set role = 'finance';
