import { Suspense, lazy, type ComponentType } from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import PwaManifest from './components/PwaManifest'
import StorefrontLayout from './components/storefront/StorefrontLayout'
import ProtectedRoute from './router/ProtectedRoute'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Corporate from './pages/Corporate'
import Wedding from './pages/Wedding'
import Slab from './pages/Slab'
import TrackOrder from './pages/TrackOrder'
import About from './pages/About'
import Policy from './pages/Policy'
import NotFound from './pages/NotFound'

// Admin and kitchen portals are code-split: each lazy import becomes its own
// chunk, loaded on demand behind the auth gate.
//
// Retry the dynamic import a few times before giving up: a chunk fetch can fail
// on a transient network/DNS blip (observed as ERR_NAME_NOT_RESOLVED / a
// rejected FetchEvent for a not-yet-cached /assets/*.js), which would otherwise
// hard-fail the route. A short backoff usually lets the next attempt succeed; if
// every attempt fails the error still propagates to the app ErrorBoundary, which
// shows a recoverable screen (and auto-reloads once for chunk errors).
async function retryImport<T>(factory: () => Promise<T>, attempts = 3, delayMs = 400): Promise<T> {
  try {
    return await factory()
  } catch (err) {
    if (attempts <= 1) throw err
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return retryImport(factory, attempts - 1, delayMs * 2)
  }
}

function lazyWithRetry<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => retryImport(factory))
}

const AdminLayout = lazyWithRetry(() => import('./components/admin/AdminLayout'))
const Login = lazyWithRetry(() => import('./pages/admin/Login'))
const Dashboard = lazyWithRetry(() => import('./pages/admin/Dashboard'))
const Orders = lazyWithRetry(() => import('./pages/admin/Orders'))
const AdminCalendar = lazyWithRetry(() => import('./pages/admin/Calendar'))
const Inquiries = lazyWithRetry(() => import('./pages/admin/Inquiries'))
const Content = lazyWithRetry(() => import('./pages/admin/Content'))
const Products = lazyWithRetry(() => import('./pages/admin/Products'))
const AddonPricing = lazyWithRetry(() => import('./pages/admin/AddonPricing'))
const GiftVouchers = lazyWithRetry(() => import('./pages/admin/GiftVouchers'))
const Reviews = lazyWithRetry(() => import('./pages/admin/Reviews'))
const Settings = lazyWithRetry(() => import('./pages/admin/Settings'))
const BakeList = lazyWithRetry(() => import('./pages/admin/BakeList'))
const KitchenLogin = lazyWithRetry(() => import('./pages/kitchen/KitchenLogin'))
const KitchenBoard = lazyWithRetry(() => import('./pages/kitchen/KitchenBoard'))
const KitchenCalendar = lazyWithRetry(() => import('./pages/kitchen/KitchenCalendar'))

function AdminFallback() {
  return (
    <div className="grid min-h-screen place-items-center text-sm text-neutral-500">Loading…</div>
  )
}

// Router shell. Storefront routes share one Header/Footer via StorefrontLayout.
// Admin routes are gated by ProtectedRoute (Supabase session check).
export default function App() {
  return (
    <>
      <ScrollToTop />
      <PwaManifest />
      <Routes>
      {/* Storefront */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:slug" element={<ProductDetail />} />
        <Route path="/corporate" element={<Corporate />} />
        <Route path="/wedding" element={<Wedding />} />
        <Route path="/slab" element={<Slab />} />
        <Route path="/track-order" element={<TrackOrder />} />
        <Route path="/about" element={<About />} />
        <Route path="/policies/:slug" element={<Policy />} />
      </Route>

      {/* Admin login (public) */}
      <Route
        path="/admin/login"
        element={
          <Suspense fallback={<AdminFallback />}>
            <Login />
          </Suspense>
        }
      />

      {/* Bake list: standalone, print-optimised, opened in a new tab */}
      <Route
        path="/admin/bake-list"
        element={
          <ProtectedRoute requireRole="admin">
            <Suspense fallback={<AdminFallback />}>
              <BakeList />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Admin back office (gated) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireRole="admin">
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="inquiries" element={<Inquiries />} />
        <Route path="content" element={<Content />} />
        <Route path="products" element={<Products />} />
        <Route path="addon-pricing" element={<AddonPricing />} />
        <Route path="gift-vouchers" element={<GiftVouchers />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Kitchen portal login (public) */}
      <Route
        path="/kitchen/login"
        element={
          <Suspense fallback={<AdminFallback />}>
            <KitchenLogin />
          </Suspense>
        }
      />

      {/* Kitchen portal board (role-gated) */}
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute requireRole="kitchen">
            <Suspense fallback={<AdminFallback />}>
              <KitchenBoard />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Kitchen month schedule (role-gated) */}
      <Route
        path="/kitchen/schedule"
        element={
          <ProtectedRoute requireRole="kitchen">
            <Suspense fallback={<AdminFallback />}>
              <KitchenCalendar />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
