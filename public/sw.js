/* Golden Oven service worker — enables installable portals (Kitchen / Admin)
 * and a basic offline shell. Deliberately conservative so it can't serve stale
 * app code after a deploy:
 *   - Navigations: network-first, falling back to the cached SPA shell offline.
 *   - Hashed static assets (/assets/*): cache-first (safe — the hash changes
 *     on every build, so a new deploy fetches new URLs).
 *   - Supabase Storage images: stale-while-revalidate in a separate, capped
 *     cache — the first visit pays the download, every repeat view and in-app
 *     navigation paints them instantly from cache while a fresh copy is fetched
 *     in the background. Image object paths are immutable UUIDs, so a cached hit
 *     can never be wrong for the URL it was stored under.
 *   - API and any other cross-origin / non-GET request: never touched.
 */
const VERSION = 'go-sw-v2'
const IMG_CACHE = 'go-img-v1'
const IMG_CACHE_LIMIT = 150
const SHELL = '/app.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll([SHELL, '/logo-mark.png'])).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Keep the current shell cache AND the image cache; drop old shell versions.
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION && k !== IMG_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

// True for the storefront's photos: Supabase Storage image requests. These are
// the heaviest, most-repeated assets on the site.
function isStorageImage(url, request) {
  return (
    /(^|\.)supabase\.co$/.test(url.hostname) &&
    url.pathname.includes('/storage/v1/') &&
    (request.destination === 'image' || url.pathname.includes('/render/image/'))
  )
}

// Bound the image cache so it can't grow without limit — trim oldest entries
// (insertion order) once over the cap.
async function trimCache(name, limit) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  if (keys.length <= limit) return
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Supabase Storage images (cross-origin): stale-while-revalidate. Serve the
  // cached copy immediately if present; always kick off a background refresh.
  if (isStorageImage(url, request)) {
    event.respondWith(
      caches.open(IMG_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          // <img> fires no-cors requests, which yield opaque responses we can't
          // validate or reliably store. Supabase sends `Access-Control-Allow-
          // Origin: *`, so re-request with CORS to get a readable, cacheable
          // response (a CORS response renders fine in the original <img>).
          const network = fetch(url.href, { mode: 'cors', credentials: 'omit' })
            .then((resp) => {
              if (resp.ok) {
                cache.put(request, resp.clone()).then(() => trimCache(IMG_CACHE, IMG_CACHE_LIMIT))
              }
              return resp
            })
            // CORS blocked or offline: fall back to the cache, then to a plain
            // (possibly opaque) fetch so the image still shows.
            .catch(() => cached || fetch(request))
          return cached || network
        }),
      ),
    )
    return
  }

  // Only handle our own origin from here; let APIs / fonts go straight to network.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // App navigations: network-first so a new deploy is picked up immediately;
  // fall back to the cached shell only when the network is unavailable.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(SHELL).then((r) => r || fetch(request))),
    )
    return
  }

  // Content-hashed build assets: cache-first for instant repeat loads.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            const copy = resp.clone()
            caches.open(VERSION).then((cache) => cache.put(request, copy))
            return resp
          }),
      ),
    )
  }
})
