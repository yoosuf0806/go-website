-- 029_ops_system.sql
--
-- Golden Oven Ops / Finance system.
--
-- Backs the standalone internal dashboard app in /ops. This is the business
-- back-office that the founder uses to run the numbers the Excel workbook
-- ("golden_oven_statement.xlsx") used to hold by hand:
--
--   * Sales           — website B2C orders flow in automatically from the
--                        existing `orders` table (read live by the ops app).
--                        B2B orders and any offline/historical B2C sales are
--                        entered manually into `ops_sales`.
--   * Ad spend        — monthly Facebook / TikTok / other ad spend, entered
--                        manually (LKR, optional USD + rate).
--   * Purchasing      — dated ingredient / packaging / equipment purchases
--                        (this is COGS for the income statement).
--   * Expenses        — salary, box purchase and other operating expenses.
--   * Income statement— derived in the app from sales - purchases - ad spend
--                        - discounts - expenses per month & financial year.
--   * B2B pipeline    — CRM: industry, customer, solution, value, status.
--   * Costing         — per-flavour recipe cost -> selling price -> margin.
--   * Shares          — owner equity split and founder investments.
--   * Targets         — monthly sales target in pieces (vs achieved, computed).
--
-- The monthly report + ad ROI table ("income vs ad spend vs sales gained from
-- each month's ads") is computed in the app by joining these tables with the
-- live `orders` data, so we keep the SQL to plain tables here.
--
-- Security: single internal user for now. Every table is admin-only via the
-- is_admin() helper from migration 027. RLS enabled on all. Idempotent.

-- ── Sales (manual: B2B + offline/historical B2C) ────────────────────────────
-- Website B2C sales are NOT copied here; the ops app reads them live from
-- `orders`. This table holds sales that never touch the storefront: B2B
-- wholesale accounts (Greenmart, Skyport, ...) and any historical B2C rows
-- migrated from the old spreadsheet.
create table if not exists ops_sales (
  id uuid primary key default uuid_generate_v4(),
  channel text not null default 'b2b' check (channel in ('b2b', 'b2c')),
  sale_date date not null,
  flavor text,                                  -- "TOPING" in the sheet (Cashew, Naked, Blondie, ...)
  customer text,                                -- "ORDER DETAIL" / account name
  ref text,                                     -- "REF" — who took the order (Yoosuf / Fariha ...)
  qty integer not null default 0,
  unit_price numeric(10, 2) not null default 0,
  amount numeric(12, 2) generated always as (qty * unit_price) stored,
  discount numeric(10, 2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ops_sales_date_idx on ops_sales (sale_date);
create index if not exists ops_sales_channel_idx on ops_sales (channel);

-- ── Ad spend (manual, monthly) ──────────────────────────────────────────────
create table if not exists ops_ad_spend (
  id uuid primary key default uuid_generate_v4(),
  month date not null,                          -- store the 1st of the month
  channel text not null default 'facebook'
    check (channel in ('facebook', 'tiktok', 'other')),
  amount_lkr numeric(12, 2) not null default 0,
  amount_usd numeric(12, 2),                    -- optional, when billed in USD
  usd_rate numeric(10, 4),                      -- LKR per USD used, for the record
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ops_ad_spend_month_idx on ops_ad_spend (month);

-- ── Purchasing (COGS) ───────────────────────────────────────────────────────
create table if not exists ops_purchases (
  id uuid primary key default uuid_generate_v4(),
  purchase_date date not null,
  item text not null,
  qty text,                                     -- free text: "4kg", "20", "2 dozen"
  amount_lkr numeric(12, 2) not null default 0,
  category text not null default 'ingredient'
    check (category in ('ingredient', 'packaging', 'equipment', 'other')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ops_purchases_date_idx on ops_purchases (purchase_date);

-- ── Operating expenses (salary, box, other) ─────────────────────────────────
create table if not exists ops_operating_expenses (
  id uuid primary key default uuid_generate_v4(),
  month date not null,                          -- 1st of the month
  category text not null default 'other'
    check (category in ('salary', 'box', 'rent', 'other')),
  description text,
  amount_lkr numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ops_operating_expenses_month_idx on ops_operating_expenses (month);

-- ── Monthly sales targets (pieces) ──────────────────────────────────────────
create table if not exists ops_monthly_targets (
  id uuid primary key default uuid_generate_v4(),
  month date not null unique,                   -- 1st of the month
  target_pcs integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── B2B pipeline (CRM) ──────────────────────────────────────────────────────
create table if not exists ops_b2b_pipeline (
  id uuid primary key default uuid_generate_v4(),
  tier text not null default 'prospect'
    check (tier in ('high', 'medium', 'prospect', 'corporate')),
  industry text,
  customer text not null,
  solution text,
  value_000 numeric(12, 2),                     -- deal value in thousands LKR
  contact text,
  status text not null default 'prospect'
    check (status in ('prospect', 'new_sale', 'retainer', 'won', 'lost')),
  next_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Costing / recipes ───────────────────────────────────────────────────────
create table if not exists ops_recipes (
  id uuid primary key default uuid_generate_v4(),
  flavor text not null,                         -- "Cashew Brownie", "Naked Brownie", ...
  per_piece_cost numeric(10, 2) not null default 0,
  selling_price numeric(10, 2) not null default 0,
  batch_pcs integer not null default 20,        -- pieces per batch the costing assumes
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ops_recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid not null references ops_recipes (id) on delete cascade,
  name text not null,                           -- "Vegetable Oil (250ml)"
  cost numeric(10, 2) not null default 0,       -- cost for the batch
  sort_order integer not null default 0
);
create index if not exists ops_recipe_ingredients_recipe_idx
  on ops_recipe_ingredients (recipe_id);

-- ── Shares & investments ────────────────────────────────────────────────────
create table if not exists ops_shares (
  id uuid primary key default uuid_generate_v4(),
  holder text not null,                         -- Yoosuf / Fariha / Husni
  share_pct numeric(6, 4) not null default 0,   -- 0.3333 == 33.33%
  earned numeric(12, 2) not null default 0,
  paid numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ops_investments (
  id uuid primary key default uuid_generate_v4(),
  investor text not null,
  item text,
  amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- ── updated_at triggers (reuse set_updated_at from migration 010) ───────────
do $$
declare t text;
begin
  foreach t in array array[
    'ops_sales', 'ops_ad_spend', 'ops_purchases', 'ops_operating_expenses',
    'ops_monthly_targets', 'ops_b2b_pipeline', 'ops_recipes', 'ops_shares'
  ] loop
    execute format('drop trigger if exists %I on %I', t || '_updated_at', t);
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- ── RLS: admin-only on every ops table ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'ops_sales', 'ops_ad_spend', 'ops_purchases', 'ops_operating_expenses',
    'ops_monthly_targets', 'ops_b2b_pipeline', 'ops_recipes',
    'ops_recipe_ingredients', 'ops_shares', 'ops_investments'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', 'admin all ' || t, t);
    execute format(
      'create policy %I on %I for all using (is_admin()) with check (is_admin())',
      'admin all ' || t, t
    );
  end loop;
end $$;
