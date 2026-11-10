// ─────────────────────────────────────────────────────────────
// pe.js — PHAN HANG PE (PruElite) TAM TINH cho Dashboard D07 Moi.
// Logic THUAN (khong React / DOM / Firebase) de test bang node.
//
// MO HINH XET HANG PE (Lan LAM RO 10/11/2026 — thay cach xet cu
// "dat ca 2 dieu kien thi lay hang do, thieu thang thi ha hang"):
//   1) HANG DICH xac dinh THUAN theo FYC 12 THANG (L12M):
//        Kim Cuong (Diamond) : FYC L12M >= 180tr
//        Bach Kim (Platinum) : FYC L12M >=  90tr
//        Vang (Gold)         : FYC L12M >=  50tr
//      Chua dat nguong Vang thi DICH van la Vang (kem so FYC con
//      thieu). TUYET DOI khong ha dich xuong hang thap hon vi thieu
//      thang hoat dong.
//   2) So THANG HOAT DONG trong quy la DIEU KIEN DONG HANH de
//      CHINH THUC dat hang dich: dich Kim Cuong / Bach Kim can 3
//      thang, dich Vang can 2 thang ("thang hoat dong" = thang co
//      FYC >= 5tr — PE_ACTIVE_FYC; dem tren cac snapshot cua quy).
//   Vi du chuan: TVV FYC L12M > 180tr, moi co 2 thang hoat dong ->
//   dich KIM CUONG, con thieu 1 thang ("Toi Kim Cuong: can them 1
//   thang hoat dong"); du 3 thang -> "Dat Kim Cuong (tam tinh)".
// (Nguong theo memo cong ty — Lan xac nhan van ap dung 10/11/2026.)
//
// DU LIEU: 100% tu Daily Sales (sheet Agent, parseDaily da parse):
//   - agSeg   = cot AGSegName: HANG HIEN TAI cong ty ghi (Diamond /
//               Platinum / Gold / ...; ngoai 3 hang PE thi coi nhu chua
//               xep hang PE).
//   - fycL12m = cot 'FYC L12M' cua snapshot thang dang xem.
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
 * hang theo FYC va tim hang dich). `months` = so thang hoat dong
 * DIEU KIEN DONG HANH cua hang do (dich can du thang nay moi chinh
 * thuc dat — xem peStatus).
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

/**
 * Hang theo THUAN FYC L12M (fycTier): cao nhat trong PE_TIERS ma
 * fycL12m dat nguong; chua dat nguong Vang -> null.
 */
export function projectedTier(fycL12m) {
  const l = num(fycL12m)
  for (const t of PE_TIERS) {
    if (l >= t.l12m) return t.id
  }
  return null
}

/**
 * Trang thai PE cua 1 TVV theo MO HINH DICH (Lan lam ro 10/11/2026):
 *   agent: object co agSeg + fycL12m (agent tho cua sheet Agent hoac
 *          agentView cua team.js — ca hai deu co 2 truong nay).
 *   activeMonths: so thang hoat dong trong quy tinh den thang dang xem.
 * Tra {
 *   current,      // hang HIEN TAI theo agSeg (null = chua xep hang)
 *   fycTier,      // hang theo thuan FYC L12M (null = chua dat Vang)
 *   projected,    // = hang DICH (trinh bay du kien) — khong bao gio
 *                 // bi ha xuong vi thieu thang hoat dong
 *   target: { tierId, needL12m, lackL12m, needMonths, lackMonths },
 *   qualified,    // true khi du CA FYC lan thang hoat dong cho dich
 *   fycL12m, activeMonths,
 * }
 * Dich = fycTier; fycTier = null thi dich la Vang (gold). lack* da
 * lam tron 0,1tr (FYC) va chan duoi 0.
 */
export function peStatus(agent, activeMonths) {
  const fycL12m = num(agent && agent.fycL12m)
  const months = Math.max(0, Math.floor(num(activeMonths)))
  const current = segToTier(agent && agent.agSeg)
  const fycTier = projectedTier(fycL12m)
  const targetTier = tierById(fycTier) || PE_TIERS[PE_TIERS.length - 1]
  const lackL12m = Math.max(0, R1(targetTier.l12m - fycL12m))
  const lackMonths = Math.max(0, targetTier.months - months)
  return {
    current,
    fycTier,
    projected: targetTier.id,
    target: {
      tierId: targetTier.id,
      needL12m: targetTier.l12m,
      lackL12m,
      needMonths: targetTier.months,
      lackMonths,
    },
    qualified: lackL12m === 0 && lackMonths === 0,
    fycL12m,
    activeMonths: months,
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
 * monthsWithData = so thang CO snapshot trong danh sach truyen vao.
 * So thang hoat dong la DIEU KIEN DONG HANH cua hang dich (xem
 * peStatus) — khong dung de chon hay ha hang dich.
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
 * Ket qua la dieu kien dong hanh thang hoat dong cho hang dich.
 */
export function activeMonthsInQuarter(snaps, msdl) {
  return quarterActivity(snaps, msdl).active
}

/**
 * Danh sach "SAP LEN HANG PE" theo MO HINH DICH: TVV sap dat DICH
 * cua minh theo mot trong 2 kieu:
 *   (a) con thieu FYC L12M trong khoang (0, threshold] tr toi dich;
 *   (b) da du FYC cho dich (lackL12m = 0) va chi thieu DUNG 1 thang
 *       hoat dong.
 * TVV da qualified (du ca 2 dieu kien) KHONG nam trong danh sach.
 * agents: mang agent (tho hoac agentView — can msdl, agName, unit,
 * agSeg, fycL12m). snaps: snapshots cac thang trong quy tinh den
 * thang dang xem (de dem thang hoat dong). Sap xep: thieu FYC it
 * truoc (lackL12m tang dan), hoa thi thieu thang it truoc, roi ten.
 * Tra mang item cua peStatus kem { msdl, agName, unit }.
 */
export function nearRankList(agents, snaps, threshold = PE_NEAR_L12M) {
  const th = num(threshold)
  const out = []
  for (const a of agents || []) {
    if (!a || !a.msdl) continue
    const months = activeMonthsInQuarter(snaps, a.msdl)
    const st = peStatus(a, months)
    const { lackL12m, lackMonths } = st.target
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
  out.sort((x, y) => (x.target.lackL12m - y.target.lackL12m)
    || (x.target.lackMonths - y.target.lackMonths)
    || String(x.agName || '').localeCompare(String(y.agName || ''), 'vi'))
  return out
}
