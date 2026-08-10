import { DataManager } from '../components/DataManager'
import { PageHeader } from '../components/ui'
import { recipesApi } from '../lib/api'
import { lkr, pct } from '../lib/format'
import type { OpsRecipe } from '../lib/types'

// Gross margin derived from cost vs selling price.
function margin(r: OpsRecipe): number | null {
  const sp = Number(r.selling_price)
  if (!sp) return null
  return (sp - Number(r.per_piece_cost)) / sp
}

export function Costing() {
  return (
    <div>
      <PageHeader
        title="Costing"
        subtitle="Per-flavour cost, selling price and gross margin. Drives the profit maths."
      />
      <DataManager<OpsRecipe>
        title="Recipes"
        api={recipesApi}
        columns={[
          { key: 'flavor', header: 'Flavor' },
          { key: 'batch_pcs', header: 'Batch (pcs)', align: 'right' },
          {
            key: 'per_piece_cost',
            header: 'Cost / pc',
            align: 'right',
            render: (r) => lkr(r.per_piece_cost, { decimals: true }),
          },
          {
            key: 'selling_price',
            header: 'Price / pc',
            align: 'right',
            render: (r) => lkr(r.selling_price, { decimals: true }),
          },
          {
            key: 'profit',
            header: 'Profit / pc',
            align: 'right',
            render: (r) => lkr(Number(r.selling_price) - Number(r.per_piece_cost), { decimals: true }),
          },
          {
            key: 'margin',
            header: 'Gross margin',
            align: 'right',
            render: (r) => pct(margin(r)),
          },
        ]}
        fields={[
          { name: 'flavor', label: 'Flavor', type: 'text', required: true },
          { name: 'per_piece_cost', label: 'Cost per piece (LKR)', type: 'number', step: '0.01', required: true, half: true },
          { name: 'selling_price', label: 'Selling price per piece (LKR)', type: 'number', step: '0.01', required: true, half: true },
          { name: 'batch_pcs', label: 'Batch size (pcs)', type: 'number', half: true },
          { name: 'note', label: 'Note', type: 'text' },
        ]}
        toForm={(r) => ({
          flavor: r.flavor,
          per_piece_cost: String(r.per_piece_cost),
          selling_price: String(r.selling_price),
          batch_pcs: String(r.batch_pcs),
          note: r.note ?? '',
        })}
        fromForm={(v) => ({
          flavor: v.flavor || '',
          per_piece_cost: Number(v.per_piece_cost || 0),
          selling_price: Number(v.selling_price || 0),
          batch_pcs: Number(v.batch_pcs || 20),
          note: v.note || null,
        })}
      />
      <p className="mt-4 text-xs text-cocoa-400">
        Cost per piece is the recipe cost for one brownie; gross margin = (price − cost) ÷ price.
        Ingredient-level breakdowns are stored in <code>ops_recipe_ingredients</code> and were seeded
        from your COSTING sheet.
      </p>
    </div>
  )
}
