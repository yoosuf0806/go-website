import { Routes, Route } from 'react-router-dom'
import StorefrontLayout from './components/storefront/StorefrontLayout'
import AdminLayout from './components/admin/AdminLayout'
import ProtectedRoute from './router/ProtectedRoute'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Corporate from './pages/Corporate'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Orders from './pages/admin/Orders'
import Inquiries from './pages/admin/Inquiries'
import Products from './pages/admin/Products'
import AddonPricing from './pages/admin/AddonPricing'
import Reviews from './pages/admin/Reviews'
import Settings from './pages/admin/Settings'
import BakeList from './pages/admin/BakeList'
import NotFound from './pages/NotFound'

// Router shell. Storefront routes share one Header/Footer via StorefrontLayout.
// Admin routes are gated by ProtectedRoute (Supabase session check).
export default function App() {
  return (
    <Routes>
      {/* Storefront */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/corporate" element={<Corporate />} />
      </Route>

      {/* Admin login (public) */}
      <Route path="/admin/login" element={<Login />} />

      {/* Bake list: standalone, print-optimised, opened in a new tab */}
      <Route
        path="/admin/bake-list"
        element={
          <ProtectedRoute>
            <BakeList />
          </ProtectedRoute>
        }
      />

      {/* Admin back office (gated) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="inquiries" element={<Inquiries />} />
        <Route path="products" element={<Products />} />
        <Route path="addon-pricing" element={<AddonPricing />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
