import { useMemo, useState } from 'react'
import { useCatalog } from '../contexts/CatalogContext'
import { useCartStore } from '../stores/cart'
import type { BoxFlavor, CartItem } from '../lib/pricing'
import { boxBase } from '../lib/pricing'
import { formatLKR } from '../lib/format'
import BrownieImage from '../components/storefront/BrownieImage'
import Seo, { breadcrumbJsonLd } from '../components/Seo'

// A "Make your own box" holds exactly this many pieces. The server enforces the
// same number in create_order() — keep the two in sync.
const BOX_SIZE = 15
const BOX_NAME = `Make Your Own Box (${BOX_SIZE} pcs)`

// Stable id for merging identical boxes in the cart + keeping the cart key
// stable across repricing. Order-independent (sorted by product id).
function compositionSignature(counts: Record<string, number>): string {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}:${n}`)
    .sort()
    .join(',')
}

// "Make your own box" builder (/build-a-box): the customer mixes any of the
// admin-selected flavours into a 15-piece box. Price = Σ (per-piece price ×
// count); the box can only be added once it holds exactly 15 pieces. The price
// is re-derived and the 15-piece rule re-checked server-side at checkout
// (create_order), so nothing here is trusted for money.
export default function BuildBox() {
  const { catalog } = useCatalog()
  const addItem = useCartStore((s) => s.addItem)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [justAdded, setJustAdded] = useState(false)

  // Admin-selected flavours that are in stock. Falls back to an empty state.
  const flavours = useMemo(
    () => catalog.products.filter((p) => p.isBuildYourOwn && p.inStock),
    [catalog.products],
  )

  const total = Object.values(counts).reduce((n, c) => n + c, 0)
  const remaining = BOX_SIZE - total
  const isFull = total === BOX_SIZE

  const boxItems: BoxFlavor[] = flavours
    .filter((f) => (counts[f.id] ?? 0) > 0)
    .map((f) => ({
      productId: f.id,
      name: f.name,
      count: counts[f.id],
      pricePerPiece: f.pricePerPiece,
    }))
  const price = boxBase(boxItems)

  function adjust(id: string, delta: number) {
    setJustAdded(false)
    setCounts((cur) => {
      const current = cur[id] ?? 0
      const next = current + delta
      if (next <= 0) {
        const { [id]: _removed, ...rest } = cur
        return rest
      }
      // Never let the box exceed 15 pieces.
      const currentTotal = Object.values(cur).reduce((n, c) => n + c, 0)
      if (delta > 0 && currentTotal >= BOX_SIZE) return cur
      return { ...cur, [id]: next }
    })
  }

  function handleAdd() {
    if (!isFull) return
    const signature = compositionSignature(counts)
    const summary = boxItems
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => `${f.count}× ${f.name}`)
      .join(', ')
    const item: CartItem = {
      productId: 'make-your-own-box',
      packageId: `box:${signature}`,
      productName: BOX_NAME,
      packageLabel: summary,
      pieceCount: BOX_SIZE,
      boxQty: 1,
      unitPrice: price,
      isBox: true,
      boxItems,
      addons: [],
    }
    addItem(item)
    setCounts({})
    setJustAdded(true)
  }

  return (
    <div className="bg-blush-50">
      <Seo
        title="Make Your Own Brownie Box"
        description={`Fill a ${BOX_SIZE}-piece box with any mix of Golden Oven brownie flavours.`}
        path="/build-a-box"
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Make Your Own Box', path: '/build-a-box' },
          ]),
        ].filter((o): o is Record<string, unknown> => o !== null)}
      />

      <section className="mx-auto max-w-6xl px-[22px] pb-28 pt-8 md:px-8 md:pb-14 md:pt-12">
        <div className="text-center">
          <h1 className="font-display text-[28px] text-navy md:text-[36px]">Make your own box</h1>
          <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-[#5c4450]">
            Mix any of our flavours into a {BOX_SIZE}-piece box — you pay per piece, so the price
            follows exactly what you pick.
          </p>
        </div>

        {flavours.length === 0 ? (
          <p className="mt-10 text-center text-[15px] text-neutral-500">
            The box builder is being set up — please check back soon.
          </p>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {flavours.map((f) => {
                const count = counts[f.id] ?? 0
                const canAdd = !isFull
                return (
                  <div
                    key={f.id}
                    className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
                      count > 0 ? 'border-pink' : 'border-blush-200'
                    }`}
                  >
                    <div className="aspect-square w-full bg-blush-50">
                      <BrownieImage src={f.imageUrl} alt={f.name} className="h-full w-full" />
                    </div>
                    <div className="p-3">
                      <p className="text-[14px] font-semibold leading-tight text-navy">{f.name}</p>
                      <p className="mt-0.5 text-[13px] text-[#7a5c64]">
                        {formatLKR(f.pricePerPiece)} <span className="text-[#a98a92]">/ piece</span>
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => adjust(f.id, -1)}
                          disabled={count === 0}
                          aria-label={`Remove one ${f.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-50 text-lg font-medium text-navy disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-[16px] font-bold text-navy">
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjust(f.id, 1)}
                          disabled={!canAdd}
                          aria-label={`Add one ${f.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-pink text-lg font-medium text-white disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary — sticky at the bottom on mobile, inline card on desktop. */}
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-blush-200 bg-white/95 px-4 py-3 backdrop-blur md:static md:mt-10 md:rounded-2xl md:border md:bg-white md:px-6 md:py-5">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] text-[#7a5c64]">
                    {isFull ? (
                      <span className="font-semibold text-green-700">Box full — {BOX_SIZE} pieces</span>
                    ) : (
                      <>
                        <span className="font-semibold text-navy">
                          {total} / {BOX_SIZE}
                        </span>{' '}
                        pieces · add {remaining} more
                      </>
                    )}
                  </p>
                  <p className="text-[18px] font-bold text-navy">{formatLKR(price)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!isFull}
                  className="rounded-2xl bg-pink px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-pink-dark disabled:opacity-40"
                >
                  {justAdded ? 'Added ✓' : isFull ? 'Add box to cart' : `Add ${remaining} more`}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
