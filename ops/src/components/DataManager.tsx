import { useMemo, useState, type ReactNode } from 'react'
import { useAsync } from '../hooks/useAsync'
import { Button, Empty, Field, Input, Loading, Select } from './ui'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
}

export interface FieldDef {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'month' | 'select' | 'textarea'
  options?: { value: string; label: string }[]
  required?: boolean
  step?: string
  placeholder?: string
  half?: boolean // render at half width in the form grid
}

interface CrudApi<T> {
  list: () => Promise<T[]>
  create: (row: Partial<T>) => Promise<T>
  update: (id: string, patch: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
}

interface Props<T extends { id: string }> {
  title: string
  api: CrudApi<T>
  columns: ColumnDef<T>[]
  fields: FieldDef[]
  /** Map a row to form values for editing. Defaults to the row itself. */
  toForm?: (row: T) => Record<string, string>
  /** Convert raw form strings into a typed payload for the DB. */
  fromForm: (values: Record<string, string>) => Partial<T>
  /** Optional footer row (totals). */
  footer?: (rows: T[]) => ReactNode
  emptyText?: string
  /** Optional client-side filter surfaced as a search box. */
  searchable?: (row: T, q: string) => boolean
}

export function DataManager<T extends { id: string }>({
  title,
  api,
  columns,
  fields,
  toForm,
  fromForm,
  footer,
  emptyText = 'No entries yet.',
  searchable,
}: Props<T>) {
  const { data, loading, error, reload } = useAsync(() => api.list(), [])
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const all = data ?? []
    if (!searchable || !q.trim()) return all
    return all.filter((r) => searchable(r, q.toLowerCase()))
  }, [data, q, searchable])

  async function onDelete(row: T) {
    if (!confirm('Delete this entry?')) return
    await api.remove(row.id)
    reload()
  }

  return (
    <div className="rounded-xl border border-cocoa-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cocoa-100 px-4 py-3">
        <h2 className="font-semibold text-cocoa-800">{title}</h2>
        <div className="flex items-center gap-2">
          {searchable && (
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="!w-40"
            />
          )}
          <Button onClick={() => setEditing('new')}>+ Add</Button>
        </div>
      </div>

      {loading || error ? (
        <Loading error={error} />
      ) : rows.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cocoa-100 text-left text-xs uppercase tracking-wide text-cocoa-400">
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-2 ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.header}
                  </th>
                ))}
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-cocoa-50 hover:bg-cocoa-50/40">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-2 text-cocoa-700 ${
                        c.align === 'right' ? 'text-right tabular-nums' : ''
                      }`}
                    >
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" onClick={() => setEditing(row)}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => onDelete(row)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {footer && (
              <tfoot>
                <tr className="border-t-2 border-cocoa-200 font-semibold text-cocoa-800">
                  {footer(rows)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {editing && (
        <EntryModal
          fields={fields}
          initial={editing === 'new' ? {} : (toForm ? toForm(editing) : rowToForm(editing))}
          title={editing === 'new' ? `Add ${title}` : `Edit ${title}`}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            const payload = fromForm(values)
            if (editing === 'new') await api.create(payload)
            else await api.update(editing.id, payload)
            setEditing(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function rowToForm<T extends object>(row: T): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) out[k] = v == null ? '' : String(v)
  return out
}

function EntryModal({
  fields,
  initial,
  title,
  onClose,
  onSubmit,
}: {
  fields: FieldDef[]
  initial: Record<string, string>
  title: string
  onClose: () => void
  onSubmit: (values: Record<string, string>) => Promise<void>
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    for (const f of fields) seed[f.name] = initial[f.name] ?? ''
    return seed
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onSubmit(values)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-cocoa-900">{title}</h3>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.name} className={f.half ? 'col-span-1' : 'col-span-2'}>
              <Field label={f.label}>
                {f.type === 'select' ? (
                  <Select
                    value={values[f.name]}
                    required={f.required}
                    onChange={(e) => set(f.name, e.target.value)}
                  >
                    <option value="">—</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    value={values[f.name]}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-cocoa-200 px-3 py-1.5 text-sm text-cocoa-800 focus:border-cocoa-400 focus:outline-none focus:ring-1 focus:ring-cocoa-300"
                  />
                ) : (
                  <Input
                    type={f.type === 'month' ? 'month' : f.type}
                    value={values[f.name]}
                    required={f.required}
                    step={f.step}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
              </Field>
            </div>
          ))}
          {err && <div className="col-span-2 text-sm text-rose-600">{err}</div>}
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
