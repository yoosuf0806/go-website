import { DataManager } from '../components/DataManager'
import { Badge, PageHeader } from '../components/ui'
import { pipelineApi } from '../lib/api'
import { num } from '../lib/format'
import type { OpsB2BPipeline, PipelineStatus } from '../lib/types'

const STATUS_TONE: Record<PipelineStatus, string> = {
  prospect: 'default',
  new_sale: 'b2b',
  retainer: 'good',
  won: 'good',
  lost: 'bad',
}

export function Pipeline() {
  return (
    <div>
      <PageHeader
        title="B2B Pipeline"
        subtitle="Corporate & wholesale prospects — industry, deal value, status and next step."
      />
      <DataManager<OpsB2BPipeline>
        title="Pipeline"
        api={pipelineApi}
        searchable={(r, q) =>
          [r.customer, r.industry, r.solution, r.contact].some((v) =>
            (v ?? '').toLowerCase().includes(q),
          )
        }
        columns={[
          { key: 'tier', header: 'Tier', render: (r) => <Badge>{r.tier}</Badge> },
          { key: 'customer', header: 'Customer' },
          { key: 'industry', header: 'Industry' },
          { key: 'solution', header: 'Solution' },
          {
            key: 'value_000',
            header: "Value '000",
            align: 'right',
            render: (r) => (r.value_000 == null ? '—' : num(r.value_000)),
          },
          { key: 'contact', header: 'Contact' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status.replace('_', ' ')}</Badge>,
          },
          { key: 'next_step', header: 'Next step' },
        ]}
        fields={[
          {
            name: 'tier',
            label: 'Tier',
            type: 'select',
            required: true,
            half: true,
            options: [
              { value: 'high', label: 'High realisation' },
              { value: 'medium', label: 'Medium realisation' },
              { value: 'prospect', label: 'Prospect' },
              { value: 'corporate', label: 'Corporate' },
            ],
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            half: true,
            options: [
              { value: 'prospect', label: 'Prospect' },
              { value: 'new_sale', label: 'New sale' },
              { value: 'retainer', label: 'Retainer' },
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
            ],
          },
          { name: 'customer', label: 'Customer', type: 'text', required: true },
          { name: 'industry', label: 'Industry', type: 'text', half: true },
          { name: 'value_000', label: "Value '000 (LKR)", type: 'number', step: '0.01', half: true },
          { name: 'solution', label: 'Solution', type: 'text' },
          { name: 'contact', label: 'Contact', type: 'text' },
          { name: 'next_step', label: 'Next step', type: 'text' },
        ]}
        toForm={(r) => ({
          tier: r.tier,
          status: r.status,
          customer: r.customer,
          industry: r.industry ?? '',
          value_000: r.value_000 == null ? '' : String(r.value_000),
          solution: r.solution ?? '',
          contact: r.contact ?? '',
          next_step: r.next_step ?? '',
        })}
        fromForm={(v) => ({
          tier: (v.tier || 'prospect') as OpsB2BPipeline['tier'],
          status: (v.status || 'prospect') as PipelineStatus,
          customer: v.customer || '',
          industry: v.industry || null,
          value_000: v.value_000 ? Number(v.value_000) : null,
          solution: v.solution || null,
          contact: v.contact || null,
          next_step: v.next_step || null,
        })}
      />
    </div>
  )
}
