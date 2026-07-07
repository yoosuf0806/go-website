-- 004_addons.sql
-- Mirrors the prototype ADDON_CONFIG object: per-addon price + enable toggle.
create table addons (
  id text primary key,             -- 'letter_topper' | 'gift_message' | 'gift_ribbon'
  label text not null,
  price numeric(10,2) not null default 0,
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb
  -- letter_topper config: { "lines": 3, "max_chars_per_line": 5, "slab_only": true }
  -- gift_message config:  { "max_chars": 100 }
  -- gift_ribbon config:   { "colors": ["Red", "Gold", "Pink", "White"] }
);
