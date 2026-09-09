import { useState } from 'react'
import { useCatalog } from '../../contexts/CatalogContext'
import { cartTotals, type CartItem } from '../../lib/pricing'
import { cartLineKey, type CartLine } from '../../stores/cart'
import { formatLKR } from '../../lib/format'
import { adminOrderDetailsSchema, type CheckoutDetails } from '../../schemas/checkout'
import { DELIVERY_SLOTS } from '../../lib/deliverySlots'
import { useConvertInquiry } from '../../hooks/useAdminInquiries'
import type { AdminInquiry } from '../../lib/adminInquiries'
import type { CatalogProduct, CatalogPackage } from '../../types/catalog'

interface LineRow {
  productId: string
  packageId: string
  boxQty: number
}

interface ConvertToOrderModalProps {
  inquiry: AdminInquiry
  onClose: () => void
  onConverted: (orderNo: number) => void
}

// Convert an inquiry into an order (spec §7). All initial state is derived from
// the inquiry synchronously in useState initialisers — the parent only mounts
// this modal once an inquiry is chosen, so state is never hydrated post-open
// (the race condition that broke the prototype).
export default function ConvertToOrderModal({
  inquiry,
  onClose,
  onConverted,
}: ConvertToOrderModalProps) {
  const { catalog } = useCatalog()
  const { products, packages, deliveryTiers } = catalog
  const [details, setDetails] = useState<CheckoutDetails>({
    name: inquiry.name,
    phone: inquiry.phone,
    email: inquiry.email ?? '',
    altPhone: '',
    address: inquiry.delivery_address ?? '',
    deliveryDate: inquiry.event_date ?? '',
    // Optional for admin-scheduled orders; blank means "no fixed slot".
    deliverySlot: '',
    note: inquiry.message ?? '',
    isGift: false,
  })
  // Slab products/packages are priced per flavour, which this package-based
  // converter doesn't model — offer only normal (piece-box) products and
  // packages here. Defaulting a row to packages[0] was a bug: live catalogues
  // sort the slab packages first, so the row defaulted to a slab package that
  // isn't in the dropdown — the shown selection didn't match state and the
  // totals ignored the picked item/quantity.
  const orderableProducts = products.filter((p) => !p.isSlabProduct)
  const orderablePackages = packages.filter((p) => !p.isSlab)
  const [rows, setRows] = useState<LineRow[]>([
    { productId: orderableProducts[0]?.id ?? '', packageId: orderablePackages[0]?.id ?? '', boxQty: 1 },
  ])
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutDetails, string>>>({})
  const convert = useConvertInquiry()

  const lines = buildLines(rows, products, packages)
  const totals = cartTotals(lines, deliveryTiers)

  async function handleSave() {
    const parsed = adminOrderDetailsSchema.safeParse(details)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof CheckoutDetails, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CheckoutDetails
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    if (lines.length === 0) return
    setErrors({})
    try {
      const { orderNo } = await convert.mutateAsync({
        inquiry,
        items: lines,
        totals,
        details: parsed.data,
      })
      onConverted(orderNo)
    } catch {
      // convert.error holds the message; stay open so the admin can retry.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-800"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold">Convert inquiry to order</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {inquiry.name} · {inquiry.category}
          {inquiry.guest_count != null && ` · ${inquiry.guest_count} guests`}
        </p>

        {/* What the customer actually asked for. Inquiries are free text (no
            structured line items), so the admin reads this and picks the
            matching products/quantities below. Shown read-only here AND carried
            into the editable Note field so it lands on the order. */}
        {inquiry.message && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Customer’s requirements
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{inquiry.message}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Name" error={errors.name}>
            <input
              type="text"
              value={details.name}
              onChange={(e) => setDetails({ ...details, name: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </TextField>
          <TextField label="Email" error={errors.email}>
            <input
              type="email"
              value={details.email}
              onChange={(e) => setDetails({ ...details, email: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </TextField>
          <TextField label="Alternative contact (optional)" error={errors.altPhone}>
            <input
              type="tel"
              value={details.altPhone ?? ''}
              onChange={(e) => setDetails({ ...details, altPhone: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </TextField>
          <TextField label="Phone" error={errors.phone}>
            <input
              type="tel"
              value={details.phone}
              onChange={(e) => setDetails({ ...details, phone: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </TextField>
          <TextField label="Delivery address" error={errors.address}>
            <input
              type="text"
              value={details.address}
              onChange={(e) => setDetails({ ...details, address: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </TextField>
          <TextField label="Delivery date" error={errors.deliveryDate}>
            <input
              type="date"
              value={details.deliveryDate}
              onChange={(e) => setDetails({ ...details, deliveryDate: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </TextField>
          {/* Optional here: corporate/wedding deliveries are scheduled by
              agreement and may not fit a retail slot. */}
          <TextField label="Delivery time (optional)" error={errors.deliverySlot}>
            <select
              value={details.deliverySlot}
              onChange={(e) => setDetails({ ...details, deliverySlot: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">No fixed time</option>
              {DELIVERY_SLOTS.map((slot) => (
                <option key={slot.code} value={slot.code}>
                  {slot.label}
                </option>
              ))}
            </select>
          </TextField>
        </div>

        <div className="mt-3">
          <TextField label="Note (carried onto the order)" error={errors.note}>
            <textarea
              value={details.note ?? ''}
              onChange={(e) => setDetails({ ...details, note: e.target.value })}
              rows={3}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Flavours, quantities, and any special requests…"
            />
          </TextField>
        </div>

        <h3 className="mt-5 text-sm font-semibold">Order items</h3>
        <div className="mt-2 flex flex-col gap-2">
          {rows.map((row, i) => {
            const availablePackages = orderablePackages
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  value={row.productId}
                  onChange={(e) => updateRow(setRows, i, { productId: e.target.value })}
                  className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                >
                  {orderableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={row.packageId}
                  onChange={(e) => updateRow(setRows, i, { packageId: e.target.value })}
                  className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                >
                  {availablePackages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-neutral-500">
                  Qty
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={row.boxQty}
                    onChange={(e) =>
                      updateRow(setRows, i, { boxQty: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
                    }
                    className="w-20 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </label>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    className="text-xs text-neutral-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
          <button
            type="button"
            onClick={() =>
              setRows((rs) => [
                ...rs,
                { productId: orderableProducts[0]?.id ?? '', packageId: orderablePackages[0]?.id ?? '', boxQty: 1 },
              ])
            }
            className="self-start text-sm text-amber-700 hover:underline"
          >
            + Add item
          </button>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-3 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span>{formatLKR(totals.subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-neutral-600">
            <span>Delivery ({totals.totalPieces} pcs)</span>
            <span>{formatLKR(totals.deliveryFee)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatLKR(totals.total)}</span>
          </div>
        </div>

        {convert.isError && (
          <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {convert.error.message} — please retry.
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={convert.isPending}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {convert.isPending ? 'Creating…' : 'Create order'}
          </button>
        </div>
      </div>
    </div>
  )
}

function buildLines(
  rows: LineRow[],
  products: CatalogProduct[],
  packages: CatalogPackage[],
): CartLine[] {
  const lines: CartLine[] = []
  for (const row of rows) {
    const product = products.find((p) => p.id === row.productId)
    const pkg = packages.find((p) => p.id === row.packageId)
    // Slab products/packages aren't orderable through this package-based converter.
    if (!product || product.isSlabProduct || !pkg || pkg.isSlab) continue
    const item: CartItem = {
      productId: product.id,
      packageId: pkg.id,
      productName: product.name,
      packageLabel: pkg.label,
      pieceCount: pkg.pieceCount,
      boxQty: row.boxQty,
      unitPrice: product.pricePerPiece,
      addons: [],
    }
    lines.push({ ...item, key: cartLineKey(item.productId, item.packageId, item.addons) })
  }
  return lines
}

function updateRow(
  setRows: React.Dispatch<React.SetStateAction<LineRow[]>>,
  index: number,
  patch: Partial<LineRow>,
) {
  setRows((rs) => rs.map((row, i) => (i === index ? { ...row, ...patch } : row)))
}

function TextField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  )
}
