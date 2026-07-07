// Bake list aggregation (spec §7 Bake list): for all non-cancelled orders due a
// date, group by product → package → total pieces. The fetch is live; the
// grouping is a pure function so it can be unit-tested without a DB.
import { supabase } from './supabase'

export interface BakeListItem {
  product_name: string
  package_label: string
  piece_count: number
  box_qty: number
}

export interface BakePackageGroup {
  packageLabel: string
  boxes: number
  pieces: number
}

export interface BakeProductGroup {
  productName: string
  packages: BakePackageGroup[]
  totalPieces: number
}

export function aggregateBakeList(items: BakeListItem[]): BakeProductGroup[] {
  const byProduct = new Map<string, Map<string, BakePackageGroup>>()

  for (const item of items) {
    if (!byProduct.has(item.product_name)) byProduct.set(item.product_name, new Map())
    const packages = byProduct.get(item.product_name)!
    const existing = packages.get(item.package_label) ?? {
      packageLabel: item.package_label,
      boxes: 0,
      pieces: 0,
    }
    existing.boxes += item.box_qty
    existing.pieces += item.piece_count * item.box_qty
    packages.set(item.package_label, existing)
  }

  return [...byProduct.entries()]
    .map(([productName, packages]) => {
      const groups = [...packages.values()].sort((a, b) =>
        a.packageLabel.localeCompare(b.packageLabel),
      )
      return {
        productName,
        packages: groups,
        totalPieces: groups.reduce((n, g) => n + g.pieces, 0),
      }
    })
    .sort((a, b) => a.productName.localeCompare(b.productName))
}

export async function fetchBakeList(date: string): Promise<BakeProductGroup[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('status, delivery_date, order_items(product_name, package_label, piece_count, box_qty)')
    .eq('delivery_date', date)
    .neq('status', 'cancelled')

  if (error) throw new Error(error.message)

  const items: BakeListItem[] = []
  for (const order of (data ?? []) as { order_items: BakeListItem[] }[]) {
    items.push(...order.order_items)
  }
  return aggregateBakeList(items)
}
