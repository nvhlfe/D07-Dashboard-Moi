// ─────────────────────────────────────────────────────────────
// pe.js — PHAN HANG PE (PruElite) TAM TINH cho Sales Report (Dashboard
// D07 Moi). Logic THUAN (khong React / DOM / Firebase) de test bang node.
//
// TIEU CHI (Lan XAC NHAN 10/11/2026: van ap dung theo memo; nguon trich
// tu sheet PE cua file Compensation cu): xep hang HANG QUY theo 2 dieu
// kien dong thoi — FYC 12 thang (L12M) + SO THANG HOAT DONG trong quy:
//   Kim Cuong (Diamond) : FYC L12M >= 180tr VA >= 3 thang hoat dong
//   Bach Kim (Platinum) : FYC L12M >=  90tr VA >= 3 thang hoat dong
//   Vang (Gold)         : FYC L12M >=  50tr VA >= 2 thang hoat dong
// "Thang hoat dong" = thang co FYC >= 5tr (PE_ACTIVE_FYC).
//
// DU LIEU: 100% tu Daily Sales (sheet Agent, parseDaily da parse):
//   - agSeg   = cot AGSegName: HANG HIEN TAI cong ty ghi (Diamond /
//               Platinum / Gold / ...; ngoai 3 hang PE thi coi nhu chua
//               xep hang PE).
//   - fycL12m = cot 'FYC L12M' cua snapshot thang dang xem.
//   - So thang hoat dong: dem tu cac snapshot Daily cua cac thang trong
//     CUNG QUY (moi thang lay ban moi nhat, FYC thang cua TVV >= 5tr).
// HANG TAM TINH chi la so THAM KHAO de dieu hanh — ket qua chinh thuc
// do cong ty xet hang quy (UI co ghi chu ro).
// Don vi tien: trieu dong (nhu du lieu Daily).
// ─────────────────────────────────────────────────────────────

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const R1 = (x) => Math.round(x * 10) / 10

/** Nguong FYC thang de 1 thang duoc coi la "thang hoat dong". */
export const PE_ACTIVE_FYC = 5

/** Nguong "sap len hang": con thieu toi da bay nhieu FYC L12M (tr). */
export const PE_NEAR_L12M = 20

/**
 * Bang hang PE, xep tu CAO xuong THAP (thu tu nay dung cho ca viec chon
 * hang tam tinh cao nhat va tim hang ke tiep).
 */
export const PE_TIERS = [
  { id: 'diamond', label: 'Kim Cương', icon: '💎', l12m: 180, months: 3 },
  { id: 'platinum', label: 'Bạch Kim', icon: '', l12m: 90, months: 3 },
  { id: 'gold', label: 'Vàng', icon: '', l12m: 50, months: 2 },
]

export function tierById(id) {
  return PE_TIERS.find((t) => t.id === id) || null
}

/**
 * Anh xa AGSegName (hang HIEN TAI trong sheet Agent) -> tier PE.
 * Khong phan biet hoa/thuong, chiu duoc gia tri la: chi Diamond /
 * Platinum / Gold moi la hang PE; con lai (rong, 'Silver', khac) -> null
 * (chua xep hang PE).
 */
export function segToTier(agSeg) {
  const s = String(agSeg || '').trim().toUpperCase()
  if (!s) return null
  if (s.includes('DIAMOND')) return 'diamond'
  if (s.includes('PLATINUM')) return 'platinum'
  if (s.includes('GOLD')) return 'gold'
  return null
}

/** Hang TAM TINH cao nhat dat CA 2 dieu kien (L12M + thang hoat dong). */
export function projectedTier(fycL12m, activeMonths) {
  const l = num(fycL12m)
  const m = Math.max(0, Math.floor(num(activeMonths)))
  for (const t of PE_TIERS) {
    if (l >= t.l12m && m >= t.months) return t.id
  }
  return null
}

/**
 * Hang KE TIEP cao hon hang tam tinh (de tinh so con thieu):
 * chua co hang -> Vang; Vang -> Bach Kim; Bach Kim -> Kim Cuong;
 * Kim Cuong -> null (da o hang cao nhat).
 */
export function nextTierOf(tierId) {
  if (!tierId) return PE_TIERS[PE_TIERS.length - 1]
  const idx = PE_TIERS.findIndex((t) => t.id === tierId)
  return idx > 0 ? PE_TIERS[idx - 1] : null
}

/**
 * Trang thai PE cua 1 TVV:
 *   agent: object co agSeg + fycL12m (agent tho cua sheet Agent hoac
 *          agentView cua team.js — ca hai deu co 2 truong nay).
 *   activeMonths: so thang hoat dong trong quy tinh den thang dang xem.
 * Tra { current, projected, fycL12m, activeMonths,
 *       next: { tierId, lackL12m, lackMonths, needL12m, needMonths } | null }
 * lack* da lam tron 0,1tr va chan duoi 0.
 */
export function peStatus(agent, activeMonths) {
  const fycL12m = num(agent && agent.fycL12m)
  const months = Math.max(0, Math.floor(num(activeMonths)))
  const current = segToTier(agent && agent.agSeg)
  const projected = projectedTier(fycL12m, months)
  const next = nextTierOf(projected)
  return {
    current,
    projected,
    fycL12m,
    activeMonths: months,
    next: next ? {
      tierId: next.id,
      lackL12m: Math.max(0, R1(next.l12m - fycL12m)),
      lackMonths: Math.max(0, next.months - months),
      needL12m: next.l12m,
      needMonths: next.months,
    } : null,
  }
}

/**
 * Cac thang cua QUY chua thang (year, month): tra mang 3 phan tu
 * { year, month, ym } theo thu tu tang dan. Quy tinh theo thang duong
 * lich: Q1 = 1-3, Q2 = 4-6, Q3 = 7-9, Q4 = 10-12.
 */
export function quarterMonths(year, month) {
  const start = Math.floor((month - 1) / 3) * 3 + 1
  return [0, 1, 2].map((i) => {
    const m = start + i
    return { year, month: m, ym: `${year}-${String(m).padStart(2, '0')}` }
  })
}

/** Ban snapshot MOI NHAT cua tung thang (khoa 'yyyy-mm') tu danh sach tho. */
export function latestSnapByMonth(snaps) {
  const byMonth = new Map()
  for (const s of snaps || []) {
    if (!s || !s.id) continue
    const ym = String(s.id).slice(0, 7)
    const cur = byMonth.get(ym)
    if (!cur || String(s.id) > String(cur.id)) byMonth.set(ym, s)
  }
  return byMonth
}

function agentOfSnap(snap, msdl) {
  const agents = (snap && snap.data && snap.data.agents) || {}
  const key = String(msdl || '')
  if (agents[key]) return agents[key]
  const up = key.toUpperCase()
  for (const a of Object.values(agents)) {
    if (String((a && a.msdl) || '').toUpperCase() === up) return a
  }
  return null
}

/**
 * Chi tiet hoat dong theo thang cua 1 TVV tren danh sach snapshot DA LOC
 * san (thuong la cac thang trong cung quy, toi thang dang xem):
 * tra { active, monthsWithData, perMonth: [{ ym, fyc, hasData, active }] }.
 * Thang khong co snapshot thi khong xuat hien trong perMonth;
 * monthsWithData = so thang CO snapshot trong danh sach truyen vao
 * (UI dung de ghi chu "dang tinh tren n thang co du lieu").
 */
export function quarterActivity(snaps, msdl) {
  const byMonth = latestSnapByMonth(snaps)
  const perMonth = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, snap]) => {
      const a = agentOfSnap(snap, msdl)
      const fyc = a ? num(a.fyc) : 0
      return { ym, fyc, hasData: !!a, active: !!a && fyc >= PE_ACTIVE_FYC }
    })
  return {
    active: perMonth.filter((m) => m.active).length,
    monthsWithData: perMonth.length,
    perMonth,
  }
}

/**
 * So thang HOAT DONG cua 1 TVV trong quy: dem cac thang (moi thang lay
 * snapshot moi nhat) ma FYC thang cua TVV do >= PE_ACTIVE_FYC (5tr).
 * snaps truyen vao la snapshots cua cac thang trong quy (ham khong tu
 * loc quy — nguoi goi chiu trach nhiem loc, de test ro rang).
 */
export function activeMonthsInQuarter(snaps, msdl) {
  return quarterActivity(snaps, msdl).active
}

/**
 * Danh sach "SAP LEN HANG PE": TVV co hang ke tiep (theo hang TAM TINH)
 * va sap dat duoc mot trong 2 kieu:
 *   (a) con thieu FYC L12M trong khoang (0, threshold] tr; hoac
 *   (b) da du FYC L12M (lackL12m = 0) va chi thieu DUNG 1 thang hoat dong.
 * agents: mang agent (tho hoac agentView — can msdl, agName, unit,
 * agSeg, fycL12m). snaps: snapshots cac thang trong quy tinh den thang
 * dang xem. Sap xep: thieu FYC it truoc (lackL12m tang dan), hoa thi
 * thieu thang it truoc, roi theo ten.
 * Tra mang item cua peStatus kem { msdl, agName, unit }.
 */
export function nearRankList(agents, snaps, threshold = PE_NEAR_L12M) {
  const th = num(threshold)
  const out = []
  for (const a of agents || []) {
    if (!a || !a.msdl) continue
    const months = activeMonthsInQuarter(snaps, a.msdl)
    const st = peStatus(a, months)
    if (!st.next) continue
    const { lackL12m, lackMonths } = st.next
    const nearFyc = lackL12m > 0 && lackL12m <= th
    const nearMonth = lackL12m === 0 && lackMonths === 1
    if (!nearFyc && !nearMonth) continue
    out.push({
      msdl: String(a.msdl),
      agName: a.agName || '',
      unit: a.unit || '',
      ...st,
    })
  }
  out.sort((x, y) => (x.next.lackL12m - y.next.lackL12m)
    || (x.next.lackMonths - y.next.lackMonths)
    || String(x.agName || '').localeCompare(String(y.agName || ''), 'vi'))
  return out
}
