-- 026_payment_method.sql
--
-- Adds a payment step to checkout. Two methods at launch: bank transfer
-- (customer transfers manually, enters a reference, uploads a slip) and card
-- (PayHere — wired in a later PR). Payment state is modelled on a SEPARATE
-- axis from fulfilment `status`: an order can be `awaiting_verification` on
-- payment while still `pending` on fulfilment. This deliberately does NOT
-- touch the `order_status` enum, so the kitchen portal's "existing enum
-- values only" rule stays intact.
--
--   payment_method : 'bank_transfer' | 'card'   (null for legacy/whatsapp orders)
--   payment_status : 'unpaid' | 'awaiting_verification' | 'paid' | 'failed'
--   payment_ref    : customer-entered bank transfer reference number
--   slip_url       : object path in the private `bank-slips` bucket
--
-- All nullable / defaulted; existing orders are unaffected.

alter table orders
  add column if not exists payment_method text
    check (payment_method in ('bank_transfer', 'card')),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'awaiting_verification', 'paid', 'failed')),
  add column if not exists payment_ref text,
  add column if not exists slip_url text;

-- Editable bank-transfer details shown to customers on the Payment step.
-- Lives in site_settings so the account can change without a code deploy.
-- Seeded with the current business account; admin can edit later.
insert into site_settings (key, value)
values (
  'bank_transfer',
  '{"bank_name": "Nations Trust Bank", "account_name": "M N AHAMED", "account_no": "200520120714", "branch": "Mt Lavinia", "enabled": true}'::jsonb
)
on conflict (key) do nothing;

-- Allow the public storefront read of this new settings key (matches the
-- existing public-readable settings allow-list pattern).
drop policy if exists "site_settings_public_read" on site_settings;
create policy "site_settings_public_read" on site_settings
  for select
  using (key in ('banner', 'features', 'business', 'bank_transfer'));

-- ── Private bucket for bank slips ──────────────────────────────────────────
-- Slips are customer financial documents — NOT public like product-images.
-- Anon may upload (insert) so guests can attach a slip at checkout; only
-- authenticated admins may read them back (via signed URLs in Admin › Orders).
insert into storage.buckets (id, name, public)
values ('bank-slips', 'bank-slips', false)
on conflict (id) do nothing;

drop policy if exists "bank_slips_anon_insert" on storage.objects;
create policy "bank_slips_anon_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'bank-slips');

drop policy if exists "bank_slips_admin_read" on storage.objects;
create policy "bank_slips_admin_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'bank-slips');

-- ── Extend create_order with the payment fields ────────────────────────────
-- Drop the migration-024 signature, then recreate with three new trailing
-- params (defaulted, so callers that don't pass them still work).
drop function if exists create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
  text, numeric, boolean, text, text
);

create or replace function create_order(
  p_customer_name text,
  p_phone text,
  p_email text,
  p_alt_phone text,
  p_address text,
  p_delivery_date date,
  p_note text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_total_pieces int,
  p_items jsonb,
  p_voucher_code text default null,
  p_voucher_discount numeric default 0,
  p_is_gift boolean default false,
  p_recipient_name text default null,
  p_recipient_phone text default null,
  p_payment_method text default null,
  p_payment_ref text default null,
  p_slip_url text default null
)
returns table (id uuid, order_no int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_order_no int;
  v_code text := nullif(upper(trim(coalesce(p_voucher_code, ''))), '');
  v_voucher gift_vouchers%rowtype;
  -- Bank transfers land as awaiting_verification (admin checks the slip);
  -- card orders are marked paid by the PayHere callback in a later PR, so
  -- they start unpaid here; anything else (legacy) stays unpaid.
  v_payment_status text := case
    when p_payment_method = 'bank_transfer' then 'awaiting_verification'
    else 'unpaid'
  end;
begin
  if v_code is not null then
    select * into v_voucher from gift_vouchers where code = v_code for update;
    if not found or not v_voucher.is_active then
      raise exception 'VOUCHER_INVALID';
    end if;
    if v_voucher.used_at is not null then
      raise exception 'VOUCHER_USED';
    end if;
  end if;

  insert into orders (
    customer_name, phone, email, alt_phone, address, delivery_date, note,
    subtotal, delivery_fee, total, total_pieces, status, source, inquiry_id,
    voucher_code, voucher_discount, is_gift, recipient_name, recipient_phone,
    payment_method, payment_status, payment_ref, slip_url
  )
  values (
    p_customer_name, p_phone, nullif(p_email, ''), nullif(p_alt_phone, ''),
    p_address, p_delivery_date, p_note,
    p_subtotal, p_delivery_fee, p_total, p_total_pieces, 'pending', 'web', null,
    v_code, coalesce(p_voucher_discount, 0),
    coalesce(p_is_gift, false), nullif(p_recipient_name, ''), nullif(p_recipient_phone, ''),
    p_payment_method, v_payment_status, nullif(p_payment_ref, ''), nullif(p_slip_url, '')
  )
  returning orders.id, orders.order_no into v_id, v_order_no;

  if v_code is not null then
    update gift_vouchers
      set used_at = now(), used_by_order_id = v_id
      where code = v_code;
  end if;

  insert into order_items (
    order_id, product_id, product_name, package_id, package_label,
    piece_count, box_qty, unit_price, addons, line_total
  )
  select
    v_id,
    nullif(item->>'product_id', '')::uuid,
    item->>'product_name',
    item->>'package_id',
    item->>'package_label',
    (item->>'piece_count')::int,
    (item->>'box_qty')::int,
    (item->>'unit_price')::numeric,
    coalesce(item->'addons', '[]'::jsonb),
    (item->>'line_total')::numeric
  from jsonb_array_elements(p_items) as item;

  return query select v_id, v_order_no;
end;
$$;

grant execute on function create_order(
  text, text, text, text, text, date, text, numeric, numeric, numeric, int, jsonb,
  text, numeric, boolean, text, text, text, text, text
) to anon, authenticated;
