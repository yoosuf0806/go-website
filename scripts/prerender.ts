/**
 * Build-time static prerender (SEO). After the client + server bundles are
 * built, render every public storefront route to real HTML so crawlers get full
 * content + per-page meta (not an empty SPA shell). Also emits app.html (the SPA
 * fallback for admin / non-prerendered routes), sitemap.xml, and robots.txt.
 *
 * Run after `vite build` (client) and `vite build --ssr` (server):
 *   tsx scripts/prerender.ts
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')

const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://goldenoven.lk').replace(/\/$/, '')

interface CatalogProduct {
  slug: string
}
interface Catalog {
  products: CatalogProduct[]
}

async function main() {
  const template = readFileSync(resolve(DIST, 'index.html'), 'utf8')
  const catalog = JSON.parse(
    readFileSync(resolve(ROOT, 'src/data/catalog.json'), 'utf8'),
  ) as Catalog

  const serverEntry = pathToFileURL(resolve(DIST, 'server/entry-server.js')).href
  const { render } = (await import(serverEntry)) as {
    render: (url: string) => { html: string; head: string }
  }

  // Route → output file (Vercel serves clean URLs from <dir>/index.html).
  const routes: { url: string; out: string }[] = [
    { url: '/', out: 'index.html' },
    { url: '/shop', out: 'shop/index.html' },
    { url: '/corporate', out: 'corporate/index.html' },
    ...catalog.products.map((p) => ({
      url: `/shop/${p.slug}`,
      out: `shop/${p.slug}/index.html`,
    })),
  ]

  for (const route of routes) {
    const { html, head } = render(route.url)
    const page = template
      .replace('<!--app-head-->', head)
      .replace('<!--app-html-->', html)
    const outPath = resolve(DIST, route.out)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, page, 'utf8')
  }

  // SPA fallback shell (empty root + head) for admin / non-prerendered routes.
  const shell = template.replace('<!--app-head-->', '').replace('<!--app-html-->', '')
  writeFileSync(resolve(DIST, 'app.html'), shell, 'utf8')

  // sitemap.xml
  const urls = routes.map((r) => (r.url === '/' ? SITE_URL + '/' : SITE_URL + r.url))
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`
  writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap, 'utf8')

  // robots.txt
  writeFileSync(
    resolve(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    'utf8',
  )

  // The server bundle is a build artefact — don't ship it.
  rmSync(resolve(DIST, 'server'), { recursive: true, force: true })

  console.log(`[prerender] Wrote ${routes.length} pages + sitemap.xml + robots.txt (base ${SITE_URL}).`)
}

main().catch((err) => {
  console.error('[prerender] failed')
  console.error(err)
  process.exit(1)
})
