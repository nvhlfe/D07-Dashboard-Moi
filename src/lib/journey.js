// ─────────────────────────────────────────────────────────────
// journey.js — Du lieu cho 2 bieu do o man "Hom Nay" (theo mau D03 Lan gui):
//   1) "Nhip nop theo ngay": cot xep chong theo ngay nop trong thang, to
//      theo TRANG THAI HIEN TAI cua ho so (Phat hanh / Pending / Chua len phi).
//   2) "Hanh trinh nam": cot FYP + duong so TVV Active theo tung thang
//      (thang co so GA trong gaHistory.js -> so GA; con lai -> Daily Sales).
// Logic THUAN (khong React / DOM) de test bang node duoc.
// Gia tri dung groupValue cua cases.js de NHAT QUAN voi thanh xep chong o
// man Doi Ngu (Bang Vang) va Sales Report:
//   IF -> IP Net (phat hanh rong); PS/PIPELINE -> APE neu co, khong thi IP Sub;
//   OTHER -> 0 (bo qua khoi bieu do).
// Don vi tien: trieu dong (nhu du lieu Daily).
// ─────────────────────────────────────────────────────────────
import { groupValue } from './cases.js'
import { GA_HISTORY } from './gaHistory.js'

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
 * Hanh trinh 12 thang cua 1 nam theo FYP + so TVV Active. Tra ve
 * { year, months: [12 phan tu { month, fyp, act, source }] }, source:
 *   'ga'    — thang co trong GA_HISTORY[year] (so lieu GA Lan gui, gaHistory.js):
 *             lay so GA, UU TIEN hon snapshot Daily cua thang do.
 *   'daily' — thang khong co so GA: lay snapshot MOI NHAT cua thang do
 *             (dataDate thuoc thang; trung dataDate thi ban savedAt muon hon
 *             thang), tinh tu sheet Agent cua snapshot (data.agents, khoa MSDL):
 *               fyp = tong agent.fyp toan GA (trieu dong)
 *               act = so agent co caseNet > 0 (logic Act dung khap app)
 *   null    — khong co ca so GA lan snapshot -> fyp/act null.
 */
export function buildYearJourney(snaps, year) {
  const list = snaps || []
  const gaYear = GA_HISTORY[year] || {}
  const months = []
  for (let m = 1; m <= 12; m++) {
    const ga = gaYear[m]
    if (ga) {
      months.push({ month: m, fyp: ga.fyp, act: ga.act, source: 'ga' })
      continue
    }
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
      months.push({ month: m, fyp: null, act: null, source: null })
      continue
    }
    let fyp = 0
    let act = 0
    for (const a of Object.values(best.data?.agents || {})) {
      fyp += Number(a && a.fyp) || 0
      if ((Number(a && a.caseNet) || 0) > 0) act += 1
    }
    months.push({ month: m, fyp, act, source: 'daily' })
  }
  return { year, months }
}
