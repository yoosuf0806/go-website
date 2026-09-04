import { useEffect, useState } from 'react'

// Chrome on Android/desktop fires `beforeinstallprompt`; we capture it and offer
// an explicit "Install app" button, which is far more discoverable than the
// browser's own menu item. The button only appears when the browser says the app
// is installable and not already installed. iOS Safari doesn't support this event
// (users install via the Share sheet → Add to Home Screen), so nothing renders
// there — an iOS hint is shown separately in the layouts.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallAppButton({ className = '' }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault() // stop Chrome's mini-infobar; we drive the prompt ourselves
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || !deferred) return null

  return (
    <button
      type="button"
      onClick={async () => {
        await deferred.prompt()
        setDeferred(null) // a prompt can only be used once
      }}
      className={className}
    >
      ⬇ Install app
    </button>
  )
}
