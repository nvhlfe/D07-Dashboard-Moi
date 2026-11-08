// ─────────────────────────────────────────────────────────────
// memoLib.js — Logic THUAN cho thu vien Memo · Thi dua · Tai lieu.
// Khong phu thuoc Firebase / DOM de test bang node duoc
// (scripts/test-memo.mjs).
// Memo doc: { title, note, summary, warnings, audience: [code],
//   pinned, fileName, pageCount, pages: [url], pdfUrl, pdfPath,
//   pagePaths: [path], displayDate, createdAt (ms), createdBy }
// ─────────────────────────────────────────────────────────────

export const AUDIENCES = [
  { code: 'tvv', label: 'Tư vấn viên' },
  { code: 'ql', label: 'Quản lý' },
  { code: 'kh', label: 'Khách hàng' },
  { code: 'cstn', label: 'Chính sách thu nhập' },
]

export function audienceLabel(code) {
  const a = AUDIENCES.find((x) => x.code === code)
  return a ? a.label : String(code || '')
}

/** Bo dau tieng Viet + chu thuong — de tim kiem khong dau ("thi dua" khop "Thi đua"). */
export function stripDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

/**
 * Loc memo theo tu khoa (khong dau, tim tren title + note + fileName)
 * va theo doi tuong: audience = 'all' (tat ca) hoac 1 code trong AUDIENCES.
 */
export function filterMemos(memos, { q = '', audience = 'all' } = {}) {
  const needle = stripDiacritics(q).trim()
  return (Array.isArray(memos) ? memos : []).filter((m) => {
    if (!m) return false
    if (audience && audience !== 'all' && !(Array.isArray(m.audience) && m.audience.includes(audience))) return false
    if (!needle) return true
    const hay = stripDiacritics(`${m.title || ''} ${m.note || ''} ${m.fileName || ''}`)
    return hay.includes(needle)
  })
}

/** Sap xep: ghim len truoc, trong cung nhom thi memo moi (createdAt lon) truoc. Khong sua mang goc. */
export function sortMemos(memos) {
  return [...(Array.isArray(memos) ? memos : [])].sort((a, b) => {
    const pa = a && a.pinned ? 1 : 0
    const pb = b && b.pinned ? 1 : 0
    if (pa !== pb) return pb - pa
    return (Number(b?.createdAt) || 0) - (Number(a?.createdAt) || 0)
  })
}

/** Tach van ban nhieu dong thanh cac dong y (bo dong rong, trim 2 dau). */
export function summaryLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}
