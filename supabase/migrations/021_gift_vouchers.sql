-- 021_gift_vouchers.sql
-- Admin-defined gift vouchers, redeemable once at storefront checkout for a
-- flat discount off the order total.
--
--   • gift_vouchers        — admin CRUD (authenticated), no direct anon access.
--   • validate_gift_voucher — anon-callable SECURITY DEFINER RPC used by the
--     checkout "Apply" button. Read-only: it reports whether a code is valid,
--     already used, or unknown, WITHOUT marking it used (that only happens
--     atomically inside create_order() — see migration 022 — so two
--     concurrent checkouts can't both redeem the same code).

create table gift_vouchers (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  amount numeric(10,2) not null check (amount > 0),
  is_active boolean not null default true,
  used_at timestamptz,
  used_by_order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table gift_vouchers enable row level security;

-- Admin (any authenticated user, matching this project's v1 "any authenticated
-- user is an admin" model) has full CRUD. No anon policy — anon only ever
-- interacts through the RPC below.
create policy "gift_vouchers_admin_all" on gift_vouchers
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create or replace function validate_gift_voucher(p_code text)
returns table (status text, amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v gift_vouchers%rowtype;
begin
  select * into v from gift_vouchers where code = upper(trim(p_code));

  if not found or not v.is_active then
    return query select 'invalid'::text, null::numeric;
    return;
  end if;

  if v.used_at is not null then
    return query select 'used'::text, null::numeric;
    return;
  end if;

  return query select 'ok'::text, v.amount;
end;
$$;

grant execute on function validate_gift_voucher(text) to anon, authenticated;
