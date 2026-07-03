# Golden Oven Brownies — Business Management System Build Specification

> **Purpose of this document:** Complete, self-contained specification for building the Golden Oven Brownies **business management system** — the kitchen portal, ingredient purchasing, live recipe costing, expenses, and financial statements. This is **Spec B of two**. The customer-facing website (storefront + admin back office) is **Spec A** (`GOLDEN_OVEN_BUILD_SPEC.md`). Both apps share **one Supabase project** but are deployed independently (see §2). Hand this file to Claude (Opus / Claude Code) to build the business system. Read Spec A's §5b (Cross-system contract) first — it defines the boundary this document builds against.
>
> **Defining principle:** This system never duplicates order data. It reads the same `orders` / `order_items` tables Spec A writes, and adds its own tables for ingredients, recipes, purchasing, and expenses. Profit is computed, never hand-entered.

---

## 1. What this system does

Four capabilities, one login-gated app:

1. **Kitchen portal** — the kitchen sees what to bake, organised around delivery dates. Views: New orders, Pending delivery, Completed. A calendar shows scheduled deliveries inline. In-system reminders flag what's due.
2. **Recipes & costing** — a live version of the owner's costing sheet. Each brownie is a recipe (ingredients × quantities per batch). Costs and margins recalculate automatically as ingredient prices change.
3. **Purchasing** — every ingredient purchase is logged (quantity, cost, supplier, date). This drives the current cost of each ingredient, which ripples into recipe margins.
4. **Financials** — automatic gross profit, net profit, and expense tracking. Revenue and COGS come from orders; expenses are logged. No spreadsheet.

Plus a **WhatsApp task panel**: the admin enters a recipient number, picks a prepared message (e.g. the daily "orders to bake tomorrow" summary), and taps send — opening a pre-filled `wa.me` link. Fully manual, no paid messaging API.

## 2. Tech stack & architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| State / data fetching | TanStack React Query (this app reads live — no snapshot) |
| Validation | Zod (purchase, recipe, expense, ingredient forms) |
| Backend | Supabase — **the same project as Spec A** (Postgres, Auth, Storage) |
| Charts | Recharts (financial trends, cost breakdowns) |
| Routing | React Router v6 |
| Source control / CI | GitHub → Vercel (separate project from the storefront) |
| Hosting | Vercel (separate deployment / subdomain, e.g. `system.thegoldenoven.lk`) |

**Architecture:** A separate React SPA, deployed independently from the storefront, sharing one Supabase project. Unlike the storefront (which reads a build-time snapshot), this system reads Supabase **live** via React Query — the kitchen and finance data must always be current. It is entirely behind Supabase Auth; there is no anonymous access to any part of it.

```
BUSINESS SYSTEM (React SPA on Vercel, separate project)
   ├── authed session → live Supabase reads/writes
   │      • reads   orders / order_items        (written by Spec A)
   │      • reads   products / packages          (written by Spec A admin)
   │      • R/W     ingredients, ingredient_purchases,
   │                recipe_items, expenses, expense_categories   (owned here)
   │      • updates orders.status, orders.bake_date              (kitchen actions)
   └── wa.me deep links → WhatsApp task panel (manual send)
Supabase  (ONE project, shared with Spec A)
```

**Why separate from the storefront:** heavy finance/kitchen queries never compete with customer page loads. The two apps share data, not runtime. This is the "no lag on the customer site" guarantee.

## 3. Repository structure

Separate repo from the storefront (`golden-oven-system`).

```
golden-oven-system/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example                  # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_WHATSAPP_DEFAULT
├── supabase/
│   └── migrations/               # 011+ — continues Spec A's numbering (see §4)
├── src/
│   ├── main.tsx
│   ├── App.tsx                   # router shell, all routes protected
│   ├── lib/
│   │   ├── supabase.ts           # single client
│   │   ├── costing.ts            # PURE functions: batch cost, per-piece cost, margin %
│   │   ├── finance.ts            # PURE functions: gross/net profit, period aggregation
│   │   ├── whatsapp.ts           # summary + reminder message builders
│   │   └── format.ts             # LKR, dates, quantities
│   ├── types/db.ts               # generated Supabase types (whole shared schema)
│   ├── schemas/                  # zod: ingredient, purchase, recipe, expense
│   ├── hooks/                    # useOrders, useIngredients, useRecipes, useExpenses, useFinancials
│   ├── components/
│   │   ├── ui/                   # shared primitives (buttons, inputs, modal, table, toast)
│   │   ├── kitchen/              # OrderQueueCard, StatusStepper, DeliveryCalendar, BakeSummary
│   │   ├── recipes/              # RecipeEditor, IngredientPicker, MarginBadge
│   │   ├── purchasing/           # PurchaseForm, PurchaseLog, IngredientCostTable
│   │   ├── finance/              # ProfitStatement, ExpenseForm, ExpenseTable, TrendChart
│   │   └── whatsapp/             # TaskPanel, MessagePreview
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── KitchenBoard.tsx      # New / Pending delivery / Completed
│   │   ├── Calendar.tsx          # deliveries by date
│   │   ├── Recipes.tsx           # recipe list + editor
│   │   ├── Ingredients.tsx       # ingredient master + current costs
│   │   ├── Purchasing.tsx        # log a purchase + purchase history
│   │   ├── Expenses.tsx          # log + list expenses
│   │   ├── Financials.tsx        # profit statement + trends
│   │   └── WhatsAppTasks.tsx     # task panel
│   └── router/ProtectedRoute.tsx
└── README.md
```

## 4. Database schema (migrations 011+)

These **continue** Spec A's migration numbering and are applied to the **same** Supabase project. They must not alter Spec A's tables except the two explicitly-agreed additions (`orders.bake_date` and the `order_items.unit_cost` trigger), which are defined in Spec A's schema but activated here.

```sql
-- 011_ingredients.sql
create table ingredients (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  unit text not null,                               -- 'g' | 'ml' | 'piece' | 'dozen' etc.
  current_cost_per_unit numeric(12,4) not null default 0,  -- derived from latest purchase; see trigger
  created_at timestamptz not null default now()
);

-- 012_ingredient_purchases.sql
create table ingredient_purchases (
  id uuid primary key default uuid_generate_v4(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  quantity numeric(12,4) not null check (quantity > 0),   -- in the ingredient's unit
  total_cost_lkr numeric(12,2) not null check (total_cost_lkr >= 0),
  supplier text,
  purchased_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- When a purchase is logged, update the ingredient's current cost-per-unit to this purchase's
-- effective unit cost (total / quantity). Simple "latest price wins" model for v1.
-- (If weighted-average is ever wanted, change only this function.)
create or replace function apply_purchase_cost() returns trigger as $$
begin
  update ingredients
     set current_cost_per_unit = new.total_cost_lkr / new.quantity
   where id = new.ingredient_id;
  return new;
end;
$$ language plpgsql;
create trigger trg_apply_purchase_cost
  after insert on ingredient_purchases
  for each row execute function apply_purchase_cost();

-- 013_recipe_items.sql
-- One row per ingredient used in a product's recipe. quantity_per_batch is in the ingredient's unit.
-- batch_size lives on products (Spec A) — the costing sheet's "20 PCS".
create table recipe_items (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantity_per_batch numeric(12,4) not null check (quantity_per_batch >= 0),
  unique (product_id, ingredient_id)
);

-- 014_products_batch_size.sql
-- Spec A's products table may not yet have batch_size; add if missing (bake-to-order batch unit).
alter table products add column if not exists batch_size int not null default 20;

-- 015_orders_bake_date.sql
-- Kitchen plans backward from delivery. Default bake_date = delivery_date - 1 (next-day delivery model).
alter table orders add column if not exists bake_date date;
create or replace function set_default_bake_date() returns trigger as $$
begin
  if new.bake_date is null and new.delivery_date is not null then
    new.bake_date := new.delivery_date - interval '1 day';
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_set_bake_date
  before insert or update on orders
  for each row execute function set_default_bake_date();

-- 016_order_item_cost_trigger.sql
-- Fill order_items.unit_cost (declared NULL in Spec A) from the product's current recipe cost
-- at the moment the item is inserted. This snapshot keeps historical profit correct even after
-- a recipe is edited later. If a product has no recipe yet, unit_cost stays NULL (unknown COGS).
create or replace function recipe_cost_per_piece(p_product_id uuid) returns numeric as $$
  select case when p.batch_size > 0
    then coalesce(sum(ri.quantity_per_batch * i.current_cost_per_unit), 0) / p.batch_size
    else 0 end
  from products p
  left join recipe_items ri on ri.product_id = p.id
  left join ingredients i on i.id = ri.ingredient_id
  where p.id = p_product_id
  group by p.batch_size;
$$ language sql stable;

create or replace function snapshot_order_item_cost() returns trigger as $$
begin
  if new.unit_cost is null and new.product_id is not null then
    new.unit_cost := recipe_cost_per_piece(new.product_id);
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_snapshot_item_cost
  before insert on order_items
  for each row execute function snapshot_order_item_cost();

-- 017_expenses.sql
create table expense_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
);
insert into expense_categories (name) values
  ('Rent'), ('Utilities'), ('Gas'), ('Salaries'), ('Delivery'),
  ('Packaging'), ('Marketing'), ('Equipment'), ('Other');

create table expenses (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references expense_categories(id) on delete set null,
  amount_lkr numeric(12,2) not null check (amount_lkr >= 0),
  note text,
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);
```

### RLS for the business system

Every table above is **admin-only** — no anonymous access at all. Enable RLS and add a single authenticated-full-access policy per table (same pattern as Spec A's admin policies). Ingredient purchases, recipes, expenses, and financial data must never be readable by the anon key. Verify by querying each with the anon key and confirming zero rows / permission denied.

```sql
alter table ingredients enable row level security;
create policy "admin all ingredients" on ingredients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- repeat for ingredient_purchases, recipe_items, expenses, expense_categories.
```

## 5. Costing engine (the owner's sheet, made live)

`lib/costing.ts` — pure, unit-tested functions. This is the heart of the system; everything else displays its output.

```ts
// Per-piece cost of a product = sum(ingredient qty per batch × current unit cost) / batch_size
export function batchCost(recipe: RecipeItem[], ingredients: IngredientMap): number {
  return recipe.reduce((sum, r) =>
    sum + r.quantityPerBatch * (ingredients[r.ingredientId]?.currentCostPerUnit ?? 0), 0);
}
export function perPieceCost(recipe: RecipeItem[], ingredients: IngredientMap, batchSize: number): number {
  return batchSize > 0 ? batchCost(recipe, ingredients) / batchSize : 0;
}
export function grossMarginPct(sellingPrice: number, unitCost: number): number {
  return sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;
}
export function profitPerPiece(sellingPrice: number, unitCost: number): number {
  return sellingPrice - unitCost;
}
```

**Recipe editor requirements (`Recipes.tsx`):**
- List every product (from Spec A) with its live per-piece cost, selling price, gross margin %, and profit per piece — a live rebuild of the costing sheet's summary rows.
- Edit a recipe: add/remove ingredients, change `quantity_per_batch`, change the product's `batch_size`. On save, margins recompute instantly (the values shown come from `costing.ts`, not stored).
- Create a new brownie type = create the product (or reuse Spec A's product form) + define its recipe here.
- Show a **margin warning badge** when gross margin falls below a configurable threshold (e.g. < 40%) — so a rise in ingredient cost that quietly erodes a margin is visible.
- Changing a recipe here does **not** retroactively change past orders' `unit_cost` (those are snapshotted). It only affects future orders and the live margin display. State this in the UI so it isn't surprising.

## 6. Purchasing (`Purchasing.tsx`)

- **Log a purchase:** ingredient (picker, or create-new inline), quantity in the ingredient's unit, total cost paid, supplier, date, optional note. Zod-validated. On insert, the DB trigger updates that ingredient's `current_cost_per_unit`.
- **Ingredient cost table:** every ingredient with its current cost-per-unit and the date it was last updated. This is the input to every recipe margin.
- **Purchase history:** filterable log (by ingredient, supplier, date range) with total spent per period — this feeds the "Packaging"/ingredient side of expenses conceptually, though ingredient spend is tracked here separately from `expenses` (which is for overheads like rent/gas/salaries). **Do not double-count:** ingredient purchases are COGS inputs via recipes; `expenses` are operating costs. The financial statement (§8) keeps them in separate lines.

## 7. Kitchen portal

Built entirely on the shared `orders` / `order_items` tables. No new order storage.

### 7.1 KitchenBoard (`KitchenBoard.tsx`) — three columns/tabs
- **New orders** — `status in ('pending','confirmed')`, not yet started. Sorted by `delivery_date` ascending (most urgent first). Each card shows customer, items (product × package × box_qty → total pieces), delivery date, and a prominent **bake-by** date (`bake_date`, default delivery−1).
- **In progress / Pending delivery** — `status in ('baking','ready','out_for_delivery')`. Sorted by `delivery_date`. This is what's been started but not delivered.
- **Completed** — `status = 'completed'`, most recent first, date-filterable.
- **Status actions:** advance an order through the shared enum (`pending → confirmed → baking → ready → out_for_delivery → completed`, cancel from any). Uses the *same* status field Spec A's admin uses — one source of truth. Advancing writes back to Supabase immediately.
- Each order card shows a **piece total** and highlights the delivery date if it's today or tomorrow.

### 7.2 DeliveryCalendar (`Calendar.tsx`)
- Month/week calendar. Each day cell lists that day's **deliveries** (orders where `delivery_date` = that day), with a per-day total piece count.
- Because delivery is next-day-minimum, a day's deliveries were all baked the day before — so reading the calendar tells the kitchen both what ships that day and (by looking at tomorrow) what to bake today.
- Click a day → the bake summary for its deliveries (grouped by product → package → total pieces).
- Today and tomorrow are visually emphasised.

### 7.3 BakeSummary (shared component)
- Given a target date, aggregate all non-cancelled orders delivering that date, grouped by product then package, summing pieces. E.g. "Naked Brownie — 12-pack × 4 = 48 pcs; Cashew — slab × 2 = 24 pcs."
- Used in three places: the calendar day view, the kitchen board header ("tomorrow's bake load"), and the WhatsApp task panel's daily summary.

### 7.4 In-system reminders
- Dashboard/board banner: **"Delivering today: N orders"** and **"Delivering tomorrow: N orders (bake today)"** counts, computed from `delivery_date`.
- A subtle flag on any order whose `delivery_date` is tomorrow but `status` is still `pending` — i.e. not yet confirmed with baking imminent.
- No paid notifications in v1 — reminders live inside the app. (A future phase could add a scheduled job + WhatsApp Business API for true push; explicitly out of scope here.)

## 8. Financial statements (`Financials.tsx`)

`lib/finance.ts` — pure functions aggregating over a date range (default: current month; presets for week / month / quarter / custom).

- **Revenue** = Σ `orders.total` for non-cancelled orders in range (or Σ `order_items.line_total`; pick one and document — recommend `orders.total` including delivery, with delivery shown as a separate line so product revenue is clean).
- **COGS** = Σ (`order_items.unit_cost × piece_count × box_qty`) for those orders. Uses the snapshotted cost, so it's historically accurate.
- **Gross profit** = Revenue − COGS. **Gross margin %** = Gross profit / Revenue.
- **Operating expenses** = Σ `expenses.amount_lkr` in range, broken down by category.
- **Net profit** = Gross profit − Operating expenses.
- **Ingredient spend** (from `ingredient_purchases`) is shown as an informational line (cash outflow on stock) but is **not** subtracted again in net profit — COGS already captures ingredient cost per item sold. Make this distinction explicit in the UI so the owner understands why ingredient purchases and COGS differ (you may buy 5kg of chocolate this month but only sell brownies using 2kg of it).

**Display:**
- A clean profit statement: Revenue → COGS → Gross profit → each expense category → Net profit, with margin percentages.
- Recharts trend: net profit and revenue over the last N months.
- Per-product profitability table: for each brownie, units sold, revenue, COGS, profit, margin — so the owner sees which flavours actually make money.
- Everything derived from queries; nothing hand-entered except expenses and purchases.

**Expenses (`Expenses.tsx`):** log an expense (category, amount, note, date); list/filter; edit/delete. That's the only manual financial input besides purchases.

## 9. WhatsApp task panel (`WhatsAppTasks.tsx`)

Manual, free, wa.me-based. No messaging API.

- **Recipient field:** the admin types (or picks a saved) phone number, normalised to `+94…`.
- **Message templates**, each rendering a live preview from real data:
  1. **"Orders to bake for tomorrow's delivery"** — the daily summary. Lists every order delivering **tomorrow**, grouped by product → package → total pieces, plus per-order customer + delivery address line. This is the 5pm summary: the system prepares it from live data; the admin taps send. (The system cannot auto-fire at 5pm without a paid API — the panel keeps it ready and one tap away. A true scheduled auto-send is a documented future phase.)
  2. **Order status update** — pick an order, pick a status message ("Your order #<no> is out for delivery!"), send to that customer's number.
  3. **Custom message** — free text to any number.
- **Send** builds a `wa.me/<number>?text=<encoded>` link and opens it in a new tab. Encode with `encodeURIComponent`; `\n` line breaks.
- `lib/whatsapp.ts` owns the builders; the daily-summary builder shares the `BakeSummary` aggregation so the message and the on-screen bake list are always identical.

**Daily summary message shape:**
```
🍫 *Golden Oven — Bake list for <tomorrow's date>*
Delivering tomorrow: <N> orders, <total> pcs

<per product>
• <Product> — <package label> × <total pieces> pcs
</per>

Orders:
• #<no> — <customer>, <area> (<pcs> pcs)
...
```

## 10. Build phases (execute in order; each must build & run before the next)

1. **Foundation** — Vite + React + TS + Tailwind scaffold, router, Supabase client (same project), protected routes, generated types for the shared schema, migrations 011–017 applied.
2. **Ingredients + purchasing** — ingredient master, purchase form + trigger, cost table, purchase history. Verify current-cost updates on purchase insert.
3. **Recipes + costing** — `costing.ts` with unit tests (batch cost, per-piece, margin, profit — validate against the owner's sheet numbers), recipe editor, live margin display, margin warnings.
4. **Order-cost trigger** — activate `order_items.unit_cost` snapshot; backfill any existing orders where recipes now exist; verify historical accuracy (edit a recipe, confirm past orders' cost unchanged).
5. **Kitchen portal** — KitchenBoard (three views), status actions writing back to shared `orders`, bake summary component, in-system reminders.
6. **Calendar** — delivery calendar, day drill-down to bake summary, today/tomorrow emphasis.
7. **Expenses + financials** — expense CRUD, `finance.ts` with unit tests, profit statement, per-product profitability, trend charts.
8. **WhatsApp task panel** — templates, live previews sharing bake-summary logic, wa.me send.
9. **Polish & hardening** — loading/empty/error states, RLS verification (anon cannot read any business table), mobile QA (kitchen staff may use phones), number/date formatting, Lighthouse pass.

## 11. Quality gates & known failure modes

- **One source of truth for orders and status.** The kitchen portal reads and writes the *same* `orders.status` Spec A uses. Never create a parallel status field or a copied orders table.
- **Cost snapshots are immutable.** `order_items.unit_cost` is written once at insert. Editing a recipe must never rewrite historical `unit_cost`. Test this explicitly.
- **No double-counting in financials.** Ingredient purchases (cash out) and COGS (cost of sold items) are different lines. Net profit subtracts COGS + operating expenses, not ingredient purchases. Bake this into `finance.ts` and label it in the UI.
- **All costing/finance math is pure & unit-tested.** `costing.ts` and `finance.ts` have no side effects; every on-screen number derives from them. Validate `costing.ts` against the owner's real sheet (Naked per-piece ≈ Rs. 69.08, margin ≈ 53.95%, etc.) as a test fixture.
- **No index-based selection**; key by stable ids (ingredients, products, orders).
- **Modal state before open** (recipe editor, purchase form, expense form) — set initial data before the open flag flips.
- **TypeScript strict mode; ESLint + `tsc --noEmit` in CI.**
- **RLS verified:** with the anon key, every business table returns zero rows / denied. This system has no public surface.
- **Definition of done per feature:** typed, zod-validated, RLS-verified, works on a phone, and — for anything showing money — reconciles exactly with the pure-function output and (where applicable) the owner's costing sheet.

## 12. Open items to confirm with the business owner

1. **Costing model:** "latest purchase price wins" for ingredient current-cost (simplest), or weighted-average across recent purchases? v1 assumes latest-wins (one function to change if needed).
2. **Margin warning threshold** (default suggested: 40%).
3. **Batch size per product** — the sheet uses 20 pcs; confirm each product's batch size (some recipes may differ).
4. **Revenue definition in financials** — include delivery fees in revenue (shown as separate line) or exclude them? Recommend include-but-separate.
5. **Saved WhatsApp recipients** — should the task panel remember frequent numbers (kitchen, delivery rider), or type each time?
6. **Future auto-send:** if the 5pm summary should ever fire automatically without a tap, that needs a scheduled job + WhatsApp Business API (paid) — confirm whether to plan for it later.
