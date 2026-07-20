import { useState } from 'react'
import { useAdminGiftVouchers, useGiftVoucherMutations } from '../../hooks/useAdminGiftVouchers'
import type { AdminGiftVoucher } from '../../lib/adminGiftVouchers'
import { formatLKR } from '../../lib/format'

// Admin Gift Vouchers: define one-time-use codes for a flat discount at
// checkout. Redemption itself happens atomically inside create_order()
// (migration 022) — this page is just CRUD + a used/unused status view.
export default function GiftVouchers() {
  const { data: vouchers, isLoading, isError, error } = useAdminGiftVouchers()
  const { add, setActive, remove } = useGiftVoucherMutations()

  const [code, setCode] = useState('')
  const [amount, setAmount] = useState(0)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || amount <= 0) return
    add.mutate(
      { code: code.trim(), amount },
      { onSuccess: () => { setCode(''); setAmount(0) } },
    )
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Gift Vouchers</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Create codes customers can redeem at checkout for a flat discount. Each code works once.
      </p>

      <form onSubmit={handleAdd} className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Add a voucher</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Code (e.g. GOLDEN500)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm uppercase placeholder:normal-case"
          />
          <input
            type="number"
            min={1}
            placeholder="Discount (Rs.)"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-40 rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        {add.isError && <p className="mt-2 text-sm text-red-600">{add.error.message}</p>}
        <button
          type="submit"
          disabled={add.isPending}
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
        <p className="text-sm text-neutral-500">{formatLKR(voucher.amount)} off</p>
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
