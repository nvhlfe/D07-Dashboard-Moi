// ─────────────────────────────────────────────────────────────
// pdfCover — Render TRANG 1 cua PDF thanh anh bia JPEG (cho thu
// vien Memo). Dung pdfjs-dist IMPORT TINH (khong React.lazy /
// dynamic import) de tranh lap lai loi chunk lazy bi 404 sau
// deploy nhu ban pdfSplit cu (08/11/2026). Chi dung dung 1 viec:
// tao anh bia; viec XEM memo van doc PDF goc truc tiep qua iframe.
// Worker: import qua ?url theo chuan Vite — file worker duoc phat
// ra cung ban build (co hash) nen khong lech phien ban/asset.
// ─────────────────────────────────────────────────────────────
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const COVER_WIDTH = 700
const COVER_QUALITY = 0.8

/**
 * Render trang 1 cua PDF thanh Blob JPEG.
 * source: ArrayBuffer | Uint8Array | Blob cua file PDF goc.
 * Tra Blob (image/jpeg) hoac null neu khong render duoc
 * (PDF ma hoa/hong/khong co trang) — nguoi goi TU quyet dinh bo
 * qua loi (tao bia la thao tac phu, khong phai thao tac chinh).
 */
export async function renderPdfFirstPageToJpegBlob(source, { targetWidth = COVER_WIDTH, quality = COVER_QUALITY } = {}) {
  let data
  if (source instanceof Blob) {
    data = new Uint8Array(await source.arrayBuffer())
  } else if (source instanceof ArrayBuffer) {
    data = new Uint8Array(source.slice(0))
  } else if (source instanceof Uint8Array) {
    data = source.slice()
  } else {
    return null
  }
  if (!data.length) return null

  let pdf = null
  try {
    pdf = await getDocument({ data }).promise
    if (!pdf.numPages) return null
    const page = await pdf.getPage(1)
    const base = page.getViewport({ scale: 1 })
    if (!base.width) return null
    const viewport = page.getViewport({ scale: targetWidth / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(viewport.width))
    canvas.height = Math.max(1, Math.round(viewport.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // Nen trang truoc khi ve (PDF trong suot -> JPEG se thanh den)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise((resolve) => {
      try { canvas.toBlob((b) => resolve(b), 'image/jpeg', quality) } catch { resolve(null) }
    })
    return blob || null
  } catch (e) {
    console.warn('[pdfCover] render trang 1 that bai:', e)
    return null
  } finally {
    try { if (pdf) await pdf.destroy() } catch { /* bo qua */ }
  }
}
