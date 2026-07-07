import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchBakeList } from '../../lib/bakeList'
import { formatDate } from '../../lib/format'

// Bake list — print-optimised route /admin/bake-list?date=YYYY-MM-DD, opened in
// a new tab (spec §7). Grouped by product → package → total pieces for all
// non-cancelled orders due that date. Print styles hide the toolbar.
export default function BakeList() {
  const [params] = useSearchParams()
  const date = params.get('date') ?? new Date().toISOString().slice(0, 10)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'bake-list', date],
    queryFn: () => fetchBakeList(date),
    staleTime: 15_000,
  })

  return (
    <div className="mx-auto max-w-2xl p-6 print:p-0">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bake list</h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Print
        </button>
      </div>

      <h2 className="text-lg font-semibold">Bake list · {formatDate(date)}</h2>

      {isLoading && <p className="mt-4 text-sm text-neutral-500">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-700">Failed to load: {error.message}</p>}
      {data && data.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">No orders due on this date.</p>
      )}

      {data && data.length > 0 && (
        <div className="mt-4 flex flex-col gap-5">
          {data.map((group) => (
            <section key={group.productName}>
              <div className="flex items-baseline justify-between border-b border-neutral-300 pb-1">
                <h3 className="font-semibold">{group.productName}</h3>
                <span className="text-sm text-neutral-600">{group.totalPieces} pcs total</span>
              </div>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {group.packages.map((pkg) => (
                  <li key={pkg.packageLabel} className="flex justify-between">
                    <span>
                      {pkg.packageLabel} × {pkg.boxes}{' '}
                      {pkg.boxes === 1 ? 'box' : 'boxes'}
                    </span>
                    <span className="text-neutral-600">{pkg.pieces} pcs</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
