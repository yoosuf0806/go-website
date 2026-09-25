import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PromoPopup as PromoPopupContent } from '../../types/content'
import { cdnUrl, imgError } from '../../lib/images'

// Landing-page promotional popup (admin-managed). Shows once per browser session
// so a returning visitor within the same session isn't nagged on every page, but
// a fresh visit sees it again. The dismissal is keyed by a signature of the
// popup's content, so as soon as the admin edits and republishes it, everyone
// sees the new one even if they'd dismissed the previous version this session.
//
// Renders nothing when disabled or when there's no image AND no text, so an
// empty/off popup never covers the page.

const STORAGE_PREFIX = 'go-promo-popup:'

/** Stable key for the current popup content, so edits invalidate a dismissal. */
function signature(popup: PromoPopupContent): string {
  return [popup.title, popup.body, popup.imageUrl ?? '', popup.ctaText, popup.ctaHref].join('|')
}

function alreadyDismissed(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    // Private mode / storage blocked — just show the popup this visit.
    return false
  }
}

function markDismissed(key: string) {
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    // Ignore — dismissal simply won't persist, which is acceptable.
  }
}

export default function PromoPopup({ popup }: { popup: PromoPopupContent }) {
  const hasContent = popup.enabled && (!!popup.imageUrl || !!popup.title.trim() || !!popup.body.trim())
  const key = STORAGE_PREFIX + signature(popup)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!hasContent) return
    if (alreadyDismissed(key)) return
    // Small delay so the popup animates in after the page paints, rather than
    // flashing on top of a still-loading hero.
    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [hasContent, key])

  function close() {
    setOpen(false)
    markDismissed(key)
  }

  if (!hasContent || !open) return null

  const hasCta = popup.ctaText.trim().length > 0 && popup.ctaHref.trim().length > 0
  const isInternal = hasCta && popup.ctaHref.startsWith('/')

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={popup.title || 'Promotion'}
    >
      {/* Backdrop — clicking it dismisses the popup. */}
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-sm"
      />

      <div className="animate-tin relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg font-medium text-navy shadow hover:bg-white"
        >
          ✕
        </button>

        {popup.imageUrl && (
          <img src={cdnUrl(popup.imageUrl)} data-fallback-src={popup.imageUrl} onError={imgError} alt="" className="max-h-64 w-full object-cover" />
        )}

        <div className="px-6 py-6 text-center">
          {popup.title.trim() && (
            <h2 className="font-display text-2xl text-navy">{popup.title}</h2>
          )}
          {popup.body.trim() && (
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-[#5c4450]">
              {popup.body}
            </p>
          )}
          {hasCta &&
            (isInternal ? (
              <Link
                to={popup.ctaHref}
                onClick={close}
                className="mt-5 inline-block rounded-2xl bg-pink px-7 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-pink-dark"
              >
                {popup.ctaText}
              </Link>
            ) : (
              <a
                href={popup.ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="mt-5 inline-block rounded-2xl bg-pink px-7 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-pink-dark"
              >
                {popup.ctaText}
              </a>
            ))}
        </div>
      </div>
    </div>
  )
}
