import { Helmet } from 'react-helmet-async'
import { content } from '../data/catalog'
import { imageUrl } from '../lib/images'

// Per-page <head> (title, description, canonical, Open Graph, Twitter) plus
// optional JSON-LD structured data. Read by react-helmet-async both in the
// browser and during the build-time prerender (scripts/prerender.ts), so
// crawlers get real metadata on every route.

// Absolute site URL for canonical/OG. Set VITE_SITE_URL in the deploy env.
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://www.goldenovenbrownies.com').replace(/\/$/, '')

interface SeoProps {
  title: string
  description: string
  path: string
  image?: string
  /**
   * URL of the page's LCP image (e.g. the Home hero). When set, a
   * `<link rel="preload" as="image">` is emitted into the prerendered <head> so
   * the browser starts fetching it immediately, before the JS bundle parses —
   * the biggest lever on how fast the first image paints.
   */
  preloadImage?: string | null
  /** JSON-LD objects to embed (Product, BreadcrumbList, …). */
  jsonLd?: Record<string, unknown>[]
}

export default function Seo({ title, description, path, image, preloadImage, jsonLd }: SeoProps) {
  const url = `${SITE_URL}${path}`
  const ogImage = image ?? `${SITE_URL}/og-default.png`

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {preloadImage && (
        <link rel="preload" as="image" href={imageUrl(preloadImage, 1280)} fetchPriority="high" />
      )}

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
