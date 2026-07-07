-- 005_delivery_tiers.sql
-- Delivery fee is computed ONCE per cart from the COMBINED piece count of all items.
create table delivery_tiers (
  id uuid primary key default uuid_generate_v4(),
  min_pieces int not null,
  max_pieces int,                  -- null = open-ended top tier
  fee numeric(10,2) not null,
  warn_admin boolean not null default false, -- heavy-order warning badge in admin
  sort_order int not null default 0
);
-- Seed: standard delivery is CONFIRMED at Rs. 580 (LKR) — use as the default/base tier.
insert into delivery_tiers (min_pieces, max_pieces, fee, warn_admin, sort_order)
values (1, null, 580.00, false, 1);
-- Additional tiers (e.g. heavy-order ranges with warn_admin = true) are placeholders:
-- confirm ranges and fees with the business owner before launch.
