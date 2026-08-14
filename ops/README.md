# Golden Oven — Ops & Finance Dashboard

A standalone internal dashboard for running the business numbers that used to
live in `golden_oven_statement.xlsx`. It shares the **same Supabase project** as
the public storefront, so website B2C orders flow in automatically while B2B
sales, ad spend, purchasing and expenses are entered by hand.

## What it does

| Page | Purpose |
| --- | --- |
| **Dashboard** | Monthly income + the ad-spend / ROI table ("sales gained from each month's ads"): ad spend, sales, new customers, cost per customer, ROAS. |
| **Sales** | Live website orders (read-only) + manual B2B / offline sales entry. |
| **Ad Spend** | Monthly Facebook / TikTok spend (LKR, optional USD). |
| **Purchasing** | Ingredient / packaging / equipment purchases (COGS). |
| **Expenses & Targets** | Salary, boxes, rent + monthly sales target in pieces. |
| **Income Statement** | Sales → gross profit → net profit per financial year (starts March 5). |
| **Costing** | Per-flavour cost, price and gross margin. |
| **B2B Pipeline** | Corporate / wholesale CRM (industry, value, status, next step). |
| **Shares** | Owner equity split and founder investments. |

## Data model

All data lives in `ops_*` tables created by
`supabase/migrations/029_ops_system.sql`, seeded with your workbook's clean
historical figures by `030_ops_seed.sql`. Every table is admin-only (RLS via
the storefront's `is_admin()` helper).

Website B2C revenue is **not** copied — it's read live from the `orders` table.

## How "sales gained from ads" is calculated

Monthly-rollup attribution: a customer counts in the month of their **first**
website order (keyed by phone). Each month's row shows ad spend next to total
sales, new customers, cost per new customer and ROAS (sales ÷ ad spend). To
attribute individual orders to a specific campaign, add a source field at
checkout later — the schema is ready for it.

## Running it

```bash
cd ops
cp .env.example .env      # fill in the SAME Supabase URL + anon key as the storefront
npm install
npm run dev               # http://localhost:5180
```

Sign in with a **finance** or **admin** account. A dedicated finance login
(migration `031_finance_role.sql`) can use this whole dashboard but is walled
off from the storefront — no products, prices, orders or settings. To create
one: add the user in Supabase → Authentication → Users, then

```sql
insert into profiles (id, role)
select id, 'finance' from auth.users where email = 'finance@goldenoven.lk'
on conflict (id) do update set role = 'finance';
```

Any admin account works too (a Supabase user without a `profiles` row, or with
`role = 'admin'`, is treated as admin).

## Deploy

Build with `npm run build` and host the `dist/` folder anywhere static (Vercel,
Netlify, Cloudflare Pages) as a separate project from the storefront, with the
two `VITE_` env vars set. Keep it behind your admin login — it's an internal tool.
