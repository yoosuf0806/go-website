-- 031_finance_role.sql
--
-- Add a dedicated 'finance' role for the ops dashboard.
--
-- Goal: a separate login (its own email + password) that can use the whole
-- ops/finance dashboard but CANNOT touch the storefront — no products, prices,
-- orders management, vouchers or settings. Safe to hand to a co-founder /
-- accountant (e.g. Fariha, Husni) without giving them shop control.
--
-- How the walls work:
--   * A finance user has a profiles row with role = 'finance'.
--   * is_admin() (migration 027) returns TRUE only for role = 'admin' (or the
--     legacy no-row accounts), so a finance user is NOT an admin — every
--     storefront admin policy (gated on is_admin()) denies them automatically.
--   * The orders / order_items "staff read" policies already allow any
--     authenticated user to SELECT, so finance can read the live B2C sales the
--     dashboard needs — read-only; writes there stay admin-only.
--   * The ops_* tables are re-gated below on can_view_ops(), which allows both
--     admin and finance (and legacy no-row admins).
--
-- Idempotent: safe to re-run.

-- ── Allow the new role value on profiles ────────────────────────────────────
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles
  add constraint profiles_role_check check (role in ('admin', 'kitchen', 'finance'));

-- ── Ops-viewer helper (admin OR finance; legacy no-row = admin) ─────────────
-- SECURITY DEFINER so it reads profiles without tripping that table's RLS,
-- mirroring is_admin().
create or replace function can_view_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from profiles where id = auth.uid()) in ('admin', 'finance'),
    auth.uid() is not null
  );
$$;

revoke execute on function can_view_ops() from public;
grant execute on function can_view_ops() to anon, authenticated;

-- ── Re-gate every ops_* table on can_view_ops() ─────────────────────────────
-- (029 created these policies gated on is_admin(); widen them to include
-- finance. Admins are unaffected — they satisfy both predicates.)
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

-- ── How to create the finance login ─────────────────────────────────────────
-- 1. Supabase Dashboard → Authentication → Users → "Add user": set the finance
--    email + password (this is the separate username/password).
-- 2. Then run (replace the email):
--
--      insert into profiles (id, role)
--      select id, 'finance' from auth.users where email = 'finance@goldenoven.lk'
--      on conflict (id) do update set role = 'finance';
--
-- That account can now sign in to the ops dashboard and nowhere else sensitive.
