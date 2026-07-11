# Golden Oven Brownies — Full-Stack Build Specification

> **Purpose of this document:** Complete, self-contained specification for building the Golden Oven Brownies **customer-facing website** (the storefront + admin back office). This is **Spec A of two** — the business management system (kitchen portal, ingredient purchasing, live recipe costing, expenses, financial statements, WhatsApp task panel) is **Spec B**, a separate app sharing the same Supabase project (see §5b Cross-system contract). Hand this file to Claude (Opus / Claude Code) to build the website without further context. All business rules were validated in a previous static HTML/CSS/JS prototype and are authoritative.
>
> **Defining architectural decision:** the storefront ships catalogue data as a build-time snapshot (Shopify-style) and does **not** read the database while customers browse — see §2. Do not reinterpret this as a runtime-fetch SPA.

---

## 1. Project overview

Golden Oven Brownies is a Sri Lankan brownie business. The platform has three faces:

1. **Storefront** — customers browse brownies, build a cart, and confirm orders via a pre-filled WhatsApp message (no online payment; WhatsApp is the confirmation and communication channel).
2. **Corporate / wedding inquiries** — bulk-order customers submit a quotation request that also lands in WhatsApp and in the admin inbox.
3. **Admin back office** — login-gated panel for managing products, orders, inquiries, reviews, add-on pricing, banners, and printable bake lists.

**Currency:** LKR (Sri Lankan Rupees). **Primary comms channel:** WhatsApp deep links (`https://wa.me/<number>?text=<encoded>`), generated client-side.

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Catalogue data | Build-time snapshot → `src/data/catalog.json` (storefront reads this, not the DB) |
| State / data fetching | Zustand (cart); React Query for runtime writes + all admin CRUD |
| Validation | Zod (shared schemas for forms and API payloads) |
| Backend | Supabase — Postgres, Auth (admin only), Storage (product images) |
| Routing | React Router v6 |
| PDF generation | `@react-pdf/renderer` (order slips, quotations) or browser print views |
| Source control / CI | GitHub → Vercel (auto-deploy on push to `main`) |
| Hosting | Vercel (SPA) |

**Architecture style — build-time data snapshot (Shopify-style), NOT runtime fetch.**

This is the defining architectural decision and it must not be reinterpreted. The storefront does **not** query Supabase for catalogue data while a customer browses. Instead:

- A **build-time snapshot** script (`scripts/snapshot.ts`, run during the Vercel build via a `prebuild` npm hook) reads all catalogue data from Supabase — products, prices, packages, addons, delivery tiers, featured reviews, banner/feature settings — and writes it to a static `src/data/catalog.json` bundled into the deployed site.
- The storefront imports that JSON directly. Browsing, package selection, add-on pricing, and cart math all run against the in-bundle snapshot with **zero database reads**. Pages load instantly; the DB does nothing during browsing.
- Supabase is touched at runtime **only for writes**: inserting an order at checkout, and inserting a corporate/wedding inquiry. Nothing else.
- The admin panel is a separate app that reads/writes Supabase live (admins need fresh data). When an admin finishes editing, they click **"Publish changes"**, which triggers a Vercel Deploy Hook → the site rebuilds with a fresh snapshot (~1 minute) and the changes go live. This is exactly Shopify's save-then-publish flow.

**Trade-off (accepted):** an admin edit appears on the live storefront ~1 minute after Publish, instead of instantly. In exchange, customers get instant page loads and the database is idle during browsing. This is the desired behaviour.

```
STOREFRONT (React SPA on Vercel)
   ├── reads → src/data/catalog.json  (build-time snapshot; NO db reads while browsing)
   ├── anon key → INSERT only (orders, inquiries) at checkout/inquiry submit
   └── wa.me deep links → WhatsApp (order/inquiry confirmation)

ADMIN (separate React SPA on Vercel, /admin subdomain or separate project)
   ├── authed session → live Supabase CRUD (all tables)
   └── "Publish changes" button → Vercel Deploy Hook → storefront rebuild

BUILD STEP (Vercel prebuild)
   └── scripts/snapshot.ts → pulls catalogue from Supabase → writes catalog.json

Supabase
   ├── Postgres (+ RLS on every table)
   ├── Auth (email/password, admin users only)
   └── Storage (public `product-images` bucket)
```

**Why two separate apps:** the storefront and admin are deployed independently so heavy admin queries (and later, the business system) never compete with customer page loads. They share one Supabase project but not one runtime.

## 3. Repository structure

```
golden-oven/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example                  # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_WHATSAPP_NUMBER
├── supabase/
│   ├── migrations/               # numbered SQL migrations (schema below)
│   └── seed.sql                  # demo products, default settings, addon config
├── scripts/
│   └── snapshot.ts               # build-time: pulls catalogue from Supabase → catalog.json
├── src/
│   ├── main.tsx
│   ├── App.tsx                   # router shell
│   ├── data/
│   │   └── catalog.json          # GENERATED build-time snapshot (git-ignored); storefront reads this
│   ├── lib/
│   │   ├── supabase.ts           # single client instance
│   │   ├── whatsapp.ts           # message builders (order + inquiry templates)
│   │   ├── pricing.ts            # pure functions: line totals, delivery fee, cart totals
│   │   └── format.ts             # LKR currency, dates, phone normalisation
│   ├── types/
│   │   └── db.ts                 # generated Supabase types (supabase gen types)
│   ├── schemas/                  # zod schemas (checkout, inquiry, product, settings)
│   ├── stores/
│   │   └── cart.ts               # zustand store, persisted to localStorage
│   ├── hooks/                    # useProducts, useSettings, useAddons, useOrders...
│   ├── components/
│   │   ├── ui/                   # buttons, inputs, modal, toast, badge, counter
│   │   ├── storefront/           # ProductCard, PackageSelector, AddonPanel, CartDrawer,
│   │   │                         # CheckoutModal (3 steps), ReviewCarousel, BannerBar
│   │   └── admin/                # OrderTable, StatusBadge, InquiryCard, ProductForm,
│   │                             # AddonPricingForm, ReviewCurator, BakeListPrint
│   ├── pages/
│   │   ├── Home.tsx              # hero, featured products, reviews, corporate/wedding CTAs
│   │   ├── Shop.tsx
│   │   ├── Corporate.tsx         # corporate + wedding hero sections, inquiry modal
│   │   └── admin/
│   │       ├── Login.tsx
│   │       ├── Dashboard.tsx
│   │       ├── Orders.tsx
│   │       ├── Inquiries.tsx
│   │       ├── Products.tsx
│   │       ├── AddonPricing.tsx
│   │       ├── Reviews.tsx
│   │       ├── Settings.tsx
│   │       └── BakeList.tsx      # print-optimised route, opens in new tab
│   └── router/
│       └── ProtectedRoute.tsx    # redirects to /admin/login when no session
└── README.md
```

## 4. Database schema (Postgres / Supabase)

Run as ordered migrations. All tables have RLS **enabled**; policies in §5.

```sql
-- 001_extensions.sql
create extension if not exists "uuid-ossp";

-- 002_products.sql
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  is_visible boolean not null default true,
  sort_order int not null default 0
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price_per_piece numeric(10,2) not null check (price_per_piece >= 0),
  image_url text,
  is_visible boolean not null default true,
  in_stock boolean not null default true,             -- "sold out today" switch (bake-to-order)
  stock_qty int,                                       -- optional daily capacity; NULL = unlimited
  is_slab_available boolean not null default false,   -- can be ordered as Brownie Slab
  allows_letter_topper boolean not null default false, -- admin toggle; slab-only add-on
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- Availability model (bake-to-order): `in_stock=false` hides the buy button / shows "Sold out".
-- `stock_qty` is OPTIONAL daily capacity — leave NULL to ignore. When set, the storefront shows
-- limited availability and the admin can decrement it manually; it is NOT auto-decremented in v1.
-- Both fields are included in the build-time snapshot.

-- 003_packages.sql
-- Packages are LOCKED business rules, seeded once, edited only by admin.
create table packages (
  id text primary key,             -- 'box-9' | 'box-12' | 'box-15' | 'slab-12'
  label text not null,             -- '9 Pieces', '12 Pieces', '15 Pieces', 'Brownie Slab (12 pcs)'
  piece_count int not null check (piece_count > 0),
  is_slab boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0
);
insert into packages (id, label, piece_count, is_slab, sort_order) values
  ('box-9',  '9 Pieces',              9,  false, 1),
  ('box-12', '12 Pieces',             12, false, 2),
  ('box-15', '15 Pieces',             15, false, 3),
  ('slab-12','Brownie Slab (12 pcs)', 12, true,  4);

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

-- 006_orders.sql
create type order_status as enum
  ('pending','confirmed','baking','ready','out_for_delivery','completed','cancelled');

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_no serial unique,                    -- human-friendly, shown in WhatsApp msg
  status order_status not null default 'pending',
  customer_name text not null,
  phone text not null,
  address text,
  delivery_date date,
  note text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  total_pieces int not null,                 -- combined pieces, drives delivery tier
  source text not null default 'web',        -- 'web' | 'inquiry_conversion' | 'manual'
  inquiry_id uuid,                           -- set when converted from an inquiry
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,                -- denormalised snapshot
  package_id text not null references packages(id),
  package_label text not null,               -- snapshot
  piece_count int not null,
  box_qty int not null default 1 check (box_qty >= 1),
  unit_price numeric(10,2) not null,         -- price_per_piece snapshot (revenue side)
  unit_cost numeric(10,2),                   -- recipe cost-per-piece snapshot (COGS side);
                                             -- NULL until the business system's recipe tables
                                             -- exist. Filled by a DB trigger at insert time so
                                             -- historical profit stays correct even after a
                                             -- recipe is later edited. See "Cross-system contract".
  addons jsonb not null default '[]'::jsonb, -- [{id,label,price,detail:{lines|message|color}}]
  line_total numeric(10,2) not null
);

-- 007_inquiries.sql
create type inquiry_status as enum ('new','contacted','quoted','converted','closed');
create type inquiry_category as enum ('corporate','wedding');

create table inquiries (
  id uuid primary key default uuid_generate_v4(),
  category inquiry_category not null,
  status inquiry_status not null default 'new',
  name text not null,
  phone text not null,
  email text,
  event_date date,
  guest_count int,
  message text,
  converted_order_id uuid references orders(id),
  created_at timestamptz not null default now()
);

-- 008_reviews.sql
-- Google reviews are curated manually by admin (no API sync in v1).
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  author text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  source text not null default 'google',
  is_featured boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- 009_settings.sql
-- Single-row key/value settings, JSON values.
create table site_settings (
  key text primary key,
  value jsonb not null
);
insert into site_settings (key, value) values
  ('banner', '{"enabled": false, "text": "", "starts_at": null, "ends_at": null}'),
  ('features', '{"corporate_section": true, "wedding_section": true, "reviews_section": true}'),
  ('business', '{"whatsapp_number": "", "google_business_url": ""}');

-- 010_updated_at_trigger.sql
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();
```

## 5. Row Level Security

Admins are Supabase Auth users (no public sign-up; created via dashboard). Helper:

```sql
-- Any authenticated user is an admin in v1 (sign-ups disabled in Supabase Auth settings).
-- If multi-role is ever needed, switch to a profiles table with a role column.
```

| Table | anon (public) | authenticated (admin) |
|---|---|---|
| categories, products, packages, addons, delivery_tiers | `select` where visible/active | full CRUD |
| site_settings | `select` (banner, features, business keys only) | full CRUD |
| reviews | `select` where `is_featured and not is_hidden` | full CRUD |
| orders, order_items | `insert` only (checkout writes the order) | full CRUD |
| inquiries | `insert` only | full CRUD |

```sql
-- Example policies (repeat the pattern per table)
alter table products enable row level security;
create policy "public read visible products" on products
  for select using (is_visible = true);
create policy "admin all products" on products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table orders enable row level security;
create policy "public create order" on orders
  for insert with check (true);
create policy "admin manage orders" on orders
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
-- order_items: same pattern (public insert, admin all). No public select on orders.
```

**Storage:** bucket `product-images`, public read, authenticated write.

## 5b. Cross-system contract (website ↔ business system)

The website (this spec, "Spec A") and the business management system ("Spec B" — kitchen portal, recipes, purchasing, financials) are **two separate apps sharing one Supabase project**. This spec must not build Spec B, but it must not block it either. The contract between them:

- **Orders are the handoff.** Spec A writes `orders` + `order_items`. Spec B reads them for the kitchen portal, sales figures, and profit. Spec A owns the write; Spec B owns the analysis.
- **`order_items.unit_cost` is the profit hook.** It is defined in this schema but left NULL by Spec A. When Spec B adds recipe tables, it also adds a trigger that fills `unit_cost` from the product's current recipe cost at the moment each order item is inserted. This snapshot means editing a recipe next month never corrupts last month's profit. Spec A must not remove or repurpose this column.
- **Tables Spec B will add (do NOT create here, just don't collide):** `ingredients`, `ingredient_purchases`, `recipe_items`, `expenses`, `expense_categories`, and kitchen-status fields. The `orders.status` enum already includes the kitchen states (`baking`, `ready`, `out_for_delivery`), so the kitchen portal reuses them — no new status system.
- **No data duplication.** One `orders` table, read by both. The kitchen portal filters `orders` by `status` and `delivery_date`; it does not copy orders into a separate store.

## 6. Core business rules (authoritative — do not reinterpret)

### 6.1 Packaging & pricing
- Packages are locked to exactly four options: **9 pcs**, **12 pcs**, **15 pcs**, and **Brownie Slab (12 pcs)**. No custom piece counts on the storefront.
- Each product has a single admin-set `price_per_piece`. Line price = `price_per_piece × piece_count × box_qty` + add-on prices.
- A cart line is (product × package × add-ons). A **box-quantity counter** lets the customer order multiple boxes of the same flavour/package on one line (`box_qty`).
- Package selection in the UI must be keyed by `package.id` on a DOM/data attribute — **never by array index** (index-based selection was a proven bug source in the prototype).

### 6.2 Add-ons (`addons` table ≙ prototype `ADDON_CONFIG`)
- **Letter toppers** — three line fields, **max 5 characters per line**, uppercase. Available **only on slab packages** (`package.is_slab = true`) **and** only when the product's `allows_letter_topper` is true **and** the addon is enabled globally. Enforce at UI, zod schema, and (ideally) a DB check.
- **Gift message** — free-text, **100-character hard limit** with live counter.
- **Gift ribbon** — colour picker from `addons.gift_ribbon.config.colors`.
- Every add-on has an admin-editable price and enable/disable toggle. Disabled add-ons disappear from the storefront instantly (React Query invalidation).

### 6.3 Delivery fee — the single most important rule
> Delivery is calculated **once per cart**, from the **combined piece count of every item** (`Σ piece_count × box_qty`), matched against `delivery_tiers`. It is **never** calculated per line item. The same combined fee must appear identically in: the cart drawer, checkout review step, the WhatsApp message, and the stored order row.

Implement as one pure function in `lib/pricing.ts`:
```ts
export function cartTotals(items: CartItem[], tiers: DeliveryTier[]) {
  const totalPieces = items.reduce((n, i) => n + i.pieceCount * i.boxQty, 0);
  const subtotal    = items.reduce((n, i) => n + lineTotal(i), 0);
  const tier        = tiers.find(t => totalPieces >= t.minPieces &&
                        (t.maxPieces == null || totalPieces <= t.maxPieces));
  return { totalPieces, subtotal, deliveryFee: tier?.fee ?? 0,
           total: subtotal + (tier?.fee ?? 0), warnAdmin: tier?.warnAdmin ?? false };
}
```
Unit-test this function first. Everything renders from its output — no duplicated math anywhere else.

### 6.4 Checkout — 3-step modal
1. **Details** — name, phone (validated Sri Lankan format, normalised to `+94…`), address, delivery date, optional note. Zod-validated.
2. **Review** — full itemised summary: every line with package, box qty, add-on details, line totals; then subtotal, combined delivery fee, grand total.
3. **Confirm** — on confirm: (a) insert `orders` + `order_items` in one Supabase call chain (insert order → insert items with returned id), (b) build the WhatsApp message, (c) open `wa.me` deep link in a new tab, (d) show success state with order number, (e) clear cart.

If the DB insert fails, do **not** open WhatsApp — show a retry state. WhatsApp opens only after a successful insert so admin records and the customer message never diverge.

### 6.5 WhatsApp message templates (first-class feature)
`lib/whatsapp.ts` exports two builders. Encode with `encodeURIComponent`; use `%0A` line breaks via `\n` in the source string.

**Order template:**
```
🍫 *Golden Oven — New Order #<order_no>*

<for each line>
• <Product> — <Package label> × <box_qty>
  <if addons> ↳ Topper: "<L1> / <L2> / <L3>" | Ribbon: <color> | Msg: "<gift message>"
  Rs. <line_total>
</for>

Subtotal: Rs. <subtotal>
Delivery (<total_pieces> pcs): Rs. <delivery_fee>
*Total: Rs. <total>*

👤 <name> | 📞 <phone>
📍 <address>
🗓 Delivery: <date>
📝 <note>
```

**Inquiry template (corporate/wedding):**
```
💼 *Golden Oven — <Corporate|Wedding> Inquiry*
👤 <name> | 📞 <phone> | ✉️ <email>
🗓 Event: <event_date> | 👥 Guests: <guest_count>
📝 <message>
```

The delivery fee in the message must come from the same `cartTotals()` output used in the UI — this was a real prototype bug class (message showing a different fee than the cart).

### 6.6 Corporate & wedding flow
- Dedicated hero sections (feature-toggleable via `site_settings.features`), each with a **"Get Your Quotation"** CTA.
- CTA opens the pink inquiry modal → zod-validated form → insert into `inquiries` → open pre-filled WhatsApp message → success toast.

## 7. Admin panel specification

All routes under `/admin`, wrapped in `ProtectedRoute` (Supabase session check; redirect to `/admin/login`).

| Module | Requirements |
|---|---|
| **Dashboard** | Today's orders count, pending count, revenue this week, new inquiries, low-piece vs heavy-order breakdown. |
| **Orders** | Table with filters (status, date). Status progression: pending → confirmed → baking → ready → out_for_delivery → completed (cancel from any state). Per-row: WhatsApp quick-chat button (`wa.me/<customer phone>`), **weight-tier warning badge** when `warnAdmin` tier matched, PDF order slip action. Expand row → full items + add-on details. |
| **Inquiries** | Card list by status. Actions: mark contacted/quoted/closed, WhatsApp quick-chat, **quotation PDF**, and **Convert to order** — opens a pre-filled order form; on save, creates order with `source='inquiry_conversion'`, links `inquiry_id` both ways, sets inquiry status `converted`. ⚠️ Initialise the convert-modal's state **synchronously before opening it** (a race condition here broke the prototype — never open the modal then hydrate). |
| **Products** | CRUD with add/edit modal, image upload to Storage, per-product visibility toggle, per-category visibility toggle, `allows_letter_topper` toggle (visible only when slab-capable), drag or numeric sort order. |
| **Addon pricing** | Edit price + enable toggle per addon; edit ribbon colour list; edit topper char limits (config JSON surfaced as friendly fields). |
| **Reviews** | Manual Google-review curation: add review (author, rating, body), toggle featured/hidden, link out to Google My Business (`site_settings.business.google_business_url`). |
| **Settings** | Banner scheduler (text, enabled, start/end datetimes — storefront shows banner only inside the window), feature toggles (corporate/wedding/reviews sections), WhatsApp business number, admin password change (Supabase `updateUser`). |
| **Bake list** | Route `/admin/bake-list?date=YYYY-MM-DD` opened in a **new tab**, print-optimised (`@media print`), grouped by product → package → total pieces for all non-cancelled orders due that date. |

## 8. Frontend implementation notes

- **Cart store (zustand):** persisted to `localStorage` under a versioned key; items keyed by `productId + packageId + hash(addons)` so identical configs merge into `box_qty` increments.
- **Storefront data source is the snapshot, not React Query.** The storefront reads catalogue data (products, packages, addons, delivery tiers, featured reviews, banner/features) from the build-time `src/data/catalog.json` — synchronously, no loading spinners for the catalogue. React Query is used on the storefront **only** for the two runtime writes (order insert, inquiry insert) and their success/error states.
- **Admin uses React Query live.** The admin app reads/writes Supabase directly via React Query hooks with short `staleTime`; admin mutations invalidate admin queries so the admin UI stays fresh. The storefront does not share this — it waits for a Publish/rebuild.
- **Publish flow:** admin "Publish changes" button calls a Vercel Deploy Hook URL (stored in an admin-only env var). Show the admin a "Publishing… changes live in ~1 min" toast. Optionally poll the deploy status if you want a completion indicator.
- **`scripts/snapshot.ts`:** a Node script run in the Vercel `prebuild` step. Uses the Supabase service key (available at build time on Vercel, never shipped to the browser) to select all visible/active catalogue rows and write `catalog.json`. If Supabase is unreachable at build time, fail the build loudly rather than shipping an empty catalogue.
- **Zod everywhere:** checkout form, inquiry form, admin product form, and settings share schemas in `src/schemas/` — the schema is the single source of truth for limits (5-char topper lines, 100-char gift message).
- **Type safety:** generate DB types with `supabase gen types typescript` into `src/types/db.ts`; never hand-write table types.
- **Shared layout:** one `<Footer/>` and `<Header/>` rendered by the router layout — not duplicated per page (shared-footer duplication caused display bugs in the prototype).
- **Currency:** single `formatLKR()` helper (`Rs. 1,250.00` style) used everywhere, including WhatsApp messages.
- **Mobile-first:** the majority of Sri Lankan customers will order on phones via WhatsApp; design storefront and checkout for ~375px first.

## 9. Environment & deployment

```
# Storefront (Vercel project env vars)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_WHATSAPP_NUMBER=94XXXXXXXXX      # fallback; real value baked into snapshot from site_settings

# Build-time only (Vercel, NOT exposed to browser) — used by scripts/snapshot.ts
SUPABASE_SERVICE_KEY=                 # server-side read of catalogue during build; never in client bundle

# Admin app only (admin-side env, NOT in storefront bundle)
ADMIN_DEPLOY_HOOK_URL=               # Vercel Deploy Hook that rebuilds the storefront on "Publish"
```

- GitHub repo → Vercel: production deploys from `main`, preview deploys per PR.
- Supabase migrations applied via `supabase db push` (or the SQL editor for v1).
- Vercel SPA rewrite: all routes → `/index.html`.
- Never expose the Supabase `service_role` key in the frontend. Anon key + RLS only.

## 10. Build phases (execute in order; each phase must build & run before the next)

1. **Foundation** — Vite + React + TS + Tailwind scaffold, router, Supabase client, env wiring, migrations 001–010 applied, seed data, generated types.
2. **Snapshot pipeline** — `scripts/snapshot.ts` + `prebuild` hook + `src/data/catalog.json` shape and a typed loader. Verify a local build produces a valid catalog.json from seed data. This comes early because the whole storefront reads from it.
3. **Pricing core** — `lib/pricing.ts` + `lib/whatsapp.ts` as pure functions with unit tests (Vitest). Test: combined-delivery rule, tier boundaries, addon math, topper char limits, message formatting.
4. **Storefront read path** — Home, Shop, ProductCard with PackageSelector (data-attribute selection), AddonPanel with all three add-ons and their constraints, banner bar, featured reviews. All reading from `catalog.json`, including `in_stock` (sold-out state) and optional `stock_qty`.
5. **Cart & checkout** — zustand cart, cart drawer, 3-step checkout modal, order insert (with `unit_cost` left NULL), WhatsApp handoff, success state.
6. **Corporate/wedding** — hero sections, feature toggles, pink inquiry modal, inquiry insert + WhatsApp.
7. **Admin auth + shell** — login, protected routes, sidebar layout.
8. **Admin modules** — Orders → Inquiries (incl. convert-to-order) → Products (incl. in_stock/stock_qty) → Addon pricing → Reviews → Settings → Bake list print view → PDFs.
9. **Publish flow** — "Publish changes" button → Vercel Deploy Hook → storefront rebuild; publishing toast/status.
10. **Polish & hardening** — loading/empty/error states, toasts, 404, Lighthouse pass, mobile QA of checkout + WhatsApp handoff on a real device.

## 11. Quality gates & known failure modes (learned from the prototype — enforce these)

- **No duplicated state math:** every price/total on screen comes from `cartTotals()`. If two components compute totals independently, that is a bug.
- **No index-based selection** for packages, ribbon colours, or status steps — key by stable ids.
- **Modal state before open:** any modal that pre-fills (convert-to-order, product edit) must receive its initial data as props/state set *before* the open flag flips.
- **Sweep stale references after refactors:** removing a field/element must be followed by a project-wide search for its identifier (stale `letterInput`/`letterCount` references silently broke the prototype).
- **TypeScript strict mode on**; ESLint + `tsc --noEmit` in CI; duplicate-declaration class of bugs is eliminated by tooling, not vigilance.
- **Definition of done per feature:** typed, zod-validated, RLS-verified (test with anon key that admin tables are NOT readable), works at 375px, and the WhatsApp message matches the on-screen totals exactly.

## 12. Open items to confirm with the business owner before launch

1. Delivery fees — **standard delivery is confirmed at Rs. 580 (LKR)**; seed this as the default/base tier. Any additional tier piece ranges and fees (e.g. heavy-order tiers) remain placeholders to confirm.
2. Final WhatsApp business number and Google My Business URL.
3. Add-on prices (topper / ribbon / gift message) in LKR.
4. Whether cancelled orders should notify the customer via a templated WhatsApp message.
5. **Availability model** — confirm whether `in_stock` (simple sold-out toggle) is enough for v1, or whether `stock_qty` (optional daily capacity) should be surfaced in the admin from day one. Bake-to-order means neither auto-decrements.
6. **Publish cadence** — confirm the ~1-minute publish-after-edit delay is acceptable (build-time snapshot). If instant updates are ever required for a specific field, that field can be moved to a live read as a targeted exception.


## 13. PR #2 addendum — slab sizing, free topper, per-package stock (supersedes parts of §6.1/§6.2)

The rules below were added after the rest of this document was written and locked
(migration `013_slab_stock_letters.sql`). Where they conflict with §6.1/§6.2
above, this section is authoritative.

- **Packages are now five, not four**: 9 / 12 / 15 pcs boxes, **plus two slab
  sizes** — Brownie Slab (12 pcs, `slab-12`) and Brownie Slab (15 pcs,
  `slab-15`). A product's two slab flags (`is_slab_available` for 12pc,
  `is_slab_15_available` for 15pc) are independent — a product can offer
  either, both, or neither.
- **Letter topper is free, not a paid add-on.** It's a built-in option on
  qualifying packages, not gated by the `addons` table's price/enable toggle
  (that row is kept, zeroed and disabled, only so historical order rows with a
  `letter_topper` addon line keep rendering). Still exactly 3 line fields, but
  the **per-line character limit now varies by package** —
  `packages.letter_max_chars`: 15pc slab 7, 12pc slab 7, 15pc box 5, 12pc box
  4, 9pc box 0 (topper not offered). Shown only when the selected package's
  `letter_max_chars > 0` **and** the product's `allows_letter_topper` is true.
- **Per-product-per-package stock** (`product_package_stock`): a specific
  product×package combo (e.g. 12pc Cashew Brownie) can be marked sold out
  independent of the product-level `in_stock` flag and independent of other
  packages for the same product. No row = in stock; a row with
  `in_stock = false` is the sold-out override. Out-of-stock combos render
  disabled/struck-through in the storefront package selector rather than
  disappearing.
