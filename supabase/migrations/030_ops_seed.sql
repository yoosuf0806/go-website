-- 030_ops_seed.sql
--
-- Seed the ops system with the clean, unambiguous data carried over from the
-- "golden_oven_statement.xlsx" workbook so the dashboard is useful immediately.
--
-- What is seeded (only the trustworthy, explicitly-dated / reference figures):
--   * Recipes + ingredients          (COSTING sheet)
--   * Owner shares + investments      (shares sheet)
--   * B2B pipeline corporate targets  (B2B sales sheet)
--   * Dated B2B wholesale orders       (sales b2b sheet — Jan/Feb 2026)
--   * Monthly actuals Mar–Jul 2026     (T accounts sheet — explicitly dated:
--        sales totals, purchase totals, ad spend, discounts)
--
-- Deliberately NOT seeded: the long, ambiguously-dated month history on the
-- "Sales summary" sheet (the year labels there don't resolve safely) and the
-- 500+ per-order B2C rows — going forward B2C sales flow in live from the
-- website `orders` table, and older months can be entered via the app UI.
--
-- Every block is guarded by "where not exists" so re-running is a no-op.

-- ── Recipes (COSTING) ───────────────────────────────────────────────────────
insert into ops_recipes (flavor, per_piece_cost, selling_price, batch_pcs)
select * from (values
  ('Naked Brownie',                    69.08, 150.00, 20),
  ('Cashew Brownie',                   81.08, 180.00, 20),
  ('Assorted Brownie',                 73.83, 200.00, 20),
  ('White Chocolate Blondie Brownie', 125.58, 250.00, 20),
  ('Brownie Cake',                     69.08, 208.33, 20)
) as v(flavor, per_piece_cost, selling_price, batch_pcs)
where not exists (select 1 from ops_recipes);

-- Ingredient breakdown (per 20-pc batch) for the two lead flavours.
insert into ops_recipe_ingredients (recipe_id, name, cost, sort_order)
select r.id, i.name, i.cost, i.sort_order
from ops_recipes r
join (values
  ('Cashew Brownie', 'Vegetable Oil (250ml)',        240.0, 1),
  ('Cashew Brownie', 'Eggs (4)',                      160.0, 2),
  ('Cashew Brownie', 'Sugar (500g)',                  140.0, 3),
  ('Cashew Brownie', 'Flour (300g)',                   75.0, 4),
  ('Cashew Brownie', 'Cocoa powder (50g)',            230.0, 5),
  ('Cashew Brownie', 'Cashew (50g)',                  240.0, 6),
  ('Cashew Brownie', 'Cooking Chocolate (75g)',       135.0, 7),
  ('Cashew Brownie', 'Baking Powder (5g)',             20.0, 8),
  ('Cashew Brownie', 'Vanilla (5ml)',                  30.0, 9),
  ('Cashew Brownie', 'Brownie Liner',                 144.0, 10),
  ('Cashew Brownie', 'Oil Paper',                      12.5, 11),
  ('Cashew Brownie', 'Cake Box',                      140.0, 12),
  ('Cashew Brownie', 'Bag',                            15.0, 13),
  ('Cashew Brownie', 'Cost Cushion',                   40.0, 14),
  ('Naked Brownie',  'Vegetable Oil (250ml)',         240.0, 1),
  ('Naked Brownie',  'Eggs (4)',                       160.0, 2),
  ('Naked Brownie',  'Sugar (500g)',                   140.0, 3),
  ('Naked Brownie',  'Flour (300g)',                    75.0, 4),
  ('Naked Brownie',  'Cocoa powder (50g)',             230.0, 5),
  ('Naked Brownie',  'Cooking Chocolate (75g)',        135.0, 6),
  ('Naked Brownie',  'Baking Powder (5g)',              20.0, 7),
  ('Naked Brownie',  'Vanilla (5ml)',                   30.0, 8),
  ('Naked Brownie',  'Brownie Liner',                  144.0, 9),
  ('Naked Brownie',  'Oil Paper',                       12.5, 10),
  ('Naked Brownie',  'Cake Box',                       140.0, 11),
  ('Naked Brownie',  'Bag',                             15.0, 12),
  ('Naked Brownie',  'Cost Cushion',                    40.0, 13)
) as i(flavor, name, cost, sort_order) on i.flavor = r.flavor
where not exists (select 1 from ops_recipe_ingredients);

-- ── Shares & investments (shares sheet) ─────────────────────────────────────
insert into ops_shares (holder, share_pct)
select * from (values
  ('Yoosuf', 0.3333),
  ('Fariha', 0.3333),
  ('Husni',  0.3333)
) as v(holder, share_pct)
where not exists (select 1 from ops_shares);

insert into ops_investments (investor, item, amount)
select * from (values
  ('Fariha',  'Oven',                 109000),
  ('Fariha',  'Blender',               23000),
  ('Fariha',  'Equipments',            10000),
  ('Husni',   'ADS',                   36000),
  ('Brownie', '50 pcs tray (old)',      5000)
) as v(investor, item, amount)
where not exists (select 1 from ops_investments);

-- ── B2B pipeline corporate targets (B2B sales sheet) ────────────────────────
insert into ops_b2b_pipeline (tier, customer, contact, status)
select * from (values
  ('corporate', 'Hutch',          null,                              'prospect'),
  ('corporate', 'Leco',           null,                              'prospect'),
  ('corporate', 'Akbar Brothers', 'Asanka Kodikara — HR Manager',    'prospect'),
  ('corporate', 'Fits Air',       null,                              'prospect')
) as v(tier, customer, contact, status)
where not exists (select 1 from ops_b2b_pipeline);

-- ── Dated B2B wholesale orders (sales b2b sheet, Jan–Feb 2026) ──────────────
insert into ops_sales (channel, sale_date, flavor, customer, ref, qty, unit_price)
select 'b2b', d, flavor, customer, ref, qty, unit_price from (values
  ('2026-01-06'::date, 'Cashew',  'Greenmart',           'Fariha', 20, 140),
  ('2026-01-09'::date, 'Cashew',  'Greenmart',           'Fariha', 12, 140),
  ('2026-01-11'::date, 'Cashew',  'Greenmart',           'Fariha', 20, 140),
  ('2026-01-19'::date, 'Cashew',  'Greenmart',           'Fariha', 20, 140),
  ('2026-01-20'::date, 'Cashew',  'Skyport Coronation',  'Yoosuf', 10, 160),
  ('2026-01-20'::date, 'Naked',   'Skyport Coronation',  'Yoosuf', 10, 130),
  ('2026-01-20'::date, 'Blondie', 'Skyport Coronation',  'Yoosuf', 10, 230),
  ('2026-01-25'::date, 'Cashew',  'Greenmart',           'Fariha', 18, 140),
  ('2026-01-27'::date, 'Cashew',  'Greenmart',           'Fariha', 20, 140),
  ('2026-02-02'::date, 'Naked',   'Skyport Coronation',  'Yoosuf', 10, 130),
  ('2026-02-02'::date, 'Cashew',  'Skyport Coronation',  'Yoosuf', 10, 160),
  ('2026-02-02'::date, 'Blondie', 'Skyport Coronation',  'Yoosuf', 10, 230),
  ('2026-02-10'::date, 'Cashew',  'Greenmart',           'Fariha', 20, 140),
  ('2026-02-12'::date, 'Cashew',  'Skyport Coronation',  'Yoosuf', 10, 160),
  ('2026-02-12'::date, 'Naked',   'Skyport Coronation',  'Yoosuf', 10, 130),
  ('2026-02-14'::date, 'Cashew',  'Greenmart',           'Fariha', 19, 140),
  ('2026-02-21'::date, 'Cashew',  'Skyport Coronation',  'Yoosuf', 10, 160),
  ('2026-02-21'::date, 'Naked',   'Skyport Coronation',  'Yoosuf', 10, 130)
) as v(d, flavor, customer, ref, qty, unit_price)
where not exists (select 1 from ops_sales where channel = 'b2b');

-- ── Monthly actuals Mar–Jul 2026 (T accounts sheet, explicitly dated) ───────
-- B2C historical monthly totals. Labelled as summary rows; going forward the
-- app reads B2C live from the website `orders` table instead.
insert into ops_sales (channel, sale_date, customer, qty, unit_price, discount, note)
select 'b2c', d, 'Monthly total (historical)', 0, amount, discount, note from (values
  ('2026-03-30'::date, 199450, 7420, 'March 2026 sales (from T accounts)'),
  ('2026-04-28'::date,  73560,    0, 'April 2026 sales (from T accounts)'),
  ('2026-05-31'::date, 148890, 2900, 'May 2026 sales (from T accounts)'),
  ('2026-06-30'::date,  86850,    0, 'June 2026 sales (from T accounts)')
) as v(d, amount, discount, note)
where not exists (
  select 1 from ops_sales where channel = 'b2c' and note like '%from T accounts%'
);
-- unit_price carries the amount because qty is 0 for these summary rows; the
-- generated `amount` column would be 0, so we also store the real figure by
-- setting unit_price to the monthly total with qty 1 instead:
update ops_sales set qty = 1
  where channel = 'b2c' and note like '%from T accounts%' and qty = 0;

insert into ops_purchases (purchase_date, item, amount_lkr, category, note)
select d, 'Monthly purchases (summary)', amount, 'ingredient', 'From T accounts'
from (values
  ('2026-03-30'::date, 59945),
  ('2026-04-28'::date, 71063),
  ('2026-05-31'::date, 47335),
  ('2026-06-30'::date, 53698),
  ('2026-07-30'::date, 54270)
) as v(d, amount)
where not exists (select 1 from ops_purchases);

insert into ops_ad_spend (month, channel, amount_lkr, note)
select date_trunc('month', d)::date, channel, amount, note from (values
  ('2026-03-30'::date, 'facebook', 16053.00, 'FB AD March'),
  ('2026-03-21'::date, 'other',     4050.00, 'X banner printed'),
  ('2026-04-28'::date, 'facebook', 15573.00, 'FB AD April'),
  ('2026-05-31'::date, 'other',    13260.00, 'April hamper advert'),
  ('2026-06-30'::date, 'other',    10000.00, 'Social media creatives (Fawzer)'),
  ('2026-06-30'::date, 'facebook', 15912.96, 'June sales ad'),
  ('2026-07-14'::date, 'facebook',  8858.00, 'July ad'),
  ('2026-07-22'::date, 'other',    10000.00, 'Marketing poster design'),
  ('2026-07-23'::date, 'other',     4000.00, 'Marketing video creator')
) as v(d, channel, amount, note)
where not exists (select 1 from ops_ad_spend);
