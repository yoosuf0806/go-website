// Money is LKR throughout. Ad spend may be recorded in USD but is always
// normalised to LKR (amount_lkr) before it reaches these helpers.

export function lkr(n: number | null | undefined, opts: { decimals?: boolean } = {}): string {
  const v = Number(n ?? 0)
  return (
    'Rs ' +
    v.toLocaleString('en-LK', {
      minimumFractionDigits: opts.decimals ? 2 : 0,
      maximumFractionDigits: opts.decimals ? 2 : 0,
    })
  )
}

export function pct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || !isFinite(n)) return '—'
  return (n * 100).toFixed(decimals) + '%'
}

export function num(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString('en-LK')
}

// "2026-06-01" -> "Jun 2026"
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1))
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Month key "YYYY-MM" from any ISO date string.
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// First-of-month date string for a given ISO date (for month-scoped tables).
export function firstOfMonth(isoDate: string): string {
  return isoDate.slice(0, 7) + '-01'
}

// Financial year of a month key. Golden Oven's FY starts in March, so any month
// from March onward belongs to that calendar year's FY; Jan/Feb roll back one.
export function financialYearOf(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return m >= 3 ? y : y - 1
}

export function fyLabel(fy: number): string {
  return `FY ${fy}/${(fy + 1).toString().slice(-2)}`
}
