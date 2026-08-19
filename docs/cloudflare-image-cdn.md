# Serve product images through Cloudflare (cut Supabase egress)

Product/content images live in Supabase Storage. Every visitor downloads them
straight from Supabase, and that counts against your project's **egress** (and
"cached egress") — which is what pushed you over the Free-plan limit.

Putting **Cloudflare** in front means Cloudflare's edge caches each image and
serves almost every request itself, so Supabase is hit **once** per image (not
once per visitor). Cloudflare's Free plan does not meter this cached traffic.

The site is already wired for it: set **`VITE_IMAGE_CDN_BASE`** to your CDN host
and every image URL is served through it automatically (`src/lib/images.ts` →
`cdnUrl()`). Nothing else in the app changes.

---

## What you need
- Your domain (`goldenovenbrownies.com`) on **Cloudflare** (its nameservers
  point to Cloudflare). If the domain is on Vercel DNS today, you can either
  move DNS to Cloudflare, or register a small dedicated zone just for the CDN
  subdomain — either works; the steps below assume the domain is on Cloudflare.
- Your Supabase project ref, i.e. the host in your image URLs:
  `https://<PROJECT-REF>.supabase.co`. (Open any product image in the admin and
  copy the host.)

We'll expose the images at `https://cdn.goldenovenbrownies.com/...`.

---

## Step 1 — DNS record for the CDN subdomain
Cloudflare dashboard → your domain → **DNS → Records → Add record**:

- **Type:** `CNAME`
- **Name:** `cdn`
- **Target:** `<PROJECT-REF>.supabase.co`
- **Proxy status:** **Proxied** (orange cloud) ← this is what enables caching
- Save.

## Step 2 — Send the right Host to Supabase (Origin Rule)
Supabase only answers when the request's `Host` header is its own hostname, so
rewrite it. Cloudflare dashboard → **Rules → Origin Rules → Create rule**:

- **Rule name:** `cdn → supabase host`
- **When incoming requests match:** `Hostname` `equals` `cdn.goldenovenbrownies.com`
- **Then… Host Header** → **Rewrite to** → `<PROJECT-REF>.supabase.co`
- Deploy.

(No path rewrite is needed — the app already requests the full
`/storage/v1/object/public/...` path, which Supabase serves directly.)

## Step 3 — Cache the images hard (Cache Rule)
Cloudflare dashboard → **Rules → Cache Rules → Create rule**:

- **Rule name:** `cache cdn images`
- **When incoming requests match:** `Hostname` `equals` `cdn.goldenovenbrownies.com`
- **Then:**
  - **Cache eligibility:** **Eligible for cache**
  - **Edge TTL:** *Use cache-control header if present, otherwise 1 month* (the
    app already uploads images with a 1-year `Cache-Control`, so they'll cache
    for a year at the edge).
  - (Optional) **Browser TTL:** *Respect origin.*
- Deploy.

## Step 4 — SSL
Cloudflare → **SSL/TLS → Overview** → set encryption mode to **Full** (not
Flexible), so Cloudflare talks to Supabase over HTTPS.

## Step 5 — Point the app at the CDN
In **Vercel → Project → Settings → Environment Variables**, add (all
environments):

```
VITE_IMAGE_CDN_BASE = https://cdn.goldenovenbrownies.com
```

Redeploy. Done — image URLs now render as
`https://cdn.goldenovenbrownies.com/storage/v1/object/public/product-images/…`.

---

## Verify it's working
1. Open the live site, DevTools → **Network → Img**, reload.
   - Image requests should go to **cdn.goldenovenbrownies.com**, not
     `*.supabase.co`.
2. Reload again and click an image request → **Response Headers**:
   - `cf-cache-status: HIT` (first ever load may be `MISS`, then `HIT`).
3. After a day, your Supabase **Storage egress** graph should flatten out while
   traffic continues.

## Rollback
Delete the `VITE_IMAGE_CDN_BASE` env var and redeploy — images immediately go
back to being served straight from Supabase. (`cdnUrl()` is a no-op when the var
is unset, and images always resolve to a valid URL, so this can't break the
site.)

## Notes
- This covers all storefront images (product tiles, product gallery, hero
  banners, slideshow, gallery section). Admin-panel thumbnails still load from
  Supabase directly — that's low volume and not worth proxying.
- Alternative without moving DNS: a **Cloudflare Worker** bound to a route that
  fetches `https://<PROJECT-REF>.supabase.co/storage/v1/...` and returns it.
  The env-var + `cdnUrl()` wiring is identical; only the origin setup differs.
