import { useEffect, useState } from 'react'

// iOS Safari never fires `beforeinstallprompt`, so InstallAppButton can't help
// there — the only way to install is Share → Add to Home Screen. Kitchen tablets
// are often iPads, so without this an iOS user has no in-app path to install.
// This renders a tap-to-expand hint with those steps, shown ONLY on iOS when the
// app isn't already running standalone (installed). Dismissal is remembered so it
// doesn't nag. SSR-safe: all detection runs client-side in an effect.

interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

const DISMISS_KEY = 'go-ios-install-dismissed'

function isIos(): boolean {
  const ua = navigator.userAgent
  // iPadOS 13+ reports as "MacIntel" but exposes touch points — catch that too.
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorStandalone).standalone === true
  )
}

export default function IosInstallHint({ className = '' }: { className?: string }) {
  const [show, setShow] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      /* private mode — treat as not dismissed */
    }
    if (!dismissed && isIos() && !isStandalone()) setShow(true)
  }, [])

  function dismiss() {
    setShow(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* best-effort */
    }
  }

  if (!show) return null

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="min-h-[44px] w-full rounded-lg border border-white/20 px-3 text-left text-sm font-medium text-white hover:bg-white/10"
      >
        📲 Add to Home Screen
      </button>
      {open && (
        <div className="mt-1 rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-white/80">
          <p>To install this app on your iPad or iPhone:</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4">
            <li>
              Tap the <span className="font-semibold text-white">Share</span> button{' '}
              <span aria-hidden>⬆️</span> at the bottom (or top) of Safari.
            </li>
            <li>
              Choose <span className="font-semibold text-white">Add to Home Screen</span>.
            </li>
            <li>
              Tap <span className="font-semibold text-white">Add</span> — the Kitchen app opens
              full-screen from your home screen.
            </li>
          </ol>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 text-xs font-medium text-white/50 underline hover:text-white/80"
          >
            Don’t show this again
          </button>
        </div>
      )}
    </div>
  )
}
