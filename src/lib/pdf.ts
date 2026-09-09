// Render a DOM node (a quotation / invoice sheet) to a single-page A4 PDF blob
// and share or download it. Ported from the GO-OPS ops dashboard so both apps
// produce identical documents. The heavy libraries are imported dynamically so
// they load only when a PDF is actually generated, keeping them out of the main
// bundle.
async function elementToPdfBlob(el: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const canvas = await html2canvas(el, {
    scale: 2, // crisper text
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })
  const img = canvas.toDataURL('image/jpeg', 0.92)
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 32
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2
  const ratio = canvas.height / canvas.width

  let renderW = usableW
  let renderH = usableW * ratio
  if (renderH > usableH) {
    // Keep it on one page.
    renderH = usableH
    renderW = usableH / ratio
  }
  pdf.addImage(img, 'JPEG', (pageW - renderW) / 2, margin, renderW, renderH)
  return pdf.output('blob')
}

const withExt = (name: string) => (name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`)

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = withExt(name)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Build the PDF and save it to the device with the given filename. */
export async function downloadPdf(el: HTMLElement, filename: string): Promise<void> {
  triggerDownload(await elementToPdfBlob(el), filename)
}

/**
 * Build the PDF and offer it to the OS share sheet (WhatsApp, email, …) via the
 * Web Share API. Returns 'shared' when the share sheet opened, or 'downloaded'
 * when the platform can't share files and we fell back to a download.
 *
 * Note: navigator.share requires transient user activation, so call this from
 * directly inside a click handler (a single async chain from the gesture).
 */
export async function sharePdf(
  el: HTMLElement,
  filename: string,
  title: string,
): Promise<'shared' | 'downloaded'> {
  const blob = await elementToPdfBlob(el)
  const file = new File([blob], withExt(filename), { type: 'application/pdf' })
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
    share?: (data?: ShareData) => Promise<void>
  }
  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title })
      return 'shared'
    } catch (e) {
      // User cancelled the share sheet — not an error worth surfacing.
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared'
      throw e
    }
  }
  triggerDownload(blob, filename)
  return 'downloaded'
}
