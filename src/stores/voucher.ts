import { create } from 'zustand'
import { validateGiftVoucher, type VoucherStatus } from '../lib/giftVouchers'

// Ephemeral (not persisted) gift-voucher application state, shared between the
// Cart Drawer (where the code is entered) and CheckoutModal (which reads the
// applied discount at confirm time). Not persisted to localStorage — a stale
// "applied" flag surviving a reload could no longer be valid, so it always
// starts fresh.
interface VoucherState {
  code: string
  checking: boolean
  status: VoucherStatus | null
  discount: number
  error: string | null
  setCode: (code: string) => void
  apply: () => Promise<void>
  remove: () => void
}

export const useVoucherStore = create<VoucherState>((set, get) => ({
  code: '',
  checking: false,
  status: null,
  discount: 0,
  error: null,
  setCode: (code) => set({ code }),
  apply: async () => {
    const code = get().code.trim()
    if (!code) return
    set({ checking: true, error: null })
    try {
      const result = await validateGiftVoucher(code)
      set({
        status: result.status,
        discount: result.status === 'ok' ? (result.amount ?? 0) : 0,
        checking: false,
      })
    } catch (err) {
      set({
        status: null,
        discount: 0,
        error: err instanceof Error ? err.message : 'Could not check that voucher, please retry.',
        checking: false,
      })
    }
  },
  remove: () => set({ code: '', status: null, discount: 0, error: null }),
}))
