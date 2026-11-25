// ─────────────────────────────────────────────────────────────
// raceProvisional.js — SO TAM TINH tu Daily Sales cho 2 chuong
// trinh dang hien BANG CHINH THUC cua cong ty o tab Thi Dua:
// Memo 00211 (Thang 11/2026) + Memo 00210 (iPhone Quy 4/2026).
// Muc dich: theo doi hang ngay giua cac dot cong ty gui bang —
// SO CHINH THUC van la bang cong ty (lib/raceOfficial +
// lib/iphoneOfficial); so o day chi la TAM TINH.
//
// Cong thuc dung DUNG cac cong thuc thang trong dot KIEM CHUNG
// 25/11/2026 (doi chieu tung dong Daily 18/11/2026 voi bang
// cong ty Memo_18.11.xlsx — bao cao luu tai
// goals/dashboard-d07-m-i-g-n-thi-t-th-c/hidden_files/
// kiem-chung-tu-tinh-00211-00210.md):
//  - 00211: Tong IP tam tinh = Σ ipSub cac dong Proposal trang
//    thai IF cua snapshot T11 moi nhat (khop tuyet doi 23/29
//    TVV); bac thuong theo novTier (lib/races). KHONG ap nhan
//    doi ×2 vi Daily KHONG co du kien IP ban cung (0/29).
//  - 00210 bonus10: Σ ipNet dong IF thang 10, LOAI dong
//    Pru-Dau Tu Vung Tien (UR9) co IP tung ho so < 20tr (khop
//    24/45; khong co quy tac nay chi 12/45).
//  - 00210 bonus11: cong them = 0,5 × IP hop le T11 ho so
//    thuong + 1,0 × IP hop le ho so Pru Yen Tam Vui Khoe (TA9,
//    tong he so ×2) — cung quy tac loai UR9 <20tr (khop 33/45).
//  - 00210 bonus12 (khi co Daily T12): memo chi nhan ×2 cho
//    TA9 -> cong them = 1,0 × IP TA9 hop le T12; ho so thuong
//    cong them 0.
//  - 00210 co so (base): ipNet sheet Agent cong don cac thang
//    10 + 11 (+ 12 khi co) — cong thuc thang o kiem chung
//    (khop 21/45; trang thai dat moc 600/900tr cua tong tam
//    tinh trung 44/45 TVV voi bang cong ty).
// Le ch con lai do cong ty xet hop le tung ho so bang dieu
// kien KHONG nam trong Daily Sales — khong cong thuc nao tu
// Daily khac phuc duoc (da kiem chung).
//
// DON VI: phan 00211 lam viec theo TRIEU DONG (nhu lib/races);
// phan 00210 lam viec theo DONG (nhu lib/iphoneOfficial) —
// Daily luu IP theo trieu nen phan 00210 nhan 1e6 khi quy doi.
// ─────────────────────────────────────────────────────────────
import {
  latestSnapOfMonth, issuedSubByAgent, novTier, isNearGap, NOV_TIERS,
} from './races.js'
import { iphoneRowStatus } from './iphoneOfficial.js'

const n = (v) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

// Nhan dien san pham qua truong `product` cua dong Proposal
// (parseDaily luu ten tieng Viet Remarked_ProductNameVN, thieu
// thi moi la ProductCode — nen khop ca ten lan ma).
const prodStr = (p) => String((p && p.product) || '').toLowerCase()
export const isVungTienRow = (p) => {
  const s = prodStr(p)
  return s.includes('ur9') || s.includes('vững tiến') || s.includes('vung tien')
}
export const isYenTamRow = (p) => {
  const s = prodStr(p)
  return s.includes('ta9') || s.includes('yên tâm vui khỏe') || s.includes('yen tam vui khoe')
}

// Nguong hop le rieng cho Vung Tien (memo 00210): chi tinh ho
// so co IP tu 20tr — Daily luu IP theo TRIEU nen nguong la 20.
export const VUNG_TIEN_MIN_IP_TR = 20

/**
 * IP hop le cho cac cot cong them cua 00210 tu 1 snapshot:
 * chi dong IF; loai dong Vung Tien co ipNet < 20 (trieu).
 * Tra { total, ta9 } theo TRIEU DONG (ta9 = phan IP cua ho so
 * Yen Tam Vui Khoe trong phan hop le).
 */
function eligibleIpByAgent(snap) {
  const byCode = new Map()
  const rows = (snap && snap.data && snap.data.proposalRows) || []
  for (const p of rows) {
    if (p.statusGroup !== 'IF') continue
    const ip = n(p.ipNet)
    if (isVungTienRow(p) && ip < VUNG_TIEN_MIN_IP_TR) continue
    const code = String(p.msdl || '').trim()
    if (!code) continue
    let row = byCode.get(code)
    if (!row) { row = { total: 0, ta9: 0 }; byCode.set(code, row) }
    row.total += ip
    if (isYenTamRow(p)) row.ta9 += ip
  }
  return byCode
}

// ─────────────────────────────────────────────────────────────
// (1) Memo 00211 — TAM TINH tu Daily (don vi: TRIEU DONG)
// Cung cong thuc voi khoi tu tinh cu: Σ ipSub dong IF snapshot
// T11 moi nhat + bac thuong novTier (khong ×2 ban cung).
// ─────────────────────────────────────────────────────────────
export function provisionalNov(snaps) {
  const snapNov = latestSnapOfMonth(snaps, '2026-11')
  if (!snapNov) {
    return { dataDate: null, achieved: [], near: [], counts: { total: 0, byTier: [0, 0, 0, 0] }, totalBonus: 0 }
  }
  const byAgent = issuedSubByAgent(snapNov)
  const achieved = []
  const near = []
  const byTier = [0, 0, 0, 0] // theo thu tu NOV_TIERS: >=100, 50, 25, 18
  let totalBonus = 0
  for (const r of byAgent.values()) {
    const t = novTier(r.ip)
    if (t.tier) {
      const idx = NOV_TIERS.indexOf(t.tier)
      if (idx >= 0) byTier[idx] += 1
      totalBonus += t.bonus
      achieved.push({
        msdl: r.msdl, name: r.name, unit: r.unit, value: r.ip,
        tierLabel: t.tier.label, bonus: t.bonus,
      })
    } else if (t.nextMin !== null && isNearGap(t.gap, t.nextMin)) {
      near.push({ msdl: r.msdl, name: r.name, unit: r.unit, value: r.ip, gap: t.gap, nextLabel: 'mốc 18tr (thưởng 1,5tr)' })
    }
  }
  const byValueDesc = (a, b) => (b.value - a.value) || String(a.name || '').localeCompare(String(b.name || ''), 'vi')
  const byGapAsc = (a, b) => (a.gap - b.gap) || (b.value - a.value) || String(a.name || '').localeCompare(String(b.name || ''), 'vi')
  achieved.sort(byValueDesc)
  near.sort(byGapAsc)
  return {
    dataDate: snapNov.id,
    achieved, near,
    counts: { total: achieved.length, byTier },
    totalBonus,
  }
}

// ─────────────────────────────────────────────────────────────
// (2) Memo 00210 — TAM TINH tu Daily (don vi: DONG)
// Tong tam tinh = base + bonus10 + bonus11 (+ bonus12 khi co
// Daily thang 12). Trang thai moc lay theo iphoneRowStatus
// (moc 600tr Pro Max / 900tr Duo cua lib/iphoneOfficial).
// ─────────────────────────────────────────────────────────────
const TR_TO_DONG = 1000000
const roundDong = (tr) => Math.round(n(tr) * TR_TO_DONG)

export function provisionalIphone(snaps) {
  const snapOct = latestSnapOfMonth(snaps, '2026-10')
  const snapNov = latestSnapOfMonth(snaps, '2026-11')
  const snapDec = latestSnapOfMonth(snaps, '2026-12')
  const used = [snapOct, snapNov, snapDec].filter(Boolean)
  if (!snapOct && !snapNov) {
    return { dataDate: null, rows: [], summary: { total: 0, datPromax: 0, datDuo: 0 } }
  }
  const dataDate = used.length ? used[used.length - 1].id : null

  const acc = new Map()
  const ensure = (code) => {
    let row = acc.get(code)
    if (!row) {
      row = { msdl: code, name: '', unit: '', baseTr: 0, bonus10Tr: 0, bonus11Tr: 0, bonus12Tr: 0 }
      acc.set(code, row)
    }
    return row
  }

  // Co so: ipNet sheet Agent cong don tung thang co du lieu.
  for (const snap of used) {
    const agents = (snap.data && snap.data.agents) || {}
    for (const [msdl, a] of Object.entries(agents)) {
      const row = ensure(String(msdl).trim())
      row.baseTr += n(a && a.ipNet)
    }
  }
  // Cong them T10: he so ×2 -> cong them = 1,0 × IP hop le.
  if (snapOct) {
    for (const [msdl, e] of eligibleIpByAgent(snapOct).entries()) {
      ensure(msdl).bonus10Tr += e.total
    }
  }
  // Cong them T11: thuong ×1,5 -> +0,5; TA9 ×2 -> +1,0.
  if (snapNov) {
    for (const [msdl, e] of eligibleIpByAgent(snapNov).entries()) {
      ensure(msdl).bonus11Tr += (e.total - e.ta9) * 0.5 + e.ta9 * 1.0
    }
  }
  // Cong them T12: chi TA9 ×2 -> +1,0 × IP TA9 hop le.
  if (snapDec) {
    for (const [msdl, e] of eligibleIpByAgent(snapDec).entries()) {
      ensure(msdl).bonus12Tr += e.ta9 * 1.0
    }
  }
  // Ten/Unit: lay tu snapshot thang MOI NHAT co TVV do (Agent
  // truoc, Proposal bo sung cho TVV khong co o sheet Agent).
  for (const snap of [snapDec, snapNov, snapOct]) {
    if (!snap) continue
    const agents = (snap.data && snap.data.agents) || {}
    for (const row of acc.values()) {
      if (row.name) continue
      const a = agents[row.msdl]
      if (a && a.agName) { row.name = a.agName; row.unit = a.unit || row.unit }
    }
    const rows = (snap.data && snap.data.proposalRows) || []
    for (const p of rows) {
      const row = acc.get(String(p.msdl || '').trim())
      if (!row) continue
      if (!row.name && p.agName) row.name = p.agName
      if (!row.unit && p.unit) row.unit = p.unit
    }
  }

  const out = []
  for (const row of acc.values()) {
    const base = roundDong(row.baseTr)
    const bonus10 = roundDong(row.bonus10Tr)
    const bonus11 = roundDong(row.bonus11Tr)
    const bonus12 = roundDong(row.bonus12Tr)
    const total = base + bonus10 + bonus11 + bonus12
    if (total === 0 && base === 0 && bonus10 === 0 && bonus11 === 0 && bonus12 === 0) continue
    out.push({ msdl: row.msdl, name: row.name, unit: row.unit, base, bonus10, bonus11, bonus12, total })
  }
  out.sort((a, b) => (b.total - a.total) || String(a.name || '').localeCompare(String(b.name || ''), 'vi'))

  let datPromax = 0
  let datDuo = 0
  for (const r of out) {
    const st = iphoneRowStatus(r)
    if (st.promax.reached) datPromax += 1
    if (st.duo.reached) datDuo += 1
  }
  return { dataDate, rows: out, summary: { total: out.length, datPromax, datDuo } }
}
