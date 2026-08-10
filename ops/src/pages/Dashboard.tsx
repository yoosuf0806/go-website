import { useMemo, useState } from 'react'
import { useFinance } from '../hooks/useFinance'
import { listFinancialYears } from '../lib/finance'
import { fyLabel, lkr, monthLabel, num, pct } from '../lib/format'
import { Card, Loading, PageHeader, Select, StatCard } from '../components/ui'

export function Dashboard() {
  const { data, loading, error } = useFinance()
  const [fy, setFy] = useState<number | 'all'>('all')

  const years = useMemo(() => (data ? listFinancialYears(data.monthly) : []), [data])
  const rows = useMemo(() => {
    if (!data) return []
    return fy === 'all' ? data.monthly : data.monthly.filter((r) => r.fy === fy)
  }, [data, fy])

  if (loading || error || !data) return <Loading error={error} />

  const totals = rows.reduce(
    (a, r) => ({
      sales: a.sales + r.totalSales,
      adSpend: a.adSpend + r.adSpend,
      netProfit: a.netProfit + r.netProfit,
      newCustomers: a.newCustomers + r.newCustomers,
      pieces: a.pieces + r.pieces,
    }),
    { sales: 0, adSpend: 0, netProfit: 0, newCustomers: 0, pieces: 0 },
  )
  const blendedRoas = totals.adSpend > 0 ? totals.sales / totals.adSpend : null

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Monthly income, ad spend and sales gained from advertising."
        actions={
          <Select value={String(fy)} onChange={(e) => setFy(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">All time</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {fyLabel(y)}
              </option>
            ))}
          </Select>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total Sales" value={lkr(totals.sales)} />
        <StatCard label="Ad Spend" value={lkr(totals.adSpend)} />
        <StatCard
          label="Net Profit"
          value={lkr(totals.netProfit)}
          tone={totals.netProfit >= 0 ? 'good' : 'bad'}
        />
        <StatCard label="New Customers" value={num(totals.newCustomers)} sub="from web orders" />
        <StatCard
          label="Blended ROAS"
          value={blendedRoas ? blendedRoas.toFixed(2) + '×' : '—'}
          sub="sales ÷ ad spend"
        />
      </div>

      {/* ── Monthly income ─────────────────────────────────────────────── */}
      <Card className="mb-8 overflow-x-auto">
        <div className="border-b border-cocoa-100 px-4 py-3 font-semibold text-cocoa-800">
          Monthly Income
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cocoa-100 text-left text-xs uppercase tracking-wide text-cocoa-400">
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2 text-right">B2C</th>
              <th className="px-4 py-2 text-right">B2B</th>
              <th className="px-4 py-2 text-right">Total Sales</th>
              <th className="px-4 py-2 text-right">Purchases</th>
              <th className="px-4 py-2 text-right">Ad Spend</th>
              <th className="px-4 py-2 text-right">Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.monthKey} className="border-b border-cocoa-50">
                <td className="px-4 py-2 font-medium text-cocoa-700">{monthLabel(r.monthKey)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{lkr(r.b2cSales)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{lkr(r.b2bSales)}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{lkr(r.totalSales)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-cocoa-500">{lkr(r.purchases)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-cocoa-500">{lkr(r.adSpend)}</td>
                <td
                  className={`px-4 py-2 text-right font-medium tabular-nums ${
                    r.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {lkr(r.netProfit)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-cocoa-400">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* ── Ad spend vs sales gained ───────────────────────────────────── */}
      <Card className="overflow-x-auto">
        <div className="border-b border-cocoa-100 px-4 py-3">
          <div className="font-semibold text-cocoa-800">Advertising ROI — sales gained per month</div>
          <div className="text-xs text-cocoa-400">
            Monthly attribution: new customers = first-time web buyers that month. ROAS = total
            sales ÷ ad spend.
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cocoa-100 text-left text-xs uppercase tracking-wide text-cocoa-400">
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2 text-right">Ad Spend</th>
              <th className="px-4 py-2 text-right">Total Sales</th>
              <th className="px-4 py-2 text-right">Web Orders</th>
              <th className="px-4 py-2 text-right">New Customers</th>
              <th className="px-4 py-2 text-right">Cost / New Cust.</th>
              <th className="px-4 py-2 text-right">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.monthKey} className="border-b border-cocoa-50">
                <td className="px-4 py-2 font-medium text-cocoa-700">{monthLabel(r.monthKey)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{lkr(r.adSpend)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{lkr(r.totalSales)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{num(r.webOrders)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{num(r.newCustomers)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-cocoa-500">
                  {r.costPerNewCustomer ? lkr(r.costPerNewCustomer) : '—'}
                </td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">
                  {r.roas ? r.roas.toFixed(2) + '×' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="mt-4 text-xs text-cocoa-400">
        Web B2C sales flow in live from the storefront. B2B sales, ad spend, purchasing and expenses
        are entered on their own pages. Net profit = sales − purchases − ad spend − discounts −
        operating expenses. Margins reference: gross ≈ {pct(0.55)}–{pct(0.63)} per flavour (see
        Costing).
      </p>
    </div>
  )
}
