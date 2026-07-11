-- 015_hot_picks.sql
-- Homepage "Hot Picks" section: a boolean flag on products the admin ticks to
-- feature them in a section below the hero banner. Reuses the normal product
-- tile — no separate content block or ordering table (kept intentionally
-- simple for launch; sort_order already gives them an order).
alter table products
  add column if not exists is_hot_pick boolean not null default false;

comment on column products.is_hot_pick is
  'Featured on the homepage Hot Picks section (below the hero). Admin-toggled.';
