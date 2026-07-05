import { useState } from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'
import { settings } from '../../data/catalog'
import { useCartStore } from '../../stores/cart'
import BannerBar from './BannerBar'
import PromoTicker from './PromoTicker'
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
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <PromoTicker />
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

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors hover:text-wine ${isActive ? 'text-wine' : 'text-ink/70'}`

function Header({ onCartClick }: { onCartClick: () => void }) {
  const itemCount = useCartStore((s) => s.items.reduce((n, item) => n + item.boxQty, 0))

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-2 items-center px-4 py-4 md:grid-cols-3">
        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/shop" className={navLinkClass}>
            Shop All
          </NavLink>
          <NavLink to="/corporate" className={navLinkClass}>
            Corporate Gifting
          </NavLink>
        </nav>

        <Link
          to="/"
          className="text-xl font-bold uppercase tracking-tight md:text-center md:text-2xl"
        >
          Golden Oven
        </Link>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCartClick}
            aria-label="Open cart"
            className="relative rounded-full border border-ink/15 px-3 py-1.5 text-sm hover:border-wine"
          >
            Cart
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-wine text-xs text-cream">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center justify-center gap-6 border-t border-ink/10 py-2 md:hidden">
        <NavLink to="/shop" className={navLinkClass}>
          Shop All
        </NavLink>
        <NavLink to="/corporate" className={navLinkClass}>
          Corporate Gifting
        </NavLink>
      </nav>
    </header>
  )
}

function Footer() {
  const { business } = settings
  return (
    <footer className="mt-16 border-t border-ink/10 bg-cream">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <h3 className="text-sm font-semibold">About</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li>
              <Link to="/" className="hover:text-wine">
                Our Story
              </Link>
            </li>
            <li>
              <Link to="/corporate" className="hover:text-wine">
                Corporate Gifting
              </Link>
            </li>
            <li>
              <Link to="/shop" className="hover:text-wine">
                Shop All
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li>Colombo, Sri Lanka</li>
            {business.whatsapp_number && <li>WhatsApp: +{business.whatsapp_number}</li>}
            <li>9:00am – 6:00pm, Mon–Sat</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Get Help</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li>
              <Link to="/shop" className="hover:text-wine">
                Delivery &amp; ordering
              </Link>
            </li>
            {business.google_business_url && (
              <li>
                <a
                  href={business.google_business_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-wine"
                >
                  Reviews
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Order on WhatsApp</h3>
          <p className="mt-3 text-sm text-ink/70">
            No online payment — confirm your order over a WhatsApp message.
          </p>
        </div>
      </div>

      <div className="border-t border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-ink/50">
          <span>© {new Date().getFullYear()} Golden Oven Brownies</span>
          <span>Sri Lanka (LKR Rs.)</span>
        </div>
      </div>

      {/* Oversized poster wordmark strip */}
      <div className="overflow-hidden">
        <p className="select-none whitespace-nowrap px-2 text-center font-poster leading-none tracking-tight text-ink [font-size:16vw]">
          GOLDEN OVEN
        </p>
      </div>
    </footer>
  )
}
