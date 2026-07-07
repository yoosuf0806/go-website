import { useState } from 'react'
import {
  useAdminInquiries,
  useUpdateInquiryStatus,
} from '../../hooks/useAdminInquiries'
import {
  INQUIRY_STATUS_LABELS,
  type AdminInquiry,
  type InquiryStatus,
} from '../../lib/adminInquiries'
import { formatDate, toWhatsAppNumber } from '../../lib/format'
import { printQuotation } from '../../lib/inquirySlip'
import ConvertToOrderModal from '../../components/admin/ConvertToOrderModal'
import Toast from '../../components/ui/Toast'

const STATUS_STYLES: Record<InquiryStatus, string> = {
  new: 'bg-amber-100 text-amber-800',
  contacted: 'bg-blue-100 text-blue-800',
  quoted: 'bg-purple-100 text-purple-800',
  converted: 'bg-green-100 text-green-800',
  closed: 'bg-neutral-200 text-neutral-600',
}

// Admin Inquiries (spec §7): card list by status with mark contacted/quoted/
// closed, WhatsApp quick-chat, quotation PDF, and convert-to-order.
export default function Inquiries() {
  const { data: inquiries, isLoading, isError, error } = useAdminInquiries()
  const updateStatus = useUpdateInquiryStatus()
  const [converting, setConverting] = useState<AdminInquiry | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  return (
    <div>
      <h1 className="text-xl font-semibold">Inquiries</h1>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading inquiries…</p>}
      {isError && (
        <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load inquiries: {error.message}
        </p>
      )}
      {inquiries && inquiries.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">No inquiries yet.</p>
      )}

      {inquiries && inquiries.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {inquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              onSetStatus={(status) => updateStatus.mutate({ id: inquiry.id, status })}
              onConvert={() => setConverting(inquiry)}
              busy={updateStatus.isPending}
            />
          ))}
        </div>
      )}

      {converting && (
        <ConvertToOrderModal
          inquiry={converting}
          onClose={() => setConverting(null)}
          onConverted={(orderNo) => {
            setConverting(null)
            setToast(`Converted to order #${orderNo}.`)
          }}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function InquiryCard({
  inquiry,
  onSetStatus,
  onConvert,
  busy,
}: {
  inquiry: AdminInquiry
  onSetStatus: (status: InquiryStatus) => void
  onConvert: () => void
  busy: boolean
}) {
  const waNumber = toWhatsAppNumber(inquiry.phone)
  const isConverted = inquiry.status === 'converted'

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {inquiry.name}{' '}
            <span className="text-xs font-normal capitalize text-neutral-500">
              · {inquiry.category}
            </span>
          </p>
          <p className="text-xs text-neutral-500">{inquiry.phone}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[inquiry.status]}`}
        >
          {INQUIRY_STATUS_LABELS[inquiry.status]}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-600">
        {inquiry.email && (
          <div className="col-span-2">
            <dt className="inline font-medium">Email: </dt>
            <dd className="inline">{inquiry.email}</dd>
          </div>
        )}
        {inquiry.event_date && (
          <div>
            <dt className="inline font-medium">Event: </dt>
            <dd className="inline">{formatDate(inquiry.event_date)}</dd>
          </div>
        )}
        {inquiry.guest_count != null && (
          <div>
            <dt className="inline font-medium">Guests: </dt>
            <dd className="inline">{inquiry.guest_count}</dd>
          </div>
        )}
      </dl>

      {inquiry.message && <p className="mt-2 text-sm text-neutral-700">{inquiry.message}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy || isConverted}
          onClick={() => onSetStatus('contacted')}
          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
        >
          Contacted
        </button>
        <button
          type="button"
          disabled={busy || isConverted}
          onClick={() => onSetStatus('quoted')}
          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
        >
          Quoted
        </button>
        <button
          type="button"
          disabled={busy || isConverted}
          onClick={() => onSetStatus('closed')}
          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
        >
          Close
        </button>
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
          >
            WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => printQuotation(inquiry)}
          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
        >
          Quotation
        </button>
        {!isConverted && (
          <button
            type="button"
            onClick={onConvert}
            className="rounded border border-neutral-900 bg-neutral-900 px-2 py-1 text-xs text-white hover:bg-neutral-800"
          >
            Convert to order
          </button>
        )}
      </div>
    </div>
  )
}
