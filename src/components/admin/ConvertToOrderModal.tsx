import { useState } from 'react'
import { products, packages, deliveryTiers } from '../../data/catalog'
import { cartTotals, type CartItem } from '../../lib/pricing'
import { cartLineKey, type CartLine } from '../../stores/cart'
import { formatLKR } from '../../lib/format'
import { checkoutDetailsSchema, type CheckoutDetails } from '../../schemas/checkout'
import { useConvertInquiry } from '../../hooks/useAdminInquiries'
import type { AdminInquiry } from '../../lib/adminInquiries'

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
  const [details, setDetails] = useState<CheckoutDetails>({
    name: inquiry.name,
    phone: inquiry.phone,
    address: '',
    deliveryDate: inquiry.event_date ?? '',
    note: inquiry.message ?? '',
  })
  const [rows, setRows] = useState<LineRow[]>([
    { productId: products[0]?.id ?? '', packageId: packages[0]?.id ?? '', boxQty: 1 },
  ])
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutDetails, string>>>({})
  const convert = useConvertInquiry()

  const lines = buildLines(rows)
  const totals = cartTotals(lines, deliveryTiers)

  async function handleSave() {
    const parsed = checkoutDetailsSchema.safeParse(details)
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
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Name" error={errors.name}>
            <input
              type="text"
              value={details.name}
              onChange={(e) => setDetails({ ...details, name: e.target.value })}
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
        </div>

        <h3 className="mt-5 text-sm font-semibold">Order items</h3>
        <div className="mt-2 flex flex-col gap-2">
          {rows.map((row, i) => {
            const product = products.find((p) => p.id === row.productId)
            const availablePackages = packages.filter((p) => !p.isSlab || product?.isSlabAvailable)
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  value={row.productId}
                  onChange={(e) => updateRow(setRows, i, { productId: e.target.value })}
                  className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                >
                  {products.map((p) => (
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
                <input
                  type="number"
                  min={1}
                  value={row.boxQty}
                  onChange={(e) =>
                    updateRow(setRows, i, { boxQty: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-16 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
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
                { productId: products[0]?.id ?? '', packageId: packages[0]?.id ?? '', boxQty: 1 },
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

function buildLines(rows: LineRow[]): CartLine[] {
  const lines: CartLine[] = []
  for (const row of rows) {
    const product = products.find((p) => p.id === row.productId)
    const pkg = packages.find((p) => p.id === row.packageId)
    if (!product || !pkg) continue
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
