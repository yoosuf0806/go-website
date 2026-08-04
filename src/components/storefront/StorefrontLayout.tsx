import { useEffect, useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { useCatalog } from '../../contexts/CatalogContext'
import { useCartStore } from '../../stores/cart'
import { useCartUI } from '../../stores/cartUI'
import { lineTotal } from '../../lib/pricing'
import { toWhatsAppNumber, formatLKR } from '../../lib/format'
import WhatsAppIcon from '../ui/WhatsAppIcon'
import BannerBar from './BannerBar'
import PromoTicker from './PromoTicker'
import CartDrawer from './CartDrawer'
import CheckoutModal from './CheckoutModal'

const HEADER_HEIGHT = 68

const NAV = [
  { to: '/slab', label: 'Brownie Slab' },
  { to: '/wedding', label: 'Wedding Orders' },
  { to: '/corporate', label: 'Corporate Orders' },
  { to: '/shop', label: 'Shop All' },
]

// Shared storefront chrome: pink promo marquee, fixed header (transparent over
// the Home hero, solid everywhere else / once scrolled), navy footer, and a
// WhatsApp float.
export default function StorefrontLayout() {
  const { catalog } = useCatalog()
  const { settings } = catalog
  const { pathname } = useLocation()
  const cartOpen = useCartUI((s) => s.open)
  const setCartOpen = useCartUI((s) => s.setOpen)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const waNumber = toWhatsAppNumber(settings.business.whatsapp_number)
  // The header is always solid. It's a sticky bar that takes its own layout
  // space (it never actually overlays the hero image), so the old
  // "transparent white text over the hero" mode just rendered white logo/nav
  // on the white page band above the hero — invisible until you scrolled and
  // it went solid. Keeping it solid makes the menu visible immediately.
  const overDarkHero = false

  // Global "keep shopping" shortcut: a persistent bar so a customer browsing
  // from page to page can jump to the cart without hunting for the header
  // icon. Suppressed on Product Detail (/shop/:slug), which has its own fixed
  // Add-to-Cart bar (ProductConfigurator) that this would visually stack with.
  const items = useCartStore((s) => s.items)
  const cartCount = items.reduce((n, item) => n + item.boxQty, 0)
  const cartSubtotal = items.reduce((n, item) => n + lineTotal(item), 0)
  const onProductDetail = pathname.startsWith('/shop/') && pathname !== '/shop/'
  const showMiniCart = cartCount > 0 && !cartOpen && !checkoutOpen && !onProductDetail

  return (
    <div className="flex min-h-screen flex-col bg-white text-navy">
      <PromoTicker />
      <BannerBar banner={settings.banner} />
      <Header
        transparentOverHero={overDarkHero}
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

      {showMiniCart && (
        // Full-width pill on mobile; on desktop a centered floating pill (so
        // it doesn't stretch edge-to-edge and clears the bottom-right WhatsApp
        // float). Visible on every viewport now — the header cart icon is easy
        // to miss while browsing.
        <div className="fixed inset-x-3.5 bottom-3.5 z-30 lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-[min(440px,90vw)] lg:-translate-x-1/2">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-pink px-4 py-3.5 text-white shadow-[0_12px_24px_-10px_rgba(217,45,86,0.7)] lg:px-6"
          >
            <span className="text-sm opacity-90">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} · {formatLKR(cartSubtotal)}
            </span>
            <span className="text-[15px] font-bold">View cart →</span>
          </button>
        </div>
      )}

      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to place an order.")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed right-7 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-[#25d366]/40 transition-transform hover:scale-110"
          style={{
            bottom: showMiniCart
              ? 'calc(env(safe-area-inset-bottom) + 76px)'
              : 'max(1.75rem, env(safe-area-inset-bottom))',
          }}
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
        solid ? 'border-b border-blush-200 bg-white shadow-sm' : 'bg-white/10 backdrop-blur-md'
      }`}
      style={{ height: HEADER_HEIGHT }}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link to="/" aria-label="Golden Oven — home" className="flex items-center">
          {/* The uploaded logo is a 1080×1350 canvas with the pink wordmark
              centered in lots of whitespace; frame + zoom via object-cover so
              "golden oven" reads large in the header. */}
          <span
            className="block h-14 w-[104px] bg-no-repeat"
            style={{ backgroundImage: 'url(/logo.png)', backgroundSize: '167%', backgroundPosition: '44% 50%' }}
            role="img"
            aria-label="Golden Oven"
          />
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
          <button type="button" onClick={onCartClick} aria-label="Open cart" className={`relative ${fg}`}>
            <BagIcon className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">
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
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link
              to="/"
              aria-label="Golden Oven — home"
              className="inline-block font-display text-2xl font-bold lowercase leading-[0.85] text-pink"
            >
              {/* The logo image has a solid white background (no alpha), so it
                  can't sit on the navy footer — use the pink text wordmark here. */}
              <span className="block">golden</span>
              <span className="block">oven</span>
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
              { to: '/slab', label: 'Brownie Slab' },
              { to: '/corporate', label: 'Bulk Orders' },
              { to: '/shop', label: 'Shop All' },
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
            title="Policies"
            links={[
              { to: '/policies/returns', label: 'Return Policy' },
              { to: '/policies/payment', label: 'Payment Terms' },
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

// Shopping-bag icon (matches the reference header) — inline SVG so it renders
// identically everywhere, unlike the previous 🛒 emoji whose glyph varied by OS.
function BagIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 8h12l-.9 11.1A2 2 0 0 1 15.1 21H8.9a2 2 0 0 1-2-1.9L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
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
