import { DataManager } from '../components/DataManager'
import { Badge, Card, Loading, PageHeader } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { fetchWebOrders, salesApi } from '../lib/api'
import { lkr, today } from '../lib/format'
import type { OpsSale } from '../lib/types'

const FLAVORS = ['Cashew', 'Naked', 'Blondie', 'Assorted', 'Fruity', 'Nutella', 'Brownie Cake']

export function Sales() {
  const web = useAsync(() => fetchWebOrders(), [])

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Website B2C orders arrive automatically. Add B2B and offline sales below."
      />

      <div className="mb-8">
        <WebOrdersCard state={web} />
      </div>

      <DataManager<OpsSale>
        title="Manual sales (B2B / offline)"
        api={salesApi}
        searchable={(r, q) =>
          [r.customer, r.flavor, r.ref, r.note].some((v) => (v ?? '').toLowerCase().includes(q))
        }
        columns={[
          { key: 'sale_date', header: 'Date' },
          {
            key: 'channel',
            header: 'Channel',
            render: (r) => <Badge tone={r.channel}>{r.channel.toUpperCase()}</Badge>,
          },
          { key: 'flavor', header: 'Flavor' },
          { key: 'customer', header: 'Customer' },
          { key: 'ref', header: 'Ref' },
          { key: 'qty', header: 'Qty', align: 'right' },
          { key: 'unit_price', header: 'Unit', align: 'right', render: (r) => lkr(r.unit_price) },
          { key: 'amount', header: 'Amount', align: 'right', render: (r) => lkr(r.amount) },
          { key: 'discount', header: 'Disc.', align: 'right', render: (r) => lkr(r.discount) },
        ]}
        footer={(rows) => (
          <>
            <td className="px-4 py-2" colSpan={5}>
              Total ({rows.length})
            </td>
            <td className="px-4 py-2 text-right tabular-nums">
              {rows.reduce((a, r) => a + r.qty, 0)}
            </td>
            <td />
            <td className="px-4 py-2 text-right tabular-nums">
              {lkr(rows.reduce((a, r) => a + Number(r.amount), 0))}
            </td>
            <td className="px-4 py-2 text-right tabular-nums">
              {lkr(rows.reduce((a, r) => a + Number(r.discount), 0))}
            </td>
          </>
        )}
        fields={[
          { name: 'sale_date', label: 'Date', type: 'date', required: true, half: true },
          {
            name: 'channel',
            label: 'Channel',
            type: 'select',
            required: true,
            half: true,
            options: [
              { value: 'b2b', label: 'B2B (wholesale)' },
              { value: 'b2c', label: 'B2C (offline)' },
            ],
          },
          {
            name: 'flavor',
            label: 'Flavor',
            type: 'select',
            half: true,
            options: FLAVORS.map((f) => ({ value: f, label: f })),
          },
          { name: 'customer', label: 'Customer / account', type: 'text', half: true },
          { name: 'ref', label: 'Ref (who took order)', type: 'text', half: true },
          { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true, half: true },
          { name: 'unit_price', label: 'Unit price (LKR)', type: 'number', step: '0.01', required: true, half: true },
          { name: 'discount', label: 'Discount (LKR)', type: 'number', step: '0.01', half: true },
          { name: 'note', label: 'Note', type: 'text' },
        ]}
        toForm={(r) => ({
          sale_date: r.sale_date,
          channel: r.channel,
          flavor: r.flavor ?? '',
          customer: r.customer ?? '',
          ref: r.ref ?? '',
          qty: String(r.qty),
          unit_price: String(r.unit_price),
          discount: String(r.discount),
          note: r.note ?? '',
        })}
        fromForm={(v) => ({
          sale_date: v.sale_date || today(),
          channel: (v.channel || 'b2b') as OpsSale['channel'],
          flavor: v.flavor || null,
          customer: v.customer || null,
          ref: v.ref || null,
          qty: Number(v.qty || 0),
          unit_price: Number(v.unit_price || 0),
          discount: Number(v.discount || 0),
          note: v.note || null,
        })}
      />
    </div>
  )
}

function WebOrdersCard({ state }: { state: ReturnType<typeof useAsync<Awaited<ReturnType<typeof fetchWebOrders>>>> }) {
  const { data, loading, error } = state
  if (loading || error || !data) return <Loading error={error} />
  const recent = data.slice(0, 8)
  const total = data.reduce((a, o) => a + Number(o.subtotal || 0), 0)
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-cocoa-100 px-4 py-3">
        <div className="font-semibold text-cocoa-800">
          Website orders <span className="text-cocoa-400">(live)</span>
        </div>
        <div className="text-sm text-cocoa-500">
          {data.length} orders · {lkr(total)} revenue
        </div>
      </div>
      {recent.length === 0 ? (
        <div className="p-6 text-sm text-cocoa-400">
          No website orders yet — they’ll appear here automatically once customers order online.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cocoa-100 text-left text-xs uppercase tracking-wide text-cocoa-400">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Pieces</th>
              <th className="px-4 py-2 text-right">Subtotal</th>
              <th className="px-4 py-2">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((o) => (
              <tr key={o.id} className="border-b border-cocoa-50">
                <td className="px-4 py-2 text-cocoa-500">{o.order_no}</td>
                <td className="px-4 py-2 font-medium text-cocoa-700">{o.customer_name}</td>
                <td className="px-4 py-2">
                  <Badge>{o.status}</Badge>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{o.total_pieces}</td>
                <td className="px-4 py-2 text-right tabular-nums">{lkr(o.subtotal)}</td>
                <td className="px-4 py-2 text-cocoa-500">{o.delivery_date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
