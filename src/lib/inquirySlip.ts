// Inquiry quotation as a print-optimised HTML document (spec §7 Inquiries
// "quotation PDF" — browser print view). Pure builder + thin print helper.
import type { AdminInquiry } from './adminInquiries'
import { formatDate } from './format'

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildQuotationHtml(inquiry: AdminInquiry): string {
  const label = inquiry.category === 'wedding' ? 'Wedding' : 'Corporate'
  const rows: string[] = [`<div><strong>Contact:</strong> ${esc(inquiry.name)} · ${esc(inquiry.phone)}</div>`]
  if (inquiry.email) rows.push(`<div><strong>Email:</strong> ${esc(inquiry.email)}</div>`)
  if (inquiry.event_date)
    rows.push(`<div><strong>Event date:</strong> ${esc(formatDate(inquiry.event_date))}</div>`)
  if (inquiry.guest_count != null)
    rows.push(`<div><strong>Guests:</strong> ${inquiry.guest_count}</div>`)
  if (inquiry.message) rows.push(`<div><strong>Requirements:</strong> ${esc(inquiry.message)}</div>`)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${label} Quotation — ${esc(inquiry.name)}</title>
<style>
  body { font-family: system-ui, sans-serif; color: #171717; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 16px; }
  .details { font-size: 14px; line-height: 1.7; }
  .quote-box { margin-top: 24px; border: 1px dashed #bbb; border-radius: 8px; padding: 16px; color: #666; font-size: 13px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>Golden Oven — ${label} Quotation</h1>
  <div class="sub">Prepared ${esc(formatDate(new Date()))}</div>
  <div class="details">${rows.join('')}</div>
  <div class="quote-box">Quotation details to be completed by Golden Oven.</div>
</body>
</html>`
}

export function printQuotation(inquiry: AdminInquiry): void {
  const win = window.open('', '_blank', 'width=480,height=640')
  if (!win) return
  win.document.write(buildQuotationHtml(inquiry))
  win.document.close()
  win.focus()
  win.onload = () => win.print()
  setTimeout(() => {
    try {
      win.print()
    } catch {
      /* onload already handled it */
    }
  }, 250)
}
