import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// The site is one SPA but ships TWO installable apps — Kitchen (/kitchen) and
// Admin (/admin) — each with its own manifest, icon and theme. Since the base
// document has no manifest, this component swaps the right one in (and the iOS
// meta/apple-touch-icon) based on the current route, and removes it on the
// public storefront so customers aren't prompted to install a staff app.
interface PortalPwa {
  manifest: string
  themeColor: string
  title: string
  icon: string
}

const PORTALS: { match: (path: string) => boolean; pwa: PortalPwa }[] = [
  {
    match: (p) => p.startsWith('/kitchen'),
    pwa: {
      manifest: '/kitchen.webmanifest',
      themeColor: '#d92d56',
      title: 'GO Kitchen',
      icon: '/icons/kitchen-192.png',
    },
  },
  {
    match: (p) => p.startsWith('/admin'),
    pwa: {
      manifest: '/admin.webmanifest',
      themeColor: '#1a0a00',
      title: 'GO Admin',
      icon: '/icons/admin-192.png',
    },
  },
]

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
  return el
}

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
  return el
}

export default function PwaManifest() {
  const { pathname } = useLocation()

  useEffect(() => {
    const portal = PORTALS.find((p) => p.match(pathname))?.pwa

    const manifest = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (!portal) {
      // Storefront route — remove any portal manifest so it isn't installable.
      manifest?.remove()
      return
    }

    upsertLink('manifest', portal.manifest)
    upsertLink('apple-touch-icon', portal.icon)
    upsertMeta('theme-color', portal.themeColor)
    upsertMeta('apple-mobile-web-app-capable', 'yes')
    upsertMeta('apple-mobile-web-app-status-bar-style', 'black-translucent')
    upsertMeta('apple-mobile-web-app-title', portal.title)
  }, [pathname])

  return null
}
