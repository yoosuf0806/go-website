import { financialYearOf, monthKeyOf } from './format'
import type {
  OpsAdSpend,
  OpsOperatingExpense,
  OpsPurchase,
  OpsSale,
  OpsMonthlyTarget,
  WebOrder,
} from './types'

// Statuses that count as real revenue (a cancelled web order is not a sale).
const REVENUE_STATUSES = new Set([
  'confirmed',
  'baking',
  'ready',
  'out_for_delivery',
  'completed',
])

export interface MonthlyRow {
  monthKey: string // "YYYY-MM"
  fy: number
  // Revenue
  b2cSales: number
  b2bSales: number
  totalSales: number
  pieces: number
  webOrders: number
  newCustomers: number
  // Costs
  purchases: number // COGS
  adSpend: number
  discounts: number
  operatingExpenses: number
  // Derived
  grossProfit: number // totalSales - purchases
  netProfit: number // grossProfit - adSpend - discounts - operatingExpenses
  roas: number | null // totalSales / adSpend
  costPerNewCustomer: number | null // adSpend / newCustomers
  // Targets
  targetPcs: number
}

export interface FinanceInputs {
  webOrders: WebOrder[]
  sales: OpsSale[]
  adSpend: OpsAdSpend[]
  purchases: OpsPurchase[]
  expenses: OpsOperatingExpense[]
  targets: OpsMonthlyTarget[]
}

function blankRow(monthKey: string): MonthlyRow {
  return {
    monthKey,
    fy: financialYearOf(monthKey),
    b2cSales: 0,
    b2bSales: 0,
    totalSales: 0,
    pieces: 0,
    webOrders: 0,
    newCustomers: 0,
    purchases: 0,
    adSpend: 0,
    discounts: 0,
    operatingExpenses: 0,
    grossProfit: 0,
    netProfit: 0,
    roas: null,
    costPerNewCustomer: null,
    targetPcs: 0,
  }
}

// The revenue month for a web order: prefer the delivery date (matches how the
// spreadsheet booked sales), fall back to the created date.
function webOrderMonth(o: WebOrder): string {
  return monthKeyOf(o.delivery_date || o.created_at)
}

/**
 * Roll every data source up into one row per calendar month, then derive the
 * profit + ad-attribution figures. "New customers" is the monthly-rollup
 * attribution model: a customer counts in the month of their first-ever order
 * (web orders keyed by phone), which is the best proxy for "sales gained from
 * this month's ads" without per-order source tracking.
 */
export function buildMonthly(input: FinanceInputs): MonthlyRow[] {
  const rows = new Map<string, MonthlyRow>()
  const get = (mk: string): MonthlyRow => {
    let r = rows.get(mk)
    if (!r) {
      r = blankRow(mk)
      rows.set(mk, r)
    }
    return r
  }

  // First-ever order month per phone → new-customer attribution.
  const firstSeen = new Map<string, string>()
  const revenueOrders = input.webOrders
    .filter((o) => REVENUE_STATUSES.has(o.status))
    .sort((a, b) => (webOrderMonth(a) < webOrderMonth(b) ? -1 : 1))
  for (const o of revenueOrders) {
    const key = (o.phone || '').replace(/\D/g, '') || o.customer_name
    if (key && !firstSeen.has(key)) firstSeen.set(key, webOrderMonth(o))
  }

  // Website B2C revenue (product revenue = subtotal, excludes delivery fee).
  for (const o of revenueOrders) {
    const r = get(webOrderMonth(o))
    r.b2cSales += Number(o.subtotal) || 0
    r.pieces += Number(o.total_pieces) || 0
    r.webOrders += 1
  }
  for (const mk of firstSeen.values()) get(mk).newCustomers += 1

  // Manual sales (B2B always; B2C for offline/historical rows).
  for (const s of input.sales) {
    const r = get(monthKeyOf(s.sale_date))
    const amt = Number(s.amount) || 0
    if (s.channel === 'b2b') r.b2bSales += amt
    else r.b2cSales += amt
    r.discounts += Number(s.discount) || 0
    if (s.channel === 'b2b') r.pieces += Number(s.qty) || 0
  }

  for (const a of input.adSpend) get(monthKeyOf(a.month)).adSpend += Number(a.amount_lkr) || 0
  for (const p of input.purchases)
    get(monthKeyOf(p.purchase_date)).purchases += Number(p.amount_lkr) || 0
  for (const e of input.expenses)
    get(monthKeyOf(e.month)).operatingExpenses += Number(e.amount_lkr) || 0
  for (const t of input.targets) get(monthKeyOf(t.month)).targetPcs += Number(t.target_pcs) || 0

  // Derive.
  for (const r of rows.values()) {
    r.totalSales = r.b2cSales + r.b2bSales
    r.grossProfit = r.totalSales - r.purchases
    r.netProfit = r.grossProfit - r.adSpend - r.discounts - r.operatingExpenses
    r.roas = r.adSpend > 0 ? r.totalSales / r.adSpend : null
    r.costPerNewCustomer = r.adSpend > 0 && r.newCustomers > 0 ? r.adSpend / r.newCustomers : null
  }

  return [...rows.values()].sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))
}

export interface IncomeStatement {
  fy: number
  sales: number
  purchases: number
  grossProfit: number
  marketing: number
  discounts: number
  salary: number
  boxPurchase: number
  otherExpenses: number
  totalExpenses: number
  netProfit: number
  months: number
}

// Fold the monthly rows for one financial year into an income statement.
export function incomeStatement(
  monthly: MonthlyRow[],
  expenses: OpsOperatingExpense[],
  fy: number,
): IncomeStatement {
  const inFy = monthly.filter((r) => r.fy === fy)
  const sum = (pick: (r: MonthlyRow) => number) => inFy.reduce((a, r) => a + pick(r), 0)

  const expByCat = (cat: string) =>
    expenses
      .filter((e) => financialYearOf(monthKeyOf(e.month)) === fy && e.category === cat)
      .reduce((a, e) => a + (Number(e.amount_lkr) || 0), 0)

  const sales = sum((r) => r.totalSales)
  const purchases = sum((r) => r.purchases)
  const marketing = sum((r) => r.adSpend)
  const discounts = sum((r) => r.discounts)
  const salary = expByCat('salary')
  const boxPurchase = expByCat('box')
  const otherExpenses = expByCat('rent') + expByCat('other')
  const grossProfit = sales - purchases
  const totalExpenses = marketing + discounts + salary + boxPurchase + otherExpenses

  return {
    fy,
    sales,
    purchases,
    grossProfit,
    marketing,
    discounts,
    salary,
    boxPurchase,
    otherExpenses,
    totalExpenses,
    netProfit: grossProfit - totalExpenses,
    months: inFy.length,
  }
}

export function listFinancialYears(monthly: MonthlyRow[]): number[] {
  return [...new Set(monthly.map((r) => r.fy))].sort((a, b) => b - a)
}
