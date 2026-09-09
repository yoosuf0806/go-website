import { Component, type ErrorInfo, type ReactNode } from 'react'

// App-wide safety net. Without a boundary, ANY render error — or a lazy route
// chunk that fails to load (stale deploy, a cached service-worker shell pointing
// at an old hashed chunk, a flaky network) — unmounts the whole React tree and
// leaves a blank white page (Suspense catches loading promises, not errors).
//
// A failed dynamic import is almost always transient: the current deploy has a
// new chunk hash, so a single fresh load fixes it. We auto-reload ONCE for that
// case (guarded so a genuinely-missing chunk can't loop), and otherwise show a
// recoverable "something went wrong" screen instead of nothing.

const RELOAD_KEY = 'go-chunk-reload-at'
const RELOAD_COOLDOWN_MS = 30_000

// Dynamic-import failures surface with different wording per browser.
function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const text = `${error.name} ${error.message}`
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(
    text,
  )
}

interface Props {
  children: ReactNode
}
interface State {
  failed: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && this.tryAutoReload()) return
    // Leave a breadcrumb for support; harmless if the console is closed.
    console.error('App error boundary caught:', error, info.componentStack)
  }

  // Reload at most once per cooldown window so a permanently-missing chunk
  // (e.g. offline) can't spin in a reload loop — after that we show the UI.
  private tryAutoReload(): boolean {
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
      if (Date.now() - last < RELOAD_COOLDOWN_MS) return false
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
      /* private mode — fall through and just reload once */
    }
    window.location.reload()
    return true
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#fdf2f4',
          color: '#3f2a30',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 16px', opacity: 0.8 }}>
            This page couldn’t load. This usually clears after a refresh — if it keeps happening,
            close and reopen the app.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(RELOAD_KEY)
              } catch {
                /* best-effort */
              }
              window.location.reload()
            }}
            style={{
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 9999,
              border: 'none',
              background: '#d92d56',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
