import { useEffect, useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { useCatalog } from '../../contexts/CatalogContext'
import { useCartStore } from '../../stores/cart'
import { toWhatsAppNumber } from '../../lib/format'
import WhatsAppIcon from '../ui/WhatsAppIcon'
import BannerBar from './BannerBar'
import PromoTicker from './PromoTicker'
import CartDrawer from './CartDrawer'
import CheckoutModal from './CheckoutModal'

const HEADER_HEIGHT = 68

const NAV = [
  { to: '/shop', label: 'Shop All' },
  { to: '/corporate', label: 'Bulk Orders' },
  { to: '/shop', label: 'Brownie Slab' },
]

// Shared storefront chrome: pink promo marquee, fixed header (transparent over
// the Home hero, solid everywhere else / once scrolled), navy footer, and a
// WhatsApp float.
export default function StorefrontLayout() {
  const { catalog } = useCatalog()
  const { settings } = catalog
  const { pathname } = useLocation()
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const waNumber = toWhatsAppNumber(settings.business.whatsapp_number)
  const isHome = pathname === '/'

  return (
    <div className="flex min-h-screen flex-col bg-white text-navy">
      <PromoTicker />
      <BannerBar banner={settings.banner} />
      <Header
        transparentOverHero={isHome}
        onCartClick={() => setCartOpen(true)}
        onMenuClick={() => setMobileNav(true)}
      />
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
          className="fixed bottom-safe right-7 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-[#25d366]/40 transition-transform hover:scale-110"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      )}
    </div>
  )
}

function Header({
  transparentOverHero,
  onCartClick,
  onMenuClick,
}: {
  transparentOverHero: boolean
  onCartClick: () => void
  onMenuClick: () => void
}) {
  const itemCount = useCartStore((s) => s.items.reduce((n, item) => n + item.boxQty, 0))
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!transparentOverHero) return
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [transparentOverHero])

  const solid = !transparentOverHero || scrolled
  const fg = solid ? 'text-navy' : 'text-white'

  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-300 ${
        solid ? 'border-b border-neutral-100 bg-white shadow-sm' : 'bg-white/10 backdrop-blur-md'
      }`}
      style={{ height: HEADER_HEIGHT }}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link to="/" className={`font-display text-2xl font-extrabold text-pink`}>
          Golden Oven
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-pink ${isActive ? 'text-pink' : fg}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button type="button" onClick={onCartClick} aria-label="Open cart" className={`relative text-2xl ${fg}`}>
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
            <span className={`h-0.5 w-6 rounded ${solid ? 'bg-navy' : 'bg-white'}`} />
            <span className={`h-0.5 w-6 rounded ${solid ? 'bg-navy' : 'bg-white'}`} />
            <span className={`h-0.5 w-6 rounded ${solid ? 'bg-navy' : 'bg-white'}`} />
          </button>
        </div>
      </div>
    </header>
  )
}

function MobileNav({ onClose, onCartClick }: { onClose: () => void; onCartClick: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-navy md:hidden">
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full text-white"
      >
        ✕
      </button>
      <Link to="/" onClick={onClose} className="px-6 py-2.5 font-display text-3xl font-semibold text-white">
        Home
      </Link>
      {NAV.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          onClick={onClose}
          className="px-6 py-2.5 font-display text-3xl font-semibold text-white"
        >
          {item.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={() => {
          onClose()
          onCartClick()
        }}
        className="mt-6 rounded-full bg-pink px-9 py-3.5 text-[15px] font-bold text-white"
      >
        View Cart 🛒
      </button>
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
                  className="flex h-10 items-center rounded-full bg-white/10 px-4 text-sm font-medium text-white hover:bg-pink"
                >
                  Google Reviews
                </a>
              )}
              {wa && (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-pink"
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          <FooterCol
            title="Shop"
            links={[
              { to: '/shop', label: 'Shop All' },
              { to: '/corporate', label: 'Bulk Orders' },
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
