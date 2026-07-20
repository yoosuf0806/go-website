import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import StorefrontLayout from './components/storefront/StorefrontLayout'
import ProtectedRoute from './router/ProtectedRoute'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Corporate from './pages/Corporate'
import NotFound from './pages/NotFound'

// Admin and kitchen portals are code-split: each lazy import becomes its own
// chunk, loaded on demand behind the auth gate.
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const Login = lazy(() => import('./pages/admin/Login'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Orders = lazy(() => import('./pages/admin/Orders'))
const Inquiries = lazy(() => import('./pages/admin/Inquiries'))
const Content = lazy(() => import('./pages/admin/Content'))
const Products = lazy(() => import('./pages/admin/Products'))
const AddonPricing = lazy(() => import('./pages/admin/AddonPricing'))
const Reviews = lazy(() => import('./pages/admin/Reviews'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const BakeList = lazy(() => import('./pages/admin/BakeList'))
const KitchenLogin = lazy(() => import('./pages/kitchen/KitchenLogin'))
const KitchenBoard = lazy(() => import('./pages/kitchen/KitchenBoard'))

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
      <Routes>
      {/* Storefront */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:slug" element={<ProductDetail />} />
        <Route path="/corporate" element={<Corporate />} />
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
          <ProtectedRoute>
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
          <ProtectedRoute>
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="inquiries" element={<Inquiries />} />
        <Route path="content" element={<Content />} />
        <Route path="products" element={<Products />} />
        <Route path="addon-pricing" element={<AddonPricing />} />
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

      <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
