import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Scrolls the window to the top whenever the route path changes. Without this,
// navigating from a "You may also like" tile at the bottom of a product page
// would land the customer at the bottom of the next product — this brings them
// up so it's clear a new product loaded. Skips hash links (e.g. /#reviews) so
// in-page anchors still work.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, hash])
  return null
}
