import { Outlet, Link } from 'react-router-dom'

// Shared storefront chrome. One Header + one Footer for every storefront page
// (spec §8 — shared-footer duplication caused display bugs in the prototype).
export default function StorefrontLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-semibold">
          🍫 Golden Oven
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/shop" className="hover:underline">
            Shop
          </Link>
          <Link to="/corporate" className="hover:underline">
            Corporate &amp; Weddings
          </Link>
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
