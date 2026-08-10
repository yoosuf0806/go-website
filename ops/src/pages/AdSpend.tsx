import { DataManager } from '../components/DataManager'
import { Badge, PageHeader } from '../components/ui'
import { adSpendApi } from '../lib/api'
import { lkr, monthLabel } from '../lib/format'
import type { OpsAdSpend } from '../lib/types'

// <input type="month"> gives "YYYY-MM"; the DB column stores the 1st of month.
const toMonthInput = (d: string) => d.slice(0, 7)
const toMonthDate = (v: string) => (v ? v.slice(0, 7) + '-01' : '')

export function AdSpend() {
  return (
    <div>
      <PageHeader
        title="Ad Spend"
        subtitle="Monthly Facebook / TikTok spend. Enter LKR; USD is optional for the record."
      />
      <DataManager<OpsAdSpend>
        title="Advertising spend"
        api={adSpendApi}
        columns={[
          { key: 'month', header: 'Month', render: (r) => monthLabel(r.month) },
          {
            key: 'channel',
            header: 'Channel',
            render: (r) => (
              <Badge tone={r.channel === 'facebook' ? 'b2b' : r.channel === 'tiktok' ? 'warn' : 'default'}>
                {r.channel}
              </Badge>
            ),
          },
          { key: 'amount_lkr', header: 'Amount (LKR)', align: 'right', render: (r) => lkr(r.amount_lkr) },
          {
            key: 'amount_usd',
            header: 'USD',
            align: 'right',
            render: (r) => (r.amount_usd ? '$' + r.amount_usd : '—'),
          },
          { key: 'note', header: 'Note' },
        ]}
        footer={(rows) => (
          <>
            <td className="px-4 py-2" colSpan={2}>
              Total ({rows.length})
            </td>
            <td className="px-4 py-2 text-right tabular-nums">
              {lkr(rows.reduce((a, r) => a + Number(r.amount_lkr), 0))}
            </td>
            <td colSpan={2} />
          </>
        )}
        fields={[
          { name: 'month', label: 'Month', type: 'month', required: true, half: true },
          {
            name: 'channel',
            label: 'Channel',
            type: 'select',
            required: true,
            half: true,
            options: [
              { value: 'facebook', label: 'Facebook' },
              { value: 'tiktok', label: 'TikTok' },
              { value: 'other', label: 'Other' },
            ],
          },
          { name: 'amount_lkr', label: 'Amount (LKR)', type: 'number', step: '0.01', required: true, half: true },
          { name: 'amount_usd', label: 'Amount (USD, optional)', type: 'number', step: '0.01', half: true },
          { name: 'usd_rate', label: 'USD→LKR rate (optional)', type: 'number', step: '0.01', half: true },
          { name: 'note', label: 'Note', type: 'text' },
        ]}
        toForm={(r) => ({
          month: toMonthInput(r.month),
          channel: r.channel,
          amount_lkr: String(r.amount_lkr),
          amount_usd: r.amount_usd == null ? '' : String(r.amount_usd),
          usd_rate: r.usd_rate == null ? '' : String(r.usd_rate),
          note: r.note ?? '',
        })}
        fromForm={(v) => ({
          month: toMonthDate(v.month),
          channel: (v.channel || 'facebook') as OpsAdSpend['channel'],
          amount_lkr: Number(v.amount_lkr || 0),
          amount_usd: v.amount_usd ? Number(v.amount_usd) : null,
          usd_rate: v.usd_rate ? Number(v.usd_rate) : null,
          note: v.note || null,
        })}
      />
    </div>
  )
}
