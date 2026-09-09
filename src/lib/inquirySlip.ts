// Inquiry quotation as a print-optimised HTML document (spec §7 Inquiries
// "quotation PDF" — browser print view). Pure builder + thin print helper.
import type { AdminInquiry } from './adminInquiries'
import { formatDate } from './format'
import { sharePdf } from './pdf'

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
  if (inquiry.delivery_address)
    rows.push(`<div><strong>Delivery address:</strong> ${esc(inquiry.delivery_address)}</div>`)
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

// Inline-styled sheet body for PDF capture (html2canvas reads computed styles,
// so styles live on the elements — no external stylesheet).
function quotationSheetInner(inquiry: AdminInquiry, label: string): string {
  const row = (name: string, value: string) =>
    `<tr>
       <td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap;vertical-align:top;">${name}</td>
       <td style="padding:4px 0;color:#171717;">${value}</td>
     </tr>`
  const rows: string[] = [row('Contact', `${esc(inquiry.name)} · ${esc(inquiry.phone)}`)]
  if (inquiry.email) rows.push(row('Email', esc(inquiry.email)))
  if (inquiry.event_date) rows.push(row('Event date', esc(formatDate(inquiry.event_date))))
  if (inquiry.guest_count != null) rows.push(row('Guests', String(inquiry.guest_count)))
  if (inquiry.delivery_address) rows.push(row('Delivery address', esc(inquiry.delivery_address)))
  if (inquiry.message)
    rows.push(row('Requirements', `<span style="white-space:pre-wrap;">${esc(inquiry.message)}</span>`))

  return `
    <div style="border-bottom:2px solid #d92d56;padding-bottom:14px;margin-bottom:18px;">
      <div style="font-size:26px;font-weight:800;color:#d92d56;letter-spacing:-0.5px;">Golden Oven</div>
      <div style="font-size:13px;color:#666;margin-top:2px;">${label} Quotation</div>
    </div>
    <div style="font-size:13px;color:#666;margin-bottom:18px;">Prepared ${esc(formatDate(new Date()))}</div>
    <table style="width:100%;font-size:14px;line-height:1.6;border-collapse:collapse;">${rows.join('')}</table>
    <div style="margin-top:26px;border:1px dashed #bbb;border-radius:8px;padding:14px;color:#666;font-size:13px;line-height:1.6;">
      This summarises the requirements shared for your ${label.toLowerCase()} event. Final pricing will be confirmed by Golden Oven.
    </div>
    <div style="margin-top:22px;font-size:12px;color:#999;">Golden Oven · goldenovenbrownies.com</div>
  `
}

/**
 * Build the quotation as an A4 PDF and open the device share sheet (WhatsApp,
 * email, …), falling back to a download where file-sharing isn't supported.
 * The sheet is rendered into a detached, off-screen node and captured entirely
 * inside the caller's click handler so navigator.share keeps its user
 * activation. Same document + share mechanism as the GO-OPS dashboard.
 */
export async function shareQuotation(inquiry: AdminInquiry): Promise<'shared' | 'downloaded'> {
  const label = inquiry.category === 'wedding' ? 'Wedding' : 'Corporate'
  const container = document.createElement('div')
  // A4 width at 96dpi ≈ 794px; keep it on-screen-sized but off-screen-positioned
  // so html2canvas can lay it out.
  container.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;padding:40px;background:#ffffff;' +
    "font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#171717;"
  container.innerHTML = quotationSheetInner(inquiry, label)
  document.body.appendChild(container)
  try {
    const safeName = inquiry.name.trim().replace(/[^a-z0-9]+/gi, '-') || 'customer'
    return await sharePdf(container, `Golden-Oven-${label}-Quotation-${safeName}`, `${label} Quotation — ${inquiry.name}`)
  } finally {
    container.remove()
  }
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
