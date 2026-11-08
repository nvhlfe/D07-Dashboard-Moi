// ─────────────────────────────────────────────────────────────
// journey.js — Du lieu cho 2 bieu do o man "Hom Nay" (theo mau D03 Lan gui):
//   1) "Nhip nop theo ngay": cot xep chong theo ngay nop trong thang, to
//      theo TRANG THAI HIEN TAI cua ho so (Phat hanh / Pending / Chua len phi).
//   2) "Hanh trinh nam": IP phat hanh + so hop dong phat hanh theo tung thang.
// Logic THUAN (khong React / DOM) de test bang node duoc.
// Gia tri dung groupValue cua cases.js de NHAT QUAN voi thanh xep chong o
// man Doi Ngu (Bang Vang) va Sales Report:
//   IF -> IP Net (phat hanh rong); PS/PIPELINE -> APE neu co, khong thi IP Sub;
//   OTHER -> 0 (bo qua khoi bieu do).
// Don vi tien: trieu dong (nhu du lieu Daily).
// ─────────────────────────────────────────────────────────────
import { buildCases, groupValue } from './cases.js'

/**
 * Cong don groupValue theo NGAY NOP (proposalDate) trong thang yyyyMm
 * ('yyyy-mm'), tach 3 nhom theo trang thai hieu luc:
 *   issued   <- effectiveStatus 'IF'
 *   pending  <- effectiveStatus 'PS'
 *   pipeline <- effectiveStatus 'PIPELINE'
 * Ho so OTHER hoac khong co ngay nop / ngay nop ngoai thang -> bo qua.
 * Tra ve map: { 'yyyy-mm-dd': { issued, pending, pipeline, total } }
 * (chi ngay nao co ho so thuoc 3 nhom tren moi co key).
 */
export function dailyStacks(cases, yyyyMm) {
  const out = {}
  if (!yyyyMm) return out
  for (const c of cases || []) {
    const d = c && c.proposalDate
    if (!d || !String(d).startsWith(yyyyMm)) continue
    const st = c.effectiveStatus
    if (st !== 'IF' && st !== 'PS' && st !== 'PIPELINE') continue
    const v = groupValue(c)
    const e = out[d] || (out[d] = { issued: 0, pending: 0, pipeline: 0, total: 0 })
    if (st === 'IF') e.issued += v
    else if (st === 'PS') e.pending += v
    else e.pipeline += v
    e.total += v
  }
  return out
}

// Ngay du lieu cua snapshot: ban ghi dung 'id' (yyyy-mm-dd nhu store.js /
// snapMerge dang dung); chap nhan ca dataDate/date neu nguon khac dua vao.
const snapDateOf = (s) => (s && (s.id || s.dataDate || s.date)) || ''

/**
 * Hanh trinh 12 thang cua 1 nam: moi thang lay snapshot MOI NHAT cua thang do
 * (dataDate thuoc thang; trung dataDate thi ban savedAt muon hon thang) roi
 * buildCases de tinh:
 *   ipIssued  = tong groupValue cac ho so IF (IP phat hanh, trieu dong)
 *   contracts = so ho so IF (so hop dong phat hanh)
 *   dataDate  = ngay du lieu cua snapshot da chon
 * Thang khong co snapshot -> { month, ipIssued: null, contracts: null, dataDate: null }.
 * Tra ve { year, months: [12 phan tu theo thu tu thang 1..12] }.
 */
export function monthJourney(snaps, year) {
  const list = snaps || []
  const months = []
  for (let m = 1; m <= 12; m++) {
    const prefix = `${year}-${String(m).padStart(2, '0')}`
    let best = null
    for (const s of list) {
      const d = snapDateOf(s)
      if (!d.startsWith(prefix)) continue
      if (!best) { best = s; continue }
      const bd = snapDateOf(best)
      if (d > bd) best = s
      else if (d === bd && String(s.savedAt || '') > String(best.savedAt || '')) best = s
    }
    if (!best) {
      months.push({ month: m, ipIssued: null, contracts: null, dataDate: null })
      continue
    }
    let ipIssued = 0
    let contracts = 0
    for (const c of buildCases(best)) {
      if (c.effectiveStatus === 'IF') {
        ipIssued += groupValue(c)
        contracts += 1
      }
    }
    months.push({ month: m, ipIssued, contracts, dataDate: snapDateOf(best) })
  }
  return { year, months }
}
