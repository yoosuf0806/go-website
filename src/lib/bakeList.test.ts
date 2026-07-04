import { describe, it, expect } from 'vitest'
import { aggregateBakeList, type BakeListItem } from './bakeList'

const items: BakeListItem[] = [
  { product_name: 'Naked Brownie', package_label: '9 Pieces', piece_count: 9, box_qty: 2 },
  { product_name: 'Naked Brownie', package_label: '9 Pieces', piece_count: 9, box_qty: 1 },
  { product_name: 'Naked Brownie', package_label: 'Brownie Slab (12 pcs)', piece_count: 12, box_qty: 1 },
  { product_name: 'Walnut Fudge', package_label: '12 Pieces', piece_count: 12, box_qty: 2 },
]

describe('aggregateBakeList (spec §7 Bake list)', () => {
  const groups = aggregateBakeList(items)

  it('groups by product then package, summing boxes and pieces', () => {
    const naked = groups.find((g) => g.productName === 'Naked Brownie')!
    const nine = naked.packages.find((p) => p.packageLabel === '9 Pieces')!
    expect(nine.boxes).toBe(3) // 2 + 1
    expect(nine.pieces).toBe(27) // 9 * 3
    const slab = naked.packages.find((p) => p.packageLabel === 'Brownie Slab (12 pcs)')!
    expect(slab.boxes).toBe(1)
    expect(slab.pieces).toBe(12)
  })

  it('computes a per-product total piece count', () => {
    const naked = groups.find((g) => g.productName === 'Naked Brownie')!
    expect(naked.totalPieces).toBe(39) // 27 + 12
    const walnut = groups.find((g) => g.productName === 'Walnut Fudge')!
    expect(walnut.totalPieces).toBe(24)
  })

  it('returns products sorted alphabetically', () => {
    expect(groups.map((g) => g.productName)).toEqual(['Naked Brownie', 'Walnut Fudge'])
  })

  it('returns an empty list for no items', () => {
    expect(aggregateBakeList([])).toEqual([])
  })
})
