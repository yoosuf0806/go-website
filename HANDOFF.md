# Golden Oven Brownies — Developer Handoff

A single reference for continuing development (e.g. in a fresh claude.ai chat).
Paste this file's contents to give full context without re-deriving it.

---

## 1. What this is

A Sri Lankan brownie shop with three faces:

1. **Storefront** — customers browse, build a cart, and confirm orders via a
   pre-filled **WhatsApp** message (no online payment).
2. **Corporate / wedding inquiries** — a quotation form that lands in WhatsApp
   and the admin inbox.
3. **Admin back office** — login-gated panel to manage products, orders,
   inquiries, reviews, add-on pricing, banners, content/SEO, and bake lists.

Currency **LKR (Rs.)**. Design: bright pink `#EE2F63` + navy `#1A1A2E`,
Abril Fatface headings + Nunito body.

## 2. Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Catalogue | Build-time snapshot → `src/data/catalog.json` (storefront reads this, not the DB) |
| State / data | Zustand (cart, persisted to localStorage); React Query (runtime writes + admin CRUD) |
| Validation | Zod |
| Backend | Supabase — Postgres + RLS, Auth (admin only), Storage (`product-images`) |
| Routing | React Router v6 |
| SEO | react-helmet-async + build-time **prerender** (static HTML per route) + sitemap/robots + JSON-LD |
| Hosting | GitHub → **Vercel** (primary). A Netlify preview also builds but is secondary. |

**Defining architecture — build-time snapshot (Shopify-style), NOT runtime fetch.**
`scripts/snapshot.ts` reads all catalogue data from Supabase at build time (with
the service key) and writes `src/data/catalog.json`, bundled into the site. The
storefront reads that JSON synchronously — **zero DB reads while browsing**.
Supabase is touched at runtime **only for writes**: order insert (via the
`create_order` RPC) and inquiry insert. Admin edits → click **Publish** →
Vercel Deploy Hook rebuilds with a fresh snapshot (~1 min).

## 3. Repo & branches

- Repo: `yoosuf0806/go-website`
- Active branch: `claude/golden-oven-scaffold-pkpwqz`
- Production base: `main` (Phase 1 scaffold); open PR **#1** merges the branch → `main`.

## 4. File map (the important bits)

```
scripts/
  snapshot.ts          Build-time: Supabase → src/data/catalog.json (seed fallback offline)
  seed-data.ts         Demo data (mirrors supabase/seed.sql) for offline builds
  prerender.ts         Post-build: render each route to static HTML + sitemap.xml + robots.txt
src/
  data/catalog.ts      Typed loader for catalog.json; exports products/packages/addons/
                       deliveryTiers/featuredReviews/settings/content + getProductBySlug
  types/
    catalog.ts         Catalog snapshot shapes
    content.ts         SiteContent (editable copy + SEO) + DEFAULT_CONTENT + mergeContent
  lib/
    pricing.ts         cartTotals()/lineTotal()/findTier — SINGLE source of pricing math
    whatsapp.ts        Order + inquiry WhatsApp message builders + wa.me links
    format.ts          formatLKR, formatDate, SL phone normalisation
    supabase.ts        Single anon client (falls back to a placeholder URL if env unset)
    orders.ts          Storefront createOrder() → create_order RPC (returns order_no)
    inquiries.ts       Storefront createInquiry() (insert only, no .select())
    adminOrders/adminInquiries/adminProducts/adminReviews/adminAddons/adminSettings/
    adminContent.ts    Admin live reads/writes (React Query)
    orderStatus.ts     Order status flow (pure)
    orderSlip.ts / inquirySlip.ts / bakeList.ts  Pure builders (print views / aggregation)
    publish.ts         Calls /api/publish
    seo... (Seo.tsx)   Per-page <head> + JSON-LD (component lives in src/components/Seo.tsx)
  stores/cart.ts       Zustand cart (persisted); merges identical configs into box_qty;
                       reprices lines from the current catalog on load
  schemas/             Zod: addon, checkout, inquiry
  components/
    storefront/        PromoTicker, StorefrontLayout (header/footer/mobile nav/WhatsApp float),
                       Slideshow, ProductTile, ProductConfigurator, PackageSelector, AddonPanel,
                       Accordion, BrownieImage, BannerBar, CartDrawer, CheckoutModal, InquiryModal
    admin/             AdminLayout, StatusBadge, ProductFormModal, ConvertToOrderModal
    Seo.tsx
    ui/Toast.tsx
  pages/
    Home, Shop, ProductDetail (/shop/:slug), Corporate, NotFound
    admin/ Login, Dashboard, Orders, Inquiries, Products, AddonPricing, Reviews,
           Settings, Content (Content & SEO), BakeList
  entry-client.tsx / entry-server.tsx / main.tsx   SSG entries (hydrate-or-create + renderToString)
  App.tsx              Router; admin routes code-split + auth-gated
api/publish.ts         Vercel edge fn: validates admin token → fires Deploy Hook
supabase/
  migrations/          001–011 (numbered SQL)
  setup.sql            One-shot: full schema + RLS + create_order RPC (+ optional demo data)
  storage-setup.sql    Creates the public product-images bucket + policies
  content.sql          Seeds the site_settings 'content' row (Content CMS)  [if present]
vercel.json            SPA rewrite of non-/api routes → /app.html
```

## 5. Core business rules (do not reinterpret)

- **Packages** are fixed: 9 / 12 / 15 pcs and Brownie Slab (12 pcs). Line price =
  `price_per_piece × piece_count × box_qty` + add-on prices (add-ons per box).
- **Delivery is computed once per cart** from the combined piece count
  (`Σ piece_count × box_qty`) matched against `delivery_tiers` — never per line.
  Base tier confirmed at **Rs. 580**. All of this lives in `lib/pricing.ts`;
  every total on screen and in WhatsApp comes from `cartTotals()`.
- **Add-ons**: letter topper (slab-only, product must allow it; 3 lines × 5 chars),
  gift message (100-char), gift ribbon (colour list). Config keys are snake_case
  in the DB JSON (`max_chars_per_line`, `slab_only`, `max_chars`).
- **Checkout**: Details (zod) → Review → Confirm. WhatsApp opens **only after a
  successful order insert**; on failure show retry (never diverge DB vs message).
- **RLS**: public reads visible catalogue rows; orders are created only via the
  `create_order` SECURITY DEFINER RPC (no direct anon insert); inquiries allow a
  constrained anon insert; admin (authenticated) has full CRUD.

## 6. Deploy setup (Vercel)

Env vars (Settings → Environment Variables; tick **all** environments):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — storefront + auth (build-time inlined)
- `SUPABASE_SERVICE_KEY` — build-time snapshot read
- `ADMIN_DEPLOY_HOOK_URL` — server-only; the Publish button (Settings → Git → Deploy Hooks)
- `VITE_SITE_URL` — absolute site URL for canonical/sitemap/OG (e.g. https://goldenoven.lk)

## 7. Supabase — run these once (SQL Editor)

1. `supabase/setup.sql` — full schema + RLS + `create_order` RPC (+ demo data). **[done]**
2. `supabase/storage-setup.sql` — creates the public `product-images` bucket (fixes
   "Bucket not found" on image upload). **[pending]**
3. `content.sql` — seeds the editable `content` row so admin Content/SEO edits persist.
   **[pending]**  Also create an admin user: Authentication → Users → Add user.

## 8. Local dev

```
npm install
npm run dev        # runs snapshot (seed fallback if no service key) then vite
npm run build      # tsc + snapshot + client build + SSR build + prerender
npm test           # vitest (pure logic: pricing, whatsapp, cart, status, slips, aggregation)
npm run lint       # oxlint
```
Without Supabase env vars the snapshot falls back to seed data (`source: "seed"`),
so the UI runs fully offline.

## 9. How to make changes (low-token workflow)

Storefront copy/SEO is **admin-editable** (Admin → Content & SEO), stored in the
`site_settings.content` JSONB, baked into the snapshot on Publish. For **code**
changes: edit the relevant file, commit to the branch (PR #1 preview) or `main`
(production); Vercel auto-deploys. Business logic is centralised — change pricing
in `lib/pricing.ts`, WhatsApp text in `lib/whatsapp.ts`, editable copy in
`types/content.ts` defaults (or via admin).

## 10. Open / optional items

- **Sparkles** slab add-on (reference has it; needs an `addons` row + AddonPanel support).
- **Auto-open cart** on add-to-cart (lift cart-open state so ProductConfigurator can trigger it).
- **`netlify.toml`** with SPA fallback if keeping Netlify — otherwise standardise on Vercel.
- Confirm business details: real WhatsApp number, Google URL, add-on prices, any
  heavy-order delivery tiers (`site_settings` / `delivery_tiers`).

## 11. Status

All build phases done; storefront rebuilt to the reference design (pink/navy),
product pages, Content CMS, and SEO/prerender are in. PR #1 open (branch → main),
CI green on Vercel + Netlify previews.

---

## PR #4 addendum — slab-15, free per-package letter topper, per-product-per-package stock

Added on top of `main` (which already includes PR #3's live-catalog reads). Migration `013_slab_stock_letters.sql`.

- **Two slab sizes:** 9/12/15pc boxes plus Brownie Slab 12pc (`slab-12`) and 15pc (`slab-15`), each gated by an independent product flag (`is_slab_available` / `is_slab_15_available`). Admin ProductFormModal has two separate slab toggles.
- **Letter topper is free & built-in**, no longer the paid `letter_topper` addon. 3 lines, per-line char limit driven by `packages.letter_max_chars`: 7 for both slabs, 5 for 15pc box, 4 for 12pc box, 0 (hidden) for 9pc box. Shown only when the selected package's limit > 0 AND `product.allows_letter_topper`. Old addon row kept (price 0, disabled) so historical orders still render — do not re-enable.
- **Per-product-per-package stock** (`product_package_stock`): mark any product×package combo sold out independent of the product's `in_stock` flag (e.g. 9pc Cashew in stock, 12pc Cashew out). No row = in stock. Admin Products page has a per-package stock grid. Out-of-stock combos render disabled/struck-through in the storefront selector.

**Two data-mapping paths both updated:** `scripts/snapshot.ts` (build) and `src/lib/liveCatalog.ts` (runtime fetch). Plus `scripts/seed-data.ts`, `types/catalog.ts` (adds `letterMaxChars`, `isSlab15Available`, `productPackageStock` + `stockKey()`), and `supabase/setup.sql`.

**After merging: run `supabase/migrations/013_slab_stock_letters.sql` in the Supabase SQL Editor** — the code expects those columns/tables to exist; merging the PR alone doesn't create them.

Verified: `tsc -b` clean, `npm test` 61/61, `npm run lint` 0 errors, `npm run build` (client + SSR + prerender) succeeds.
