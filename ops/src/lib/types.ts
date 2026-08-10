// Row shapes for the ops_* tables (see supabase/migrations/029_ops_system.sql)
// plus the slice of the storefront `orders` table the dashboard reads live.

export type SalesChannel = 'b2b' | 'b2c'

export interface OpsSale {
  id: string
  channel: SalesChannel
  sale_date: string // YYYY-MM-DD
  flavor: string | null
  customer: string | null
  ref: string | null
  qty: number
  unit_price: number
  amount: number // generated: qty * unit_price
  discount: number
  note: string | null
  created_at: string
  updated_at: string
}

export type AdChannel = 'facebook' | 'tiktok' | 'other'

export interface OpsAdSpend {
  id: string
  month: string // YYYY-MM-DD (1st of month)
  channel: AdChannel
  amount_lkr: number
  amount_usd: number | null
  usd_rate: number | null
  note: string | null
  created_at: string
  updated_at: string
}

export type PurchaseCategory = 'ingredient' | 'packaging' | 'equipment' | 'other'

export interface OpsPurchase {
  id: string
  purchase_date: string
  item: string
  qty: string | null
  amount_lkr: number
  category: PurchaseCategory
  note: string | null
  created_at: string
  updated_at: string
}

export type ExpenseCategory = 'salary' | 'box' | 'rent' | 'other'

export interface OpsOperatingExpense {
  id: string
  month: string
  category: ExpenseCategory
  description: string | null
  amount_lkr: number
  created_at: string
  updated_at: string
}

export interface OpsMonthlyTarget {
  id: string
  month: string
  target_pcs: number
  note: string | null
  created_at: string
  updated_at: string
}

export type PipelineTier = 'high' | 'medium' | 'prospect' | 'corporate'
export type PipelineStatus = 'prospect' | 'new_sale' | 'retainer' | 'won' | 'lost'

export interface OpsB2BPipeline {
  id: string
  tier: PipelineTier
  industry: string | null
  customer: string
  solution: string | null
  value_000: number | null
  contact: string | null
  status: PipelineStatus
  next_step: string | null
  created_at: string
  updated_at: string
}

export interface OpsRecipe {
  id: string
  flavor: string
  per_piece_cost: number
  selling_price: number
  batch_pcs: number
  note: string | null
  created_at: string
  updated_at: string
}

export interface OpsRecipeIngredient {
  id: string
  recipe_id: string
  name: string
  cost: number
  sort_order: number
}

export interface OpsShare {
  id: string
  holder: string
  share_pct: number
  earned: number
  paid: number
  created_at: string
  updated_at: string
}

export interface OpsInvestment {
  id: string
  investor: string
  item: string | null
  amount: number
  created_at: string
}

// Live storefront order (subset of the `orders` table used for B2C revenue).
export interface WebOrder {
  id: string
  order_no: number
  status: string
  customer_name: string
  phone: string
  subtotal: number
  total: number
  total_pieces: number
  delivery_date: string | null
  created_at: string
}
