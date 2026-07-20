import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchGiftVouchers,
  addGiftVoucher,
  setGiftVoucherActive,
  deleteGiftVoucher,
  type NewGiftVoucher,
} from '../lib/adminGiftVouchers'

export function useAdminGiftVouchers() {
  return useQuery({
    queryKey: ['admin', 'gift-vouchers'],
    queryFn: fetchGiftVouchers,
    staleTime: 15_000,
  })
}

export function useGiftVoucherMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'gift-vouchers'] })

  const add = useMutation({ mutationFn: (input: NewGiftVoucher) => addGiftVoucher(input), onSuccess: invalidate })
  const setActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => setGiftVoucherActive(id, is_active),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteGiftVoucher(id), onSuccess: invalidate })

  return { add, setActive, remove }
}
