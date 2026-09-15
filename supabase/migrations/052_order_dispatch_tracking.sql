-- 052_order_dispatch_tracking.sql
--
-- Delivery dispatch + tracking on an order.
--
-- When staff mark an order "out for delivery" they record which courier is
-- carrying it and its tracking handle, so the customer can be sent a dispatch
-- message with a tracking link:
--   * PromptXpress — a tracking NUMBER; the tracking page URL is fixed
--     (https://www.promptxpress.lk/TrackItem.aspx), so only the number is stored.
--   * PickMe Flash — a tracking URL entered by staff (PickMe hands out a link).
--
-- Columns (all nullable — an order only has them once dispatched):
--   delivery_provider  'promptxpress' | 'pickme_flash'
--   tracking_number    the PromptXpress number
--   tracking_url       the PickMe Flash link
--
-- dispatch_order() is a SECURITY DEFINER RPC callable by any authenticated staff
-- member (admin OR kitchen — the same trust level as advance_order_status from
-- migration 027, which also lets the kitchen move an order forward). It sets the
-- status to 'out_for_delivery' and stores the courier + tracking in one atomic
-- write, validating that the provider is known and the matching tracking field
-- is present. The customer WhatsApp message is sent client-side (a wa.me link),
-- exactly like the other order messages.
--
-- Idempotent: safe to re-run.

alter table orders
  add column if not exists delivery_provider text
    check (delivery_provider in ('promptxpress', 'pickme_flash'));
alter table orders
  add column if not exists tracking_number text;
alter table orders
  add column if not exists tracking_url text;

comment on column orders.delivery_provider is
  'Courier carrying a dispatched order: promptxpress | pickme_flash. NULL until dispatched.';
comment on column orders.tracking_number is
  'PromptXpress tracking number (tracking page URL is fixed). NULL for other couriers.';
comment on column orders.tracking_url is
  'PickMe Flash tracking link entered by staff. NULL for other couriers.';

-- ── dispatch_order(): staff mark an order out for delivery + store tracking ──
create or replace function dispatch_order(
  p_id uuid,
  p_provider text,
  p_tracking_number text default null,
  p_tracking_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number text := nullif(trim(coalesce(p_tracking_number, '')), '');
  v_url text := nullif(trim(coalesce(p_tracking_url, '')), '');
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_provider not in ('promptxpress', 'pickme_flash') then
    raise exception 'INVALID_PROVIDER';
  end if;

  -- Each courier needs its own tracking handle; the other is cleared.
  if p_provider = 'promptxpress' then
    if v_number is null then
      raise exception 'TRACKING_NUMBER_REQUIRED';
    end if;
    v_url := null;
  else
    if v_url is null then
      raise exception 'TRACKING_URL_REQUIRED';
    end if;
    v_number := null;
  end if;

  update orders
    set status = 'out_for_delivery',
        delivery_provider = p_provider,
        tracking_number = v_number,
        tracking_url = v_url,
        updated_at = now()
    where id = p_id;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
end;
$$;

revoke execute on function dispatch_order(uuid, text, text, text) from public, anon;
grant execute on function dispatch_order(uuid, text, text, text) to authenticated;
