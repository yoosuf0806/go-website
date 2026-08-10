import { useMemo, useState } from 'react'
import { useFinance } from '../hooks/useFinance'
import { incomeStatement, listFinancialYears } from '../lib/finance'
import { fyLabel, lkr, pct } from '../lib/format'
import { Card, Loading, PageHeader, Select } from '../components/ui'

export function IncomeStatement() {
  const { data, loading, error } = useFinance()
  const years = useMemo(() => (data ? listFinancialYears(data.monthly) : []), [data])
  const [fy, setFy] = useState<number | null>(null)

  const activeFy = fy ?? years[0] ?? new Date().getFullYear()
  const stmt = useMemo(
    () => (data ? incomeStatement(data.monthly, data.expenses, activeFy) : null),
    [data, activeFy],
  )

  if (loading || error || !data || !stmt) return <Loading error={error} />

  const grossMargin = stmt.sales > 0 ? stmt.grossProfit / stmt.sales : null
  const netMargin = stmt.sales > 0 ? stmt.netProfit / stmt.sales : null

  const rows: { label: string; value: number; kind?: 'sub' | 'total' | 'expense' }[] = [
    { label: 'Sales', value: stmt.sales },
    { label: 'Less: Purchases (COGS)', value: -stmt.purchases, kind: 'expense' },
    { label: 'Gross Profit', value: stmt.grossProfit, kind: 'sub' },
    { label: 'Less: Marketing / Ad spend', value: -stmt.marketing, kind: 'expense' },
    { label: 'Less: Discounts', value: -stmt.discounts, kind: 'expense' },
    { label: 'Less: Salary', value: -stmt.salary, kind: 'expense' },
    { label: 'Less: Box purchase', value: -stmt.boxPurchase, kind: 'expense' },
    { label: 'Less: Other expenses', value: -stmt.otherExpenses, kind: 'expense' },
    { label: 'Net Profit', value: stmt.netProfit, kind: 'total' },
  ]

  return (
    <div>
      <PageHeader
        title="Income Statement"
        subtitle={`Financial year starts March 5. ${stmt.months} month(s) of data.`}
        actions={
          <Select value={String(activeFy)} onChange={(e) => setFy(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {fyLabel(y)}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-cocoa-100 px-5 py-3 font-semibold text-cocoa-800">
            {fyLabel(activeFy)}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.label}
                  className={
                    r.kind === 'total'
                      ? 'border-t-2 border-cocoa-300 text-base font-bold text-cocoa-900'
                      : r.kind === 'sub'
                        ? 'border-t border-cocoa-200 font-semibold text-cocoa-800'
                        : 'text-cocoa-600'
                  }
                >
                  <td className="px-5 py-2.5">{r.label}</td>
                  <td
                    className={`px-5 py-2.5 text-right tabular-nums ${
                      r.value < 0 ? 'text-cocoa-500' : ''
                    } ${r.kind === 'total' ? (r.value >= 0 ? 'text-emerald-600' : 'text-rose-600') : ''}`}
                  >
                    {lkr(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-cocoa-400">Gross margin</div>
            <div className="mt-1 text-2xl font-semibold text-cocoa-800">{pct(grossMargin)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-cocoa-400">Net margin</div>
            <div
              className={`mt-1 text-2xl font-semibold ${
                (netMargin ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {pct(netMargin)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-cocoa-400">Total expenses</div>
            <div className="mt-1 text-2xl font-semibold text-cocoa-800">{lkr(stmt.totalExpenses)}</div>
            <div className="mt-0.5 text-xs text-cocoa-400">excl. COGS</div>
          </Card>
        </div>
      </div>

      <p className="mt-4 text-xs text-cocoa-400">
        Sales, purchases, marketing and discounts are rolled up from the monthly data (web orders +
        manual entries). Salary, box and other expenses come from the Expenses page. Net profit =
        gross profit − marketing − discounts − salary − box − other.
      </p>
    </div>
  )
}
