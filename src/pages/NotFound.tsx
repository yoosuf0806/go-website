import { Link } from 'react-router-dom'

// 404 catch-all. Polished in Phase 10.
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="text-3xl font-semibold">404</h1>
        <p className="mt-2 text-neutral-600">This page could not be found.</p>
        <Link to="/" className="mt-4 inline-block text-sm underline">
          Back to home
        </Link>
      </div>
    </div>
  )
}
