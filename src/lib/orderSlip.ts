// Order slip as a self-contained, print-optimised HTML document (spec §7 Orders
// "PDF order slip" — the spec permits a browser print view instead of
// @react-pdf/renderer). buildOrderSlipHtml is pure and unit-tested; printOrderSlip
// is the thin browser side-effect that opens it and triggers the print dialog.
import type { AdminOrder, AdminOrderItem } from './adminOrders'
import { formatLKR, formatDate } from './format'
import { STATUS_LABELS } from './orderStatus'

/** Escape a string for safe interpolation into HTML text/attributes. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function addonText(item: AdminOrderItem): string {
  const parts: string[] = []
  for (const addon of item.addons) {
    const detail = addon.detail
    if (detail && 'lines' in detail) {
      const text = detail.lines.filter((l) => l.trim() !== '').join(' / ')
      parts.push(text ? `Topper: "${text}"` : addon.label)
    } else if (detail && 'color' in detail) {
      parts.push(`Ribbon: ${detail.color}`)
    } else if (detail && 'message' in detail) {
      parts.push(`Msg: "${detail.message}"`)
    } else {
      parts.push(addon.label)
    }
  }
  return parts.join(' | ')
}

export function buildOrderSlipHtml(order: AdminOrder): string {
  const rows = order.order_items
    .map((item) => {
      const addons = addonText(item)
      return `<tr>
        <td>${esc(item.product_name)} — ${esc(item.package_label)} × ${item.box_qty}${
          addons ? `<div class="addons">${esc(addons)}</div>` : ''
        }</td>
        <td class="num">${esc(formatLKR(item.line_total))}</td>
      </tr>`
    })
    .join('')

  const meta: string[] = [`<div><strong>Phone:</strong> ${esc(order.phone)}</div>`]
  if (order.address) meta.push(`<div><strong>Address:</strong> ${esc(order.address)}</div>`)
  if (order.delivery_date)
    meta.push(`<div><strong>Delivery:</strong> ${esc(formatDate(order.delivery_date))}</div>`)
  if (order.note) meta.push(`<div><strong>Note:</strong> ${esc(order.note)}</div>`)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Order #${order.order_no}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; color: #171717; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .status { color: #666; font-size: 13px; margin-bottom: 16px; }
  .customer { font-size: 14px; line-height: 1.5; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .addons { color: #666; font-size: 12px; margin-top: 2px; }
  tfoot td { border-bottom: none; padding-top: 6px; }
  tfoot .total { font-weight: 700; font-size: 15px; border-top: 2px solid #171717; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>Golden Oven — Order #${order.order_no}</h1>
  <div class="status">${esc(STATUS_LABELS[order.status])} · ${esc(order.customer_name)}</div>
  <div class="customer">${meta.join('')}</div>
  <table>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td class="num">Subtotal</td><td class="num">${esc(formatLKR(order.subtotal))}</td></tr>
      <tr><td class="num">Delivery (${order.total_pieces} pcs)</td><td class="num">${esc(
        formatLKR(order.delivery_fee),
      )}</td></tr>
      <tr><td class="num total">Total</td><td class="num total">${esc(formatLKR(order.total))}</td></tr>
    </tfoot>
  </table>
</body>
</html>`
}

/** Open the slip in a new window and trigger the print dialog. */
export function printOrderSlip(order: AdminOrder): void {
  const win = window.open('', '_blank', 'width=480,height=640')
  if (!win) return
  win.document.write(buildOrderSlipHtml(order))
  win.document.close()
  win.focus()
  // Give the new document a tick to lay out before printing.
  win.onload = () => win.print()
  setTimeout(() => {
    try {
      win.print()
    } catch {
      /* onload already handled it */
    }
  }, 250)
}
