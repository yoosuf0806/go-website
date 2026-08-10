import { supabase } from './supabase'
import type {
  OpsAdSpend,
  OpsB2BPipeline,
  OpsInvestment,
  OpsMonthlyTarget,
  OpsOperatingExpense,
  OpsPurchase,
  OpsRecipe,
  OpsRecipeIngredient,
  OpsSale,
  OpsShare,
  WebOrder,
} from './types'

// ── Live storefront orders (read-only) ──────────────────────────────────────
export async function fetchWebOrders(): Promise<WebOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, customer_name, phone, subtotal, total, total_pieces, delivery_date, created_at',
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WebOrder[]
}

// ── Generic table helpers ───────────────────────────────────────────────────
async function selectAll<T>(table: string, orderBy: string, ascending = false): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending })
  if (error) throw error
  return (data ?? []) as T[]
}

export function makeCrud<T extends { id: string }>(table: string, orderBy: string, ascending = false) {
  return {
    list: () => selectAll<T>(table, orderBy, ascending),
    async create(row: Partial<T>): Promise<T> {
      // Untyped generic helper: the client has no generated Database types, so
      // cast the payload past its strict insert signature.
      const { data, error } = await supabase
        .from(table)
        .insert(row as never)
        .select('*')
        .single()
      if (error) throw error
      return data as T
    },
    async update(id: string, patch: Partial<T>): Promise<T> {
      const { data, error } = await supabase
        .from(table)
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as T
    },
    async remove(id: string): Promise<void> {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
  }
}

export const salesApi = makeCrud<OpsSale>('ops_sales', 'sale_date')
export const adSpendApi = makeCrud<OpsAdSpend>('ops_ad_spend', 'month')
export const purchasesApi = makeCrud<OpsPurchase>('ops_purchases', 'purchase_date')
export const expensesApi = makeCrud<OpsOperatingExpense>('ops_operating_expenses', 'month')
export const targetsApi = makeCrud<OpsMonthlyTarget>('ops_monthly_targets', 'month')
export const pipelineApi = makeCrud<OpsB2BPipeline>('ops_b2b_pipeline', 'created_at')
export const recipesApi = makeCrud<OpsRecipe>('ops_recipes', 'flavor', true)
export const ingredientsApi = makeCrud<OpsRecipeIngredient>('ops_recipe_ingredients', 'sort_order', true)
export const sharesApi = makeCrud<OpsShare>('ops_shares', 'holder', true)
export const investmentsApi = makeCrud<OpsInvestment>('ops_investments', 'created_at')

export async function fetchIngredientsFor(recipeId: string): Promise<OpsRecipeIngredient[]> {
  const { data, error } = await supabase
    .from('ops_recipe_ingredients')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as OpsRecipeIngredient[]
}
