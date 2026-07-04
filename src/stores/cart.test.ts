import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore, cartLineKey } from './cart'
import type { CartItem } from '../lib/pricing'

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'p1',
    packageId: 'box-9',
    productName: 'Naked Brownie',
    packageLabel: '9 Pieces',
    pieceCount: 9,
    boxQty: 1,
    unitPrice: 150,
    addons: [],
    ...overrides,
  }
}

beforeEach(() => {
  useCartStore.setState({ items: [] })
})

describe('cart store (spec §8)', () => {
  it('adds a new line for a first-time config', () => {
    useCartStore.getState().addItem(makeItem())
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].boxQty).toBe(1)
  })

  it('merges an identical (product + package + add-ons) config into box_qty', () => {
    const item = makeItem()
    useCartStore.getState().addItem(item)
    useCartStore.getState().addItem(item)
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].boxQty).toBe(2)
  })

  it('keeps distinct lines when add-ons differ', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().addItem(
      makeItem({
        addons: [{ id: 'gift_ribbon', label: 'Gift Ribbon', price: 150, detail: { color: 'Red' } }],
      }),
    )
    expect(useCartStore.getState().items).toHaveLength(2)
  })

  it('keeps distinct lines when the same add-on has different detail (e.g. topper text)', () => {
    useCartStore.getState().addItem(
      makeItem({ addons: [{ id: 'letter_topper', label: 'Letter Topper', price: 350, detail: { lines: ['HI'] } }] }),
    )
    useCartStore.getState().addItem(
      makeItem({ addons: [{ id: 'letter_topper', label: 'Letter Topper', price: 350, detail: { lines: ['BYE'] } }] }),
    )
    expect(useCartStore.getState().items).toHaveLength(2)
  })

  it('increments box_qty via incrementBoxQty and removes the line at zero', () => {
    useCartStore.getState().addItem(makeItem())
    const key = cartLineKey('p1', 'box-9', [])
    useCartStore.getState().incrementBoxQty(key, 1)
    expect(useCartStore.getState().items[0].boxQty).toBe(2)
    useCartStore.getState().incrementBoxQty(key, -2)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('removeItem drops the line by key', () => {
    useCartStore.getState().addItem(makeItem())
    const key = cartLineKey('p1', 'box-9', [])
    useCartStore.getState().removeItem(key)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('clear empties the cart', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().clear()
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})
