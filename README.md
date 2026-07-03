# Golden Oven Brownies — Storefront

Customer-facing website (storefront + admin back office) for Golden Oven
Brownies. See [`GOLDEN_OVEN_BUILD_SPEC.md`](./GOLDEN_OVEN_BUILD_SPEC.md) for the
authoritative build specification.

## Stack

React 18 · Vite · TypeScript · Tailwind CSS · React Router v6 · Zustand ·
TanStack React Query · Zod · Supabase.

## Getting started

```bash
npm install
cp .env.example .env   # fill in Supabase URL / anon key / WhatsApp number
npm run dev
```

- `npm run dev` — start the dev server
- `npm run build` — type-check + production build
- `npm run lint` — lint

## Status

**Phase 1 (Foundation) complete** — Vite + React 18 + TS + Tailwind scaffold,
React Router v6 shell (storefront + gated admin routes), the `src/` folder
structure from spec §3, and `.env.example`. Supabase migrations, the snapshot
pipeline, and features are built in later phases (see spec §10).
