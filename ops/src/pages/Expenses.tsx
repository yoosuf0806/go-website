import { DataManager } from '../components/DataManager'
import { Badge, PageHeader } from '../components/ui'
import { expensesApi, targetsApi } from '../lib/api'
import { lkr, monthLabel, num } from '../lib/format'
import type { OpsMonthlyTarget, OpsOperatingExpense } from '../lib/types'

const toMonthInput = (d: string) => d.slice(0, 7)
const toMonthDate = (v: string) => (v ? v.slice(0, 7) + '-01' : '')

export function Expenses() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Expenses & Targets"
        subtitle="Operating expenses (salary, boxes, rent) and the monthly sales target in pieces."
      />

      <DataManager<OpsOperatingExpense>
        title="Operating expenses"
        api={expensesApi}
        columns={[
          { key: 'month', header: 'Month', render: (r) => monthLabel(r.month) },
          { key: 'category', header: 'Category', render: (r) => <Badge>{r.category}</Badge> },
          { key: 'description', header: 'Description' },
          { key: 'amount_lkr', header: 'Amount', align: 'right', render: (r) => lkr(r.amount_lkr) },
        ]}
        footer={(rows) => (
          <>
            <td className="px-4 py-2" colSpan={3}>
              Total ({rows.length})
            </td>
            <td className="px-4 py-2 text-right tabular-nums">
              {lkr(rows.reduce((a, r) => a + Number(r.amount_lkr), 0))}
            </td>
          </>
        )}
        fields={[
          { name: 'month', label: 'Month', type: 'month', required: true, half: true },
          {
            name: 'category',
            label: 'Category',
            type: 'select',
            required: true,
            half: true,
            options: [
              { value: 'salary', label: 'Salary' },
              { value: 'box', label: 'Box purchase' },
              { value: 'rent', label: 'Rent' },
              { value: 'other', label: 'Other' },
            ],
          },
          { name: 'description', label: 'Description', type: 'text' },
          { name: 'amount_lkr', label: 'Amount (LKR)', type: 'number', step: '0.01', required: true },
        ]}
        toForm={(r) => ({
          month: toMonthInput(r.month),
          category: r.category,
          description: r.description ?? '',
          amount_lkr: String(r.amount_lkr),
        })}
        fromForm={(v) => ({
          month: toMonthDate(v.month),
          category: (v.category || 'other') as OpsOperatingExpense['category'],
          description: v.description || null,
          amount_lkr: Number(v.amount_lkr || 0),
        })}
      />

      <DataManager<OpsMonthlyTarget>
        title="Monthly sales targets"
        api={targetsApi}
        columns={[
          { key: 'month', header: 'Month', render: (r) => monthLabel(r.month) },
          { key: 'target_pcs', header: 'Target (pcs)', align: 'right', render: (r) => num(r.target_pcs) },
          { key: 'note', header: 'Note' },
        ]}
        fields={[
          { name: 'month', label: 'Month', type: 'month', required: true, half: true },
          { name: 'target_pcs', label: 'Target (pcs)', type: 'number', required: true, half: true },
          { name: 'note', label: 'Note', type: 'text' },
        ]}
        toForm={(r) => ({
          month: toMonthInput(r.month),
          target_pcs: String(r.target_pcs),
          note: r.note ?? '',
        })}
        fromForm={(v) => ({
          month: toMonthDate(v.month),
          target_pcs: Number(v.target_pcs || 0),
          note: v.note || null,
        })}
      />
    </div>
  )
}
