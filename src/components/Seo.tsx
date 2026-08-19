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
  const ogImage = image ?? absoluteUrl(content.seo.defaultImageUrl) ?? `${SITE_URL}/og-default.png`

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

// ---------------------------------------------------------------------------
// Structured data (JSON-LD) builders
//
// Every builder reads the admin-editable `content.seo` block, so the business
// owner controls the structured data Google sees (Admin → Content & SEO). Empty
// fields are omitted rather than emitted blank, keeping the output valid for
// Google's Rich Results / structured-data guidelines.
// ---------------------------------------------------------------------------

/** Prefix a relative path with SITE_URL; pass through absolute URLs; '' → undefined. */
function absoluteUrl(u?: string | null): string | undefined {
  if (!u) return undefined
  return /^https?:\/\//.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`
}

/** Non-empty `sameAs` profile URLs (Instagram, Facebook, Google Business, …). */
function sameAs(): string[] {
  return (content.seo.sameAs ?? []).map((s) => s.trim()).filter(Boolean)
}

/** schema.org PostalAddress built from the editable business profile, or
 *  undefined when no address fields are set. */
function postalAddress(): Record<string, unknown> | undefined {
  const b = content.seo.business
  const addr: Record<string, unknown> = {
    '@type': 'PostalAddress',
    ...(b.streetAddress ? { streetAddress: b.streetAddress } : {}),
    ...(b.addressLocality ? { addressLocality: b.addressLocality } : {}),
    ...(b.addressRegion ? { addressRegion: b.addressRegion } : {}),
    ...(b.postalCode ? { postalCode: b.postalCode } : {}),
    ...(b.addressCountry ? { addressCountry: b.addressCountry } : {}),
  }
  // '@type' is always present; require at least one real field.
  return Object.keys(addr).length > 1 ? addr : undefined
}

/** Organization JSON-LD — emitted once on the home page. Enriched with logo,
 *  contact details, address, and social profiles when the admin has set them. */
export function organizationJsonLd(): Record<string, unknown> {
  const b = content.seo.business
  const logo = absoluteUrl(content.seo.logoUrl) ?? absoluteUrl(content.seo.defaultImageUrl) ?? `${SITE_URL}/og-default.png`
  const profiles = sameAs()
  const address = postalAddress()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: content.seo.siteName,
    ...(b.legalName && b.legalName !== content.seo.siteName ? { legalName: b.legalName } : {}),
    url: SITE_URL,
    logo,
    image: logo,
    ...(b.telephone || b.email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            ...(b.telephone ? { telephone: b.telephone } : {}),
            ...(b.email ? { email: b.email } : {}),
            ...(b.areaServed.length ? { areaServed: b.areaServed } : {}),
          },
        }
      : {}),
    ...(address ? { address } : {}),
    ...(profiles.length ? { sameAs: profiles } : {}),
  }
}

/** WebSite JSON-LD — declares the site name so Google can render sitelinks and
 *  a canonical site identity. Emitted once on the home page. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: content.seo.siteName,
    url: SITE_URL,
    inLanguage: 'en',
  }
}

/** LocalBusiness (e.g. Bakery) JSON-LD — the physical-business listing Google
 *  uses for local results and the Knowledge Panel. Emitted once on the home
 *  page; omitted field groups keep it valid on a partially-filled profile. */
export function localBusinessJsonLd(): Record<string, unknown> {
  const b = content.seo.business
  const image = absoluteUrl(content.seo.defaultImageUrl) ?? absoluteUrl(content.seo.logoUrl) ?? `${SITE_URL}/og-default.png`
  const profiles = sameAs()
  const address = postalAddress()
  const hours = (b.openingHours ?? []).map((h) => h.trim()).filter(Boolean)
  const hasGeo = b.latitude.trim() !== '' && b.longitude.trim() !== ''
  return {
    '@context': 'https://schema.org',
    '@type': b.type || 'LocalBusiness',
    name: content.seo.siteName,
    url: SITE_URL,
    image,
    ...(b.priceRange ? { priceRange: b.priceRange } : {}),
    ...(b.telephone ? { telephone: b.telephone } : {}),
    ...(b.email ? { email: b.email } : {}),
    ...(address ? { address } : {}),
    ...(hasGeo
      ? { geo: { '@type': 'GeoCoordinates', latitude: b.latitude, longitude: b.longitude } }
      : {}),
    ...(hours.length ? { openingHours: hours } : {}),
    ...(b.areaServed.length ? { areaServed: b.areaServed } : {}),
    ...(profiles.length ? { sameAs: profiles } : {}),
  }
}

/** FAQPage JSON-LD from a list of Q&A items. Returns null for an empty list so
 *  callers can spread it conditionally. Google shows these as FAQ rich results. */
export function faqPageJsonLd(items: { q: string; a: string }[]): Record<string, unknown> | null {
  const entities = items
    .filter((it) => it.q.trim() && it.a.trim())
    .map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    }))
  if (entities.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entities,
  }
}

/** BreadcrumbList JSON-LD from ordered {name, path} crumbs (path relative to
 *  the site root, e.g. "/shop"; use "/" for Home). */
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.path === '/' ? SITE_URL : `${SITE_URL}${c.path}`,
    })),
  }
}
