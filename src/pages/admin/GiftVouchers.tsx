import { useState } from 'react'
import { useAdminGiftVouchers, useGiftVoucherMutations } from '../../hooks/useAdminGiftVouchers'
import type { AdminGiftVoucher, VoucherDiscountType } from '../../lib/adminGiftVouchers'
import { formatLKR } from '../../lib/format'

// How a voucher's amount reads in the list, e.g. "10% off" or "Rs. 500.00 off".
function discountLabel(v: Pick<AdminGiftVoucher, 'amount' | 'discount_type'>): string {
  return v.discount_type === 'percent' ? `${v.amount}% off` : `${formatLKR(v.amount)} off`
}

// Admin Gift Vouchers: define one-time-use codes for a flat discount at
// checkout. Redemption itself happens atomically inside create_order()
// (migration 022) — this page is just CRUD + a used/unused status view.
export default function GiftVouchers() {
  const { data: vouchers, isLoading, isError, error } = useAdminGiftVouchers()
  const { add, setActive, remove } = useGiftVoucherMutations()

  const [code, setCode] = useState('')
  const [amount, setAmount] = useState(0)
  const [discountType, setDiscountType] = useState<VoucherDiscountType>('fixed')

  const amountInvalid = amount <= 0 || (discountType === 'percent' && amount > 100)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || amountInvalid) return
    add.mutate(
      { code: code.trim(), amount, discount_type: discountType },
      { onSuccess: () => { setCode(''); setAmount(0); setDiscountType('fixed') } },
    )
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Gift Vouchers</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Create codes customers can redeem at checkout for a flat (Rs.) or percentage discount.
        Each code works once.
      </p>

      <form onSubmit={handleAdd} className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Add a voucher</h2>
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
        {discountType === 'percent' && (
          <p className="mt-1.5 text-xs text-neutral-400">
            Percentage is applied to the order total (items + delivery), 1–100%.
          </p>
        )}
        {amountInvalid && amount > 0 && (
          <p className="mt-1.5 text-xs text-red-600">A percentage voucher must be between 1 and 100.</p>
        )}
        {add.isError && <p className="mt-2 text-sm text-red-600">{add.error.message}</p>}
        <button
          type="submit"
          disabled={add.isPending || !code.trim() || amountInvalid}
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
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div>
        <p className="font-mono text-sm font-semibold text-neutral-900">{voucher.code}</p>
        <p className="text-sm text-neutral-500">{discountLabel(voucher)}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={`rounded px-2 py-1 text-xs ${
            used
              ? 'bg-neutral-100 text-neutral-500'
              : voucher.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
          }`}
        >
          {used ? 'Used' : voucher.is_active ? 'Active' : 'Disabled'}
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
