/* Golden Oven service worker — enables installable portals (Kitchen / Admin)
 * and a basic offline shell. Deliberately conservative so it can't serve stale
 * app code after a deploy:
 *   - Navigations: network-first, falling back to the cached SPA shell offline.
 *   - Hashed static assets (/assets/*): cache-first (safe — the hash changes
 *     on every build, so a new deploy fetches new URLs).
 *   - Supabase, API, and any cross-origin / non-GET request: never touched.
 */
const VERSION = 'go-sw-v1'
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
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Only handle our own origin; let Supabase / APIs / fonts go straight to network.
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
