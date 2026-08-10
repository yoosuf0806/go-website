import { DataManager } from '../components/DataManager'
import { PageHeader } from '../components/ui'
import { investmentsApi, sharesApi } from '../lib/api'
import { lkr, pct } from '../lib/format'
import type { OpsInvestment, OpsShare } from '../lib/types'

export function Shares() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Shares & Investment"
        subtitle="Owner equity split and founder investments in the business."
      />

      <DataManager<OpsShare>
        title="Equity holders"
        api={sharesApi}
        columns={[
          { key: 'holder', header: 'Holder' },
          { key: 'share_pct', header: 'Share', align: 'right', render: (r) => pct(r.share_pct) },
          { key: 'earned', header: 'Earned', align: 'right', render: (r) => lkr(r.earned) },
          { key: 'paid', header: 'Paid', align: 'right', render: (r) => lkr(r.paid) },
          {
            key: 'balance',
            header: 'Balance',
            align: 'right',
            render: (r) => lkr(Number(r.earned) - Number(r.paid)),
          },
        ]}
        fields={[
          { name: 'holder', label: 'Holder', type: 'text', required: true, half: true },
          { name: 'share_pct', label: 'Share (0.3333 = 33.33%)', type: 'number', step: '0.0001', required: true, half: true },
          { name: 'earned', label: 'Earned (LKR)', type: 'number', step: '0.01', half: true },
          { name: 'paid', label: 'Paid (LKR)', type: 'number', step: '0.01', half: true },
        ]}
        toForm={(r) => ({
          holder: r.holder,
          share_pct: String(r.share_pct),
          earned: String(r.earned),
          paid: String(r.paid),
        })}
        fromForm={(v) => ({
          holder: v.holder || '',
          share_pct: Number(v.share_pct || 0),
          earned: Number(v.earned || 0),
          paid: Number(v.paid || 0),
        })}
      />

      <DataManager<OpsInvestment>
        title="Founder investments"
        api={investmentsApi}
        columns={[
          { key: 'investor', header: 'Investor' },
          { key: 'item', header: 'Item' },
          { key: 'amount', header: 'Amount', align: 'right', render: (r) => lkr(r.amount) },
        ]}
        footer={(rows) => (
          <>
            <td className="px-4 py-2" colSpan={2}>
              Total invested
            </td>
            <td className="px-4 py-2 text-right tabular-nums">
              {lkr(rows.reduce((a, r) => a + Number(r.amount), 0))}
            </td>
          </>
        )}
        fields={[
          { name: 'investor', label: 'Investor', type: 'text', required: true, half: true },
          { name: 'item', label: 'Item', type: 'text', half: true },
          { name: 'amount', label: 'Amount (LKR)', type: 'number', step: '0.01', required: true },
        ]}
        toForm={(r) => ({ investor: r.investor, item: r.item ?? '', amount: String(r.amount) })}
        fromForm={(v) => ({
          investor: v.investor || '',
          item: v.item || null,
          amount: Number(v.amount || 0),
        })}
      />
    </div>
  )
}
