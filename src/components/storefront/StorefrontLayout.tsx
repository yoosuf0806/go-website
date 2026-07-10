import { useState } from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'
import { useCatalog } from '../../contexts/CatalogContext'
import { useCartStore } from '../../stores/cart'
import { toWhatsAppNumber } from '../../lib/format'
import BannerBar from './BannerBar'
import PromoTicker from './PromoTicker'
import CartDrawer from './CartDrawer'
import CheckoutModal from './CheckoutModal'

const NAV = [
  { to: '/shop', label: 'Shop All' },
  { to: '/corporate', label: 'Corporate Gifting' },
  { to: '/corporate', label: 'Brownies for Wedding' },
  { to: '/shop', label: 'Brownie Slab' },
]

// Shared storefront chrome (reference-matched): pink promo marquee, sticky white
// header with occasion nav + mobile drawer, navy footer, and a WhatsApp float.
export default function StorefrontLayout() {
  const { catalog } = useCatalog()
  const { settings } = catalog
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const waNumber = toWhatsAppNumber(settings.business.whatsapp_number)

  return (
    <div className="flex min-h-screen flex-col bg-white text-navy">
      <PromoTicker />
      <BannerBar banner={settings.banner} />
      <Header onCartClick={() => setCartOpen(true)} onMenuClick={() => setMobileNav(true)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />

      {mobileNav && <MobileNav onClose={() => setMobileNav(false)} onCartClick={() => setCartOpen(true)} />}
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

      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to place an order.")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-7 right-7 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-2xl shadow-lg shadow-[#25d366]/40 transition-transform hover:scale-110"
        >
          💬
        </a>
      )}
    </div>
  )
}

function Header({ onCartClick, onMenuClick }: { onCartClick: () => void; onMenuClick: () => void }) {
  const itemCount = useCartStore((s) => s.items.reduce((n, item) => n + item.boxQty, 0))

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-display text-2xl lowercase text-pink">
          golden oven
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-bold transition-colors hover:text-pink ${isActive ? 'text-pink' : 'text-navy'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCartClick}
            aria-label="Open cart"
            className="relative text-2xl"
          >
            🛒
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="flex flex-col gap-[5px] p-1 md:hidden"
          >
            <span className="h-0.5 w-6 rounded bg-navy" />
            <span className="h-0.5 w-6 rounded bg-navy" />
            <span className="h-0.5 w-6 rounded bg-navy" />
          </button>
        </div>
      </div>
    </header>
  )
}

function MobileNav({ onClose, onCartClick }: { onClose: () => void; onCartClick: () => void }) {
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button aria-label="Close menu" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <span className="font-display text-xl lowercase text-pink">golden oven</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-warmgray"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 py-2">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={onClose}
              className="block border-l-[3px] border-transparent px-6 py-3.5 text-[15px] font-bold text-navy hover:border-pink hover:bg-pink-light hover:text-pink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            onClick={() => {
              onClose()
              onCartClick()
            }}
            className="w-full rounded-full bg-pink py-3 text-sm font-bold text-white"
          >
            View Cart 🛒
          </button>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  const { catalog } = useCatalog()
  const { business } = catalog.settings
  const wa = toWhatsAppNumber(business.whatsapp_number)
  return (
    <footer className="bg-navy px-6 pb-8 pt-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="font-display text-2xl lowercase text-pink">
              golden oven
            </Link>
            <p className="mt-4 max-w-xs text-sm text-white/70">
              Celebrate your little wins. Premium brownies baked fresh to order. Islandwide delivery
              across Sri Lanka.
            </p>
            <div className="mt-4 flex gap-3">
              {business.google_business_url && (
                <a
                  href={business.google_business_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-pink"
                  aria-label="Reviews"
                >
                  ⭐
                </a>
              )}
              {wa && (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-pink"
                  aria-label="WhatsApp"
                >
                  💬
                </a>
              )}
            </div>
          </div>

          <FooterCol
            title="Shop"
            links={[
              { to: '/shop', label: 'Shop All' },
              { to: '/corporate', label: 'Corporate Gifting' },
              { to: '/corporate', label: 'Wedding Orders' },
              { to: '/shop', label: 'Brownie Slab' },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { to: '/', label: 'Our Story' },
              { to: '/corporate', label: 'Contact Us' },
            ]}
          />
          <FooterCol
            title="Delivery"
            links={[
              { to: '/shop', label: 'Delivery Zones' },
              { to: '/shop', label: 'How It Works' },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col justify-between gap-2 border-t border-white/10 pt-6 text-[13px] text-white/50 sm:flex-row">
          <span>© {new Date().getFullYear()} Golden Oven Brownies. All rights reserved.</span>
          <span>Made with 🍫 in Sri Lanka</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-display text-xs uppercase tracking-widest text-white/50">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className="text-sm text-white/80 hover:text-pink">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
