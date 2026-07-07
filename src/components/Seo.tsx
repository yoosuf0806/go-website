import { Helmet } from 'react-helmet-async'
import { content } from '../data/catalog'

// Per-page <head> (title, description, canonical, Open Graph, Twitter) plus
// optional JSON-LD structured data. Read by react-helmet-async both in the
// browser and during the build-time prerender (scripts/prerender.ts), so
// crawlers get real metadata on every route.

// Absolute site URL for canonical/OG. Set VITE_SITE_URL in the deploy env.
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://goldenoven.lk').replace(/\/$/, '')

interface SeoProps {
  title: string
  description: string
  path: string
  image?: string
  /** JSON-LD objects to embed (Product, BreadcrumbList, …). */
  jsonLd?: Record<string, unknown>[]
}

export default function Seo({ title, description, path, image, jsonLd }: SeoProps) {
  const url = `${SITE_URL}${path}`
  const ogImage = image ?? `${SITE_URL}/og-default.png`

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={content.seo.siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd?.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  )
}

/** Organization JSON-LD — emitted once on the home page. */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: content.seo.siteName,
    url: SITE_URL,
    logo: `${SITE_URL}/og-default.png`,
  }
}
