import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { CatalogProvider, CartSync } from './contexts/CatalogContext'
import './index.css'

// React Query is used ONLY for runtime writes (orders, inquiries) and admin CRUD.
// The storefront catalogue seeds from the build-time snapshot, then CatalogProvider
// refetches it live from Supabase so admin changes appear without a rebuild.
const queryClient = new QueryClient()

const app = (
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <CatalogProvider>
          <CartSync />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CatalogProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
)

// Public routes are prerendered to static HTML for SEO (scripts/prerender.ts);
// crawlers read that markup directly. In the browser we client-render over it
// rather than hydrate — the prerendered DOM is replaced by an identical React
// tree, which sidesteps hydration-mismatch fragility (e.g. active-nav state)
// while keeping the SEO benefit and instant first paint.
const container = document.getElementById('root')!
container.textContent = ''
createRoot(container).render(app)
