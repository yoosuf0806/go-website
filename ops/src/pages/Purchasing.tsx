import { DataManager } from '../components/DataManager'
import { Badge, PageHeader } from '../components/ui'
import { purchasesApi } from '../lib/api'
import { lkr, today } from '../lib/format'
import type { OpsPurchase } from '../lib/types'

export function Purchasing() {
  return (
    <div>
      <PageHeader
        title="Purchasing"
        subtitle="Ingredient, packaging and equipment purchases — these are your cost of goods (COGS)."
      />
      <DataManager<OpsPurchase>
        title="Purchases"
        api={purchasesApi}
        searchable={(r, q) => [r.item, r.note].some((v) => (v ?? '').toLowerCase().includes(q))}
        columns={[
          { key: 'purchase_date', header: 'Date' },
          { key: 'item', header: 'Item' },
          { key: 'qty', header: 'Qty' },
          {
            key: 'category',
            header: 'Category',
            render: (r) => <Badge>{r.category}</Badge>,
          },
          { key: 'amount_lkr', header: 'Amount', align: 'right', render: (r) => lkr(r.amount_lkr) },
        ]}
        footer={(rows) => (
          <>
            <td className="px-4 py-2" colSpan={4}>
              Total ({rows.length})
            </td>
            <td className="px-4 py-2 text-right tabular-nums">
              {lkr(rows.reduce((a, r) => a + Number(r.amount_lkr), 0))}
            </td>
          </>
        )}
        fields={[
          { name: 'purchase_date', label: 'Date', type: 'date', required: true, half: true },
          {
            name: 'category',
            label: 'Category',
            type: 'select',
            required: true,
            half: true,
            options: [
              { value: 'ingredient', label: 'Ingredient' },
              { value: 'packaging', label: 'Packaging' },
              { value: 'equipment', label: 'Equipment' },
              { value: 'other', label: 'Other' },
            ],
          },
          { name: 'item', label: 'Item', type: 'text', required: true },
          { name: 'qty', label: 'Qty (e.g. 4kg, 20)', type: 'text', half: true },
          { name: 'amount_lkr', label: 'Amount (LKR)', type: 'number', step: '0.01', required: true, half: true },
          { name: 'note', label: 'Note', type: 'text' },
        ]}
        toForm={(r) => ({
          purchase_date: r.purchase_date,
          category: r.category,
          item: r.item,
          qty: r.qty ?? '',
          amount_lkr: String(r.amount_lkr),
          note: r.note ?? '',
        })}
        fromForm={(v) => ({
          purchase_date: v.purchase_date || today(),
          category: (v.category || 'ingredient') as OpsPurchase['category'],
          item: v.item || '',
          qty: v.qty || null,
          amount_lkr: Number(v.amount_lkr || 0),
          note: v.note || null,
        })}
      />
    </div>
  )
}
