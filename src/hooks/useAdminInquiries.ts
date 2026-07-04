import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchInquiries,
  updateInquiryStatus,
  convertInquiryToOrder,
  type ConvertInquiryInput,
  type InquiryStatus,
} from '../lib/adminInquiries'

export function useAdminInquiries() {
  return useQuery({
    queryKey: ['admin', 'inquiries'],
    queryFn: fetchInquiries,
    staleTime: 15_000,
  })
}

export function useUpdateInquiryStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InquiryStatus }) =>
      updateInquiryStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useConvertInquiry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ConvertInquiryInput) => convertInquiryToOrder(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] })
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}
