import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { settings } from '../../data/catalog'
import { useCartStore } from '../../stores/cart'
import BannerBar from './BannerBar'
import CartDrawer from './CartDrawer'
import CheckoutModal from './CheckoutModal'

// Shared storefront chrome. One Header + one Footer for every storefront page
// (spec §8 — shared-footer duplication caused display bugs in the prototype).
// The cart drawer and checkout modal live here so they're reachable from any
// storefront page via the header's cart button.
export default function StorefrontLayout() {
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <BannerBar banner={settings.banner} />
      <Header onCartClick={() => setCartOpen(true)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />

      {cartOpen && (
        <CartDrawer
          onClose={() => setCartOpen(false)}
          onCheckout={() => {
            setCartOpen(false)
            setCheckoutOpen(true)
          }}
        />
      )}
      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </div>
  )
}

function Header({ onCartClick }: { onCartClick: () => void }) {
  const itemCount = useCartStore((s) => s.items.reduce((n, item) => n + item.boxQty, 0))

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-semibold">
          🍫 Golden Oven
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/shop" className="hover:underline">
            Shop
          </Link>
          <Link to="/corporate" className="hover:underline">
            Corporate &amp; Weddings
          </Link>
          <button
            type="button"
            onClick={onCartClick}
            aria-label="Open cart"
            className="relative rounded-full border border-neutral-300 px-3 py-1.5 hover:border-amber-400"
          >
            🛒
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
                {itemCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-neutral-500">
        © {new Date().getFullYear()} Golden Oven Brownies — Sri Lanka
      </div>
    </footer>
  )
}
