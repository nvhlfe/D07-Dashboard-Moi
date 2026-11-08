// ─────────────────────────────────────────────────────────────
// pdfSplit.js — Tach file PDF thanh anh JPEG tung trang ngay tren
// trinh duyet (pdfjs-dist bundle LOCAL bang npm, KHONG dung CDN —
// mang cua GA chan nhieu domain ngoai).
// Module nay CHI duoc nap bang dynamic import() tu form Dang memo
// (chi Admin chinh dung) de khong phinh bundle chinh.
// ─────────────────────────────────────────────────────────────
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export const MAX_PDF_BYTES = 25 * 1024 * 1024 // 25MB
export const MAX_PDF_PAGES = 30
const TARGET_WIDTH = 1240 // chieu rong anh trang (px) — du net tren dien thoai/tablet
const JPEG_QUALITY = 0.82

/**
 * Doc file PDF -> anh tung trang.
 * @param {File} file file PDF nguoi dung chon
 * @param {(done:number, total:number)=>void} [onProgress] bao tien trinh tach trang
 * @returns {Promise<{ pageBlobs: Blob[], pageCount: number }>}
 * Nem Error voi message TIENG VIET ro rang khi vuot gioi han / file loi.
 */
export async function pdfToPageImages(file, onProgress) {
  if (!file) throw new Error('Chưa chọn file PDF.')
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')
  if (!isPdf) throw new Error('File đã chọn không phải PDF — vui lòng chọn đúng file .pdf.')
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`File PDF nặng ${(file.size / 1024 / 1024).toFixed(1)}MB — giới hạn tối đa 25MB. Hãy nén file hoặc tách bớt trang rồi đăng lại.`)
  }

  let pdf
  try {
    const buf = await file.arrayBuffer()
    pdf = await pdfjsLib.getDocument({ data: buf }).promise
  } catch (e) {
    console.error('[pdfSplit] getDocument:', e)
    throw new Error('Không đọc được file PDF này (file hỏng, bị đặt mật khẩu hoặc được bảo vệ RMS/IRM). Hãy mở file, in/lưu lại thành PDF không khoá rồi đăng lại.')
  }

  if (pdf.numPages > MAX_PDF_PAGES) {
    throw new Error(`Tài liệu có ${pdf.numPages} trang — giới hạn tối đa ${MAX_PDF_PAGES} trang mỗi memo. Hãy tách tài liệu thành nhiều memo nhỏ hơn.`)
  }

  const pageBlobs = []
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const scale = TARGET_WIDTH / (base.width || TARGET_WIDTH)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.ceil(viewport.width))
      canvas.height = Math.max(1, Math.ceil(viewport.height))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Trình duyệt không tạo được khung vẽ trang PDF.')
      // JPEG khong co alpha: nen trang truoc khi ve (trang PDF nen trong suot se thanh den)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport }).promise
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
      if (!blob) throw new Error(`Không tạo được ảnh trang ${i}.`)
      pageBlobs.push(blob)
      if (typeof onProgress === 'function') onProgress(i, pdf.numPages)
    }
  } catch (e) {
    console.error('[pdfSplit] render:', e)
    if (e instanceof Error && /Không|Trình duyệt/.test(e.message)) throw e
    throw new Error('Đang tách trang thì gặp lỗi — thử lại với file PDF khác hoặc file nhẹ hơn.')
  }

  return { pageBlobs, pageCount: pdf.numPages }
}
