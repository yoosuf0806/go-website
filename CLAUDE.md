# go-website — Golden Oven storefront

The public Golden Oven site plus its Admin and Kitchen portals. React + Vite +
Tailwind, SSR-prerendered, backed by Supabase, deployed on Vercel.

## The ops/finance dashboard is NOT in this repo

Golden Oven's internal ops & finance dashboard (sales, ad ROI, income
statement, costing, B2B pipeline, shares) lives in a **separate repository**,
`yoosuf0806/GO-OPS`, and deploys as its own Vercel project.

This repo used to carry a copy of it in `ops/`. That copy was deleted: having
both apps in one working tree caused edits meant for one to bleed into the
other and break deploys. Do **not** re-add an `ops/` folder here, and do not
try to serve the dashboard from this app. Changes to the dashboard belong in
the GO-OPS repo.

The two share one thing only: the **Supabase project**. This app owns the
storefront tables (`orders`, `products`, …); GO-OPS owns the `ops_*` tables and
reads `orders` read-only for its B2C figures.

## Layout

- `src/pages/` — storefront pages, plus `admin/` and `kitchen/` portals
- `src/components/` — `storefront/`, `admin/`, `kitchen/`, `schedule/`, `ui/`
- `src/lib/` — data access + pure logic (pricing, orders, whatsapp, schedule).
  Business rules live here as pure functions so they can be unit-tested; most
  have a matching `*.test.ts`.
- `src/schemas/` — zod form schemas
- `supabase/migrations/` — numbered SQL, applied to the shared Supabase project

## Things worth knowing before changing them

- **Prices are recomputed server-side.** `create_order()` (see the newest
  `*_create_order`-touching migration) re-derives every figure from catalogue
  rows and raises `PRICE_MISMATCH` if the client's total disagrees. Never move
  pricing authority back to the browser.
- **Kitchen is a lower-trust role.** RLS (migration 027) gates admin writes on
  `is_admin()`; kitchen advances order status only through the
  `advance_order_status()` RPC. The admin/kitchen split is enforced in the
  database, not just the UI.
- **Adding a parameter to an RPC changes its signature.** `create or replace`
  cannot do that — it creates a second overload and makes PostgREST calls
  ambiguous. Drop the old signature first (see `038_delivery_time_slot.sql`).
- **Delivery slots** are stored as codes (`'10-11'`, `'16-18'`), never display
  text; labels come from `src/lib/deliverySlots.ts`.

## Checks

`npm run lint` · `npm test` (vitest) · `npm run build` (typecheck + SSR build +
prerender). `npm run snapshot` regenerates `src/data/catalog.json`, which the
build needs and which is gitignored — it falls back to local seed data when no
`SUPABASE_SERVICE_KEY` is set.
