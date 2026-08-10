import { useAsync } from './useAsync'
import {
  adSpendApi,
  expensesApi,
  fetchWebOrders,
  purchasesApi,
  salesApi,
  targetsApi,
} from '../lib/api'
import { buildMonthly, type MonthlyRow } from '../lib/finance'
import type { OpsOperatingExpense } from '../lib/types'

export interface FinanceData {
  monthly: MonthlyRow[]
  expenses: OpsOperatingExpense[]
}

// Load every finance source in parallel and roll them into monthly rows.
export function useFinance() {
  return useAsync<FinanceData>(async () => {
    const [webOrders, sales, adSpend, purchases, expenses, targets] = await Promise.all([
      fetchWebOrders(),
      salesApi.list(),
      adSpendApi.list(),
      purchasesApi.list(),
      expensesApi.list(),
      targetsApi.list(),
    ])
    const monthly = buildMonthly({ webOrders, sales, adSpend, purchases, expenses, targets })
    return { monthly, expenses }
  }, [])
}
