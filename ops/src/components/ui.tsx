import type { ReactNode } from 'react'

// Small shared UI primitives used across every page. Kept in one file so the
// pages stay focused on data + layout rather than styling boilerplate.

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-cocoa-100 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'good' | 'bad'
}) {
  const toneCls =
    tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-cocoa-800'
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-cocoa-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-cocoa-400">{sub}</div>}
    </Card>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-cocoa-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-cocoa-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50'
  const styles = {
    primary: 'bg-cocoa-600 text-white hover:bg-cocoa-700',
    ghost: 'border border-cocoa-200 text-cocoa-700 hover:bg-cocoa-50',
    danger: 'text-rose-600 hover:bg-rose-50',
  }[variant]
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-cocoa-500">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-cocoa-200 px-3 py-1.5 text-sm text-cocoa-800 focus:border-cocoa-400 focus:outline-none focus:ring-1 focus:ring-cocoa-300'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputCls} />
}

export function Loading({ error }: { error?: string | null }) {
  if (error)
    return <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">Error: {error}</div>
  return <div className="p-6 text-sm text-cocoa-400">Loading…</div>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="p-8 text-center text-sm text-cocoa-400">{children}</div>
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: string }) {
  const map: Record<string, string> = {
    default: 'bg-cocoa-100 text-cocoa-700',
    good: 'bg-emerald-100 text-emerald-700',
    warn: 'bg-amber-100 text-amber-700',
    bad: 'bg-rose-100 text-rose-700',
    b2b: 'bg-indigo-100 text-indigo-700',
    b2c: 'bg-sky-100 text-sky-700',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[tone] ?? map.default}`}>
      {children}
    </span>
  )
}
