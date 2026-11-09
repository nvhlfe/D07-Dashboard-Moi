// ─────────────────────────────────────────────────────────────
// pdfCover — Render PDF thanh anh JPEG bang pdfjs-dist IMPORT TINH
// (khong React.lazy / dynamic import) de tranh lap lai loi chunk
// lazy bi 404 sau deploy nhu ban pdfSplit cu (08/11/2026).
//  - renderPdfFirstPageToJpegBlob: trang 1 -> anh bia thu vien.
//  - renderPdfAllPagesToJpegBlobs: MOI trang -> anh trang, cho luong
//    "dang PDF -> app tu tach tung trang thanh anh de xem" (Lan chot
//    quay ve cach cu 09/11/2026, thay kieu dang bang nhieu anh loi).
// Worker: import qua ?url theo chuan Vite — file worker duoc phat
// ra cung ban build (co hash) nen khong lech phien ban/asset.
// ─────────────────────────────────────────────────────────────
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const COVER_WIDTH = 700
const COVER_QUALITY = 0.8

// Thong so tach TRANG ANH khi dang/xem memo (nhat quan toan app):
// be rong 1000px, JPEG 0.82, lot nen trang. Tran tach trang: PDF
// nhieu hon 50 trang thi bo qua tach (van xem bang iframe PDF goc).
const PAGE_WIDTH = 1000
const PAGE_QUALITY = 0.82
export const MEMO_MAX_SPLIT_PAGES = 50

// Chuan hoa nguon PDF (Blob | ArrayBuffer | Uint8Array) -> Uint8Array
// ban sao; nguon khong hop le / rong -> null.
async function toPdfBytes(source) {
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
  return data.length ? data : null
}

// Render 1 trang PDF thanh Blob JPEG o be rong cho truoc (lot nen
// trang truoc khi ve — PDF trong suot -> JPEG se thanh den).
// Loi/khong ve duoc -> null (nguoi goi tu quyet dinh).
async function renderPageToJpegBlob(page, targetWidth, quality) {
  try {
    const base = page.getViewport({ scale: 1 })
    if (!base.width) return null
    const viewport = page.getViewport({ scale: targetWidth / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(viewport.width))
    canvas.height = Math.max(1, Math.round(viewport.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise((resolve) => {
      try { canvas.toBlob((b) => resolve(b), 'image/jpeg', quality) } catch { resolve(null) }
    })
    return blob || null
  } catch (e) {
    console.warn('[pdfCover] render 1 trang that bai:', e)
    return null
  }
}

/**
 * Render trang 1 cua PDF thanh Blob JPEG.
 * source: ArrayBuffer | Uint8Array | Blob cua file PDF goc.
 * Tra Blob (image/jpeg) hoac null neu khong render duoc
 * (PDF ma hoa/hong/khong co trang) — nguoi goi TU quyet dinh bo
 * qua loi (tao bia la thao tac phu, khong phai thao tac chinh).
 */
export async function renderPdfFirstPageToJpegBlob(source, { targetWidth = COVER_WIDTH, quality = COVER_QUALITY } = {}) {
  const data = await toPdfBytes(source)
  if (!data) return null

  let pdf = null
  try {
    pdf = await getDocument({ data }).promise
    if (!pdf.numPages) return null
    const page = await pdf.getPage(1)
    return await renderPageToJpegBlob(page, targetWidth, quality)
  } catch (e) {
    console.warn('[pdfCover] render trang 1 that bai:', e)
    return null
  } finally {
    try { if (pdf) await pdf.destroy() } catch { /* bo qua */ }
  }
}

/**
 * Render MOI trang cua PDF thanh mang Blob JPEG theo dung thu tu
 * trang (dung cho luong dang/xem memo dang anh trang).
 * source: ArrayBuffer | Uint8Array | Blob cua file PDF goc.
 * options: { width = 1000, quality = 0.82, maxPages = 50, onPage }
 *   onPage(i, numPages): goi sau khi render xong tung trang (hien
 *   tien trinh "Dang tach trang i/n").
 * Ket qua:
 *  - null: khong mo doc duoc PDF (hong/ma hoa/khong co trang).
 *  - { numPages, blobs: null, tooManyPages: true }: PDF nhieu hon
 *    maxPages trang -> bo qua tach trang (KHONG render trang nao).
 *  - { numPages, blobs, tooManyPages: false }: blobs[i] la Blob JPEG
 *    cua trang i+1; 1 trang le loi -> blobs[i] = null de nguoi goi
 *    tu quyet dinh (huy toan bo tach trang + don file da tai).
 */
export async function renderPdfAllPagesToJpegBlobs(source, { width = PAGE_WIDTH, quality = PAGE_QUALITY, maxPages = MEMO_MAX_SPLIT_PAGES, onPage } = {}) {
  const data = await toPdfBytes(source)
  if (!data) return null

  let pdf = null
  try {
    pdf = await getDocument({ data }).promise
    const numPages = pdf.numPages
    if (!numPages) return null
    if (numPages > maxPages) return { numPages, blobs: null, tooManyPages: true }
    const blobs = []
    for (let i = 1; i <= numPages; i += 1) {
      const page = await pdf.getPage(i)
      const blob = await renderPageToJpegBlob(page, width, quality)
      blobs.push(blob)
      try { page.cleanup() } catch { /* bo qua */ }
      if (typeof onPage === 'function') onPage(i, numPages)
    }
    return { numPages, blobs, tooManyPages: false }
  } catch (e) {
    console.warn('[pdfCover] render toan bo trang that bai:', e)
    return null
  } finally {
    try { if (pdf) await pdf.destroy() } catch { /* bo qua */ }
  }
}
