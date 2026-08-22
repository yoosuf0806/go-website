import { useState, type FormEvent } from 'react'
import { useCatalog } from '../contexts/CatalogContext'
import { lookupOrder, type TrackedOrder } from '../lib/trackOrder'
import { toWhatsAppNumber, formatDate } from '../lib/format'
import { slotLabel } from '../lib/deliverySlots'
import { whatsAppLink, buildOrderInquiryMessage } from '../lib/whatsapp'
import WhatsAppIcon from '../components/ui/WhatsAppIcon'

// Customer-friendly status labels — the internal enum is hidden behind plain
// wording. Awaiting-verification is surfaced from payment_status, not status.
const STATUS_VIEW: Record<string, { label: string; className: string }> = {
  pending: { label: 'Order received', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', className: 'bg-amber-100 text-amber-700' },
  baking: { label: 'Baking', className: 'bg-sky-100 text-sky-700' },
  ready: { label: 'Ready for delivery', className: 'bg-green-100 text-green-700' },
  out_for_delivery: { label: 'Out for delivery', className: 'bg-sky-100 text-sky-700' },
  completed: { label: 'Delivered', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
}

function statusView(order: TrackedOrder): { label: string; className: string } {
  if (order.payment_status === 'awaiting_verification') {
    return { label: 'Awaiting payment verification', className: 'bg-amber-100 text-amber-700' }
  }
  return STATUS_VIEW[order.status] ?? { label: order.status, className: 'bg-neutral-100 text-neutral-600' }
}

export default function TrackOrder() {
  const { catalog } = useCatalog()
  const wa = toWhatsAppNumber(catalog.settings.business.whatsapp_number)
  const [value, setValue] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // undefined = nothing searched yet, null = searched but not found.
  const [order, setOrder] = useState<TrackedOrder | null | undefined>(undefined)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const n = parseInt(value.replace(/[^\d]/g, ''), 10)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a valid order number.')
      return
    }
    if (!phone.trim()) {
      setError('Enter the delivery contact number used for the order.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await lookupOrder(n, phone)
      setOrder(result)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Care link carries the found order's details so support has context; falls
  // back to a plain opener before anything is looked up.
  const careHref = wa
    ? order
      ? whatsAppLink(
          catalog.settings.business.whatsapp_number,
          buildOrderInquiryMessage({
            orderNo: order.order_no,
            deliveryDate: order.delivery_date,
            deliverySlot: order.delivery_slot,
            address: order.address,
            phone: order.phone,
            items: order.items,
          }),
        )
      : `https://wa.me/${wa}?text=${encodeURIComponent("Hi! I'd like to inquire about my order.")}`
    : null

  return (
    <div className="min-h-screen bg-white">
      {/* Slightly left of dead-centre: the column is centred within a max width
          but nudged toward the start on wide screens, per the brief. */}
      <div className="mx-auto max-w-2xl px-6 py-16 lg:ml-[max(1.5rem,calc((100vw-72rem)/2))] lg:mr-0">
        <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">Track your order</h1>
        <p className="mt-2 text-neutral-600">
          Enter your order number and the delivery contact number to see its status and details.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-full border border-blush-200 bg-white p-1.5 shadow-sm focus-within:border-pink">
            <input
              type="text"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Order number, e.g. 1024"
              aria-label="Order number"
              className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2.5 text-navy outline-none placeholder:text-neutral-400"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-blush-200 bg-white p-1.5 shadow-sm focus-within:border-pink">
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Delivery contact number, e.g. 077 123 4567"
              aria-label="Delivery contact number"
              className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2.5 text-navy outline-none placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 rounded-full bg-pink px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-berry disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
          {error && <p className="mt-1 px-2 text-sm text-red-600">{error}</p>}
        </form>

        {order === null && !error && (
          <div className="mt-8 rounded-2xl border border-blush-200 bg-blush-50 px-5 py-6 text-center">
            <p className="font-medium text-navy">We couldn't find that order.</p>
            <p className="mt-1 text-sm text-neutral-600">
              Check that the order number and delivery contact number match your confirmation, or
              contact us below.
            </p>
          </div>
        )}

        {order && <OrderDetails order={order} />}

        <div className="mt-16 border-t border-blush-200 pt-8 text-center">
          {careHref && (
            <a
              href={careHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-6 py-3 text-sm font-bold text-white shadow-sm transition-transform hover:scale-105"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Contact customer care via WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderDetails({ order }: { order: TrackedOrder }) {
  const view = statusView(order)
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-blush-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blush-200 bg-blush-50 px-5 py-4">
        <span className="font-display text-xl font-bold text-navy">Order #{order.order_no}</span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${view.className}`}>
          {view.label}
        </span>
      </div>

      <div className="grid gap-6 px-5 py-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Your brownies</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-navy">
            {order.items.map((item, i) => (
              <li key={i}>
                {item.product_name} — {item.package_label} × {item.box_qty}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Delivery &amp; contact
          </p>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm text-navy">
            <div>
              <dt className="inline text-neutral-500">Delivery date: </dt>
              <dd className="inline">
                {order.delivery_date ? formatDate(order.delivery_date) : '—'}
                {order.delivery_slot ? ` · ${slotLabel(order.delivery_slot)}` : ''}
              </dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">Delivery address: </dt>
              <dd className="inline">{order.address || '—'}</dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">Contact number: </dt>
              <dd className="inline">{order.phone}</dd>
            </div>
          </dl>

          {order.is_gift && (
            <div className="mt-3 rounded-lg bg-blush-50 px-3 py-2 text-sm text-navy">
              <p className="text-xs font-semibold uppercase tracking-wide text-pink">Gift order</p>
              <p className="mt-1">
                <span className="text-neutral-500">Recipient: </span>
                {order.recipient_name || '—'}
                {order.recipient_phone ? ` · ${order.recipient_phone}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
