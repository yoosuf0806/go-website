import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

// Server entry for the build-time prerender (scripts/prerender.ts). Renders a
// given storefront URL to an HTML string and collects the <head> tags that
// react-helmet-async produced for that route.
export function render(url: string): { html: string; head: string } {
  const helmetContext: { helmet?: HelmetServerState } = {}
  const queryClient = new QueryClient()

  const html = renderToString(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={queryClient}>
          <StaticRouter location={url}>
            <App />
          </StaticRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </StrictMode>,
  )

  const { helmet } = helmetContext
  const head = helmet
    ? [
        helmet.title.toString(),
        helmet.meta.toString(),
        helmet.link.toString(),
        helmet.script.toString(),
      ].join('')
    : ''

  return { html, head }
}
