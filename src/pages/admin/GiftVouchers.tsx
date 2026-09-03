import { useState } from 'react'
import { useAdminGiftVouchers, useGiftVoucherMutations } from '../../hooks/useAdminGiftVouchers'
import type { AdminGiftVoucher, VoucherDiscountType } from '../../lib/adminGiftVouchers'
import { formatLKR } from '../../lib/format'

function discountLabel(v: Pick<AdminGiftVoucher, 'amount' | 'discount_type'>): string {
  return v.discount_type === 'percent' ? `${v.amount}% off` : `${formatLKR(v.amount)} off`
}

/** Format a timestamptz string for display, or return a fallback. */
function fmtWindow(iso: string | null, fallback: string): string {
  if (!iso) return fallback
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  })
}

/** Convert a local datetime-local input value ("2025-12-31T23:59") to an ISO
 *  string with timezone, or null if empty. */
function localToISO(local: string): string | null {
  if (!local) return null
  return new Date(local).toISOString()
}

export default function GiftVouchers() {
  const { data: vouchers, isLoading, isError, error } = useAdminGiftVouchers()
  const { add, setActive, remove } = useGiftVoucherMutations()

  const [code, setCode] = useState('')
  const [amount, setAmount] = useState(0)
  const [discountType, setDiscountType] = useState<VoucherDiscountType>('fixed')
  const [validFrom, setValidFrom] = useState('')   // datetime-local string
  const [validUntil, setValidUntil] = useState('') // datetime-local string

  const amountInvalid = amount <= 0 || (discountType === 'percent' && amount > 100)
  const windowInvalid =
    validFrom && validUntil && new Date(validFrom) >= new Date(validUntil)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || amountInvalid || windowInvalid) return
    add.mutate(
      {
        code: code.trim(),
        amount,
        discount_type: discountType,
        valid_from: localToISO(validFrom),
        valid_until: localToISO(validUntil),
      },
      {
        onSuccess: () => {
          setCode('')
          setAmount(0)
          setDiscountType('fixed')
          setValidFrom('')
          setValidUntil('')
        },
      },
    )
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Gift Vouchers</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Create codes customers can redeem at checkout for a flat (Rs.) or percentage discount.
        Each code works once. Optionally restrict redemption to a date/time window.
      </p>

      <form onSubmit={handleAdd} className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Add a voucher</h2>

        {/* Code + type + amount row */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Code (e.g. GOLDEN500)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm uppercase placeholder:normal-case"
          />
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as VoucherDiscountType)}
            className="rounded border border-neutral-300 px-2 py-2 text-sm"
          >
            <option value="fixed">Fixed (Rs.)</option>
            <option value="percent">Percentage (%)</option>
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={discountType === 'percent' ? 100 : undefined}
              placeholder={discountType === 'percent' ? 'e.g. 10' : 'Discount (Rs.)'}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-36 rounded border border-neutral-300 px-3 py-2 text-sm"
            />
            <span className="text-sm text-neutral-500">{discountType === 'percent' ? '%' : 'Rs.'}</span>
          </div>
        </div>

        {/* Validity window row */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Valid from (optional)</label>
            <input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Valid until (optional)</label>
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {discountType === 'percent' && (
          <p className="mt-1.5 text-xs text-neutral-400">
            Percentage is applied to the order total (items + delivery), 1–100%.
          </p>
        )}
        {amountInvalid && amount > 0 && (
          <p className="mt-1.5 text-xs text-red-600">A percentage voucher must be between 1 and 100.</p>
        )}
        {windowInvalid && (
          <p className="mt-1.5 text-xs text-red-600">"Valid until" must be after "Valid from".</p>
        )}
        {add.isError && <p className="mt-2 text-sm text-red-600">{add.error.message}</p>}

        <button
          type="submit"
          disabled={add.isPending || !code.trim() || amountInvalid || !!windowInvalid}
          className="mt-3 self-start rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {add.isPending ? 'Adding…' : 'Add voucher'}
        </button>
      </form>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading vouchers…</p>}
      {isError && (
        <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load vouchers: {error.message}
        </p>
      )}

      {vouchers && vouchers.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {vouchers.map((v) => (
            <VoucherRow
              key={v.id}
              voucher={v}
              onToggleActive={() => setActive.mutate({ id: v.id, is_active: !v.is_active })}
              onDelete={() => remove.mutate(v.id)}
              busy={setActive.isPending || remove.isPending}
            />
          ))}
        </ul>
      )}
      {vouchers && vouchers.length === 0 && (
        <p className="mt-6 text-sm text-neutral-400">No vouchers yet.</p>
      )}
    </div>
  )
}

function VoucherRow({
  voucher,
  onToggleActive,
  onDelete,
  busy,
}: {
  voucher: AdminGiftVoucher
  onToggleActive: () => void
  onDelete: () => void
  busy: boolean
}) {
  const used = voucher.used_at != null
  const now = new Date()

  // Compute the current window state for display only (actual enforcement is DB-side).
  const isExpired =
    (voucher.valid_until != null && now >= new Date(voucher.valid_until))
  const isNotYetActive =
    (voucher.valid_from != null && now < new Date(voucher.valid_from))

  let statusLabel: string
  let statusClass: string
  if (used) {
    statusLabel = 'Used'
    statusClass = 'bg-neutral-100 text-neutral-500'
  } else if (!voucher.is_active) {
    statusLabel = 'Disabled'
    statusClass = 'bg-amber-100 text-amber-700'
  } else if (isExpired) {
    statusLabel = 'Expired'
    statusClass = 'bg-red-100 text-red-600'
  } else if (isNotYetActive) {
    statusLabel = 'Scheduled'
    statusClass = 'bg-blue-100 text-blue-700'
  } else {
    statusLabel = 'Active'
    statusClass = 'bg-green-100 text-green-700'
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="min-w-0">
        <p className="font-mono text-sm font-semibold text-neutral-900">{voucher.code}</p>
        <p className="text-sm text-neutral-500">{discountLabel(voucher)}</p>
        {/* Validity window */}
        {(voucher.valid_from || voucher.valid_until) && (
          <p className="mt-0.5 text-xs text-neutral-400">
            {voucher.valid_from && !voucher.valid_until &&
              `From ${fmtWindow(voucher.valid_from, '—')}`}
            {!voucher.valid_from && voucher.valid_until &&
              `Until ${fmtWindow(voucher.valid_until, '—')}`}
            {voucher.valid_from && voucher.valid_until &&
              `${fmtWindow(voucher.valid_from, '—')} → ${fmtWindow(voucher.valid_until, '—')}`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={`rounded px-2 py-1 text-xs ${statusClass}`}>
          {statusLabel}
        </span>
        {!used && (
          <button
            type="button"
            disabled={busy}
            onClick={onToggleActive}
            className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
          >
            {voucher.is_active ? 'Disable' : 'Enable'}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded border border-neutral-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  )
}
