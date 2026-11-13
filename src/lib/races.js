// ─────────────────────────────────────────────────────────────
// races.js — TAB THI DUA: cau hinh 3 chuong trinh thi dua dang chay
// + ham tinh THUAN tu cac snapshot Daily Sales (khong phu thuoc
// React/Firebase de test bang node — scripts/test-races.mjs).
//
// NGUON DINH NGHIA: 2 memo 00211 + 00210 dung lai DINH NGHIA cua
// khoi "Du bao thi dua" o dashboard cu (Lan chot 05/11/2026, code cu
// o legacy-backup/insightsLogic.js):
//  - Co so IP PHAT HANH = ho so trang thai IF trong Proposal, lay
//    ipSub cua tung DONG (snapshot luy ke: chi dung doc MOI NHAT
//    cua moi thang).
//  - Pru Yen Tam Vui Khoe = ma san pham TA9; Pru-Dau Tu Vung Tien
//    nhan dien qua ten san pham (parseDaily gop ProductCode vao
//    truong product khi khong co ten VN — nhan dien ca 2 dang).
// Memo 00311 (Kickoff) dung IP THUAN = tong ipNet cac dong IF theo
// TVV, dem theo dong — CUNG dinh nghia issuedRow cua team.js/homeKpi.
//
// Nguong "SAP DAT": con thieu <= 20% cua moc ke tiep HOAC <= 10tr —
// lay nguong NAO LON HON (dieu kien nao "toi truoc" khi TVV tien
// gan moc): gap <= max(20% x moc ke, 10tr).
// ─────────────────────────────────────────────────────────────

const n = (v) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

// ── Nhan dien san pham ──
export const TA9_CODE = 'TA9'
export function isTA9Product(product) {
  const s = String(product || '').toUpperCase()
  return s.includes(TA9_CODE) || s.includes('YÊN TÂM VUI KHỎE') || s.includes('YEN TAM VUI KHOE')
}
export function isDTVTProduct(product) {
  const s = String(product || '').toUpperCase()
  return s.includes('ĐẦU TƯ VỮNG TIẾN') || s.includes('DAU TU VUNG TIEN') || s.includes('UR9')
}

/** Doc MOI NHAT cua 1 thang ('YYYY-MM') trong snaps, khong co -> null. */
export function latestSnapOfMonth(snaps, ym) {
  const list = (snaps || []).filter((s) => s && s.id && s.id.startsWith(`${ym}-`))
  return list.length ? list[list.length - 1] : null
}

/**
 * IP PHAT HANH theo TVV tu 1 snapshot: chi dong IF, lay ipSub.
 * forQ4=true: loai ho so Pru-Dau Tu Vung Tien co IP < 20tr (Memo 00210).
 * Tra Map msdl -> { msdl, name, unit, ip, ipTA9, cases }.
 */
export function issuedSubByAgent(snap, { forQ4 = false } = {}) {
  const byCode = new Map()
  const rows = (snap && snap.data && snap.data.proposalRows) || []
  for (const p of rows) {
    if (p.statusGroup !== 'IF') continue
    const ip = n(p.ipSub)
    if (forQ4 && isDTVTProduct(p.product) && ip < 20) continue
    const code = String(p.msdl || '').trim()
    if (!code) continue
    let row = byCode.get(code)
    if (!row) { row = { msdl: code, name: '', unit: '', ip: 0, ipTA9: 0, cases: 0 }; byCode.set(code, row) }
    row.ip += ip
    if (isTA9Product(p.product)) row.ipTA9 += ip
    row.cases += 1
    if (!row.name && p.agName) row.name = p.agName
    if (!row.unit && p.unit) row.unit = p.unit
  }
  return byCode
}

/**
 * IP THUAN theo TVV tu 1 snapshot: chi dong IF, lay ipNet, dem theo
 * dong (cung dinh nghia issuedRow — Memo 00311).
 * Tra Map msdl -> { msdl, name, unit, ip }.
 */
export function issuedNetByAgent(snap) {
  const byCode = new Map()
  const rows = (snap && snap.data && snap.data.proposalRows) || []
  for (const p of rows) {
    if (p.statusGroup !== 'IF') continue
    const code = String(p.msdl || '').trim()
    if (!code) continue
    let row = byCode.get(code)
    if (!row) { row = { msdl: code, name: '', unit: '', ip: 0 }; byCode.set(code, row) }
    row.ip += n(p.ipNet)
    if (!row.name && p.agName) row.name = p.agName
    if (!row.unit && p.unit) row.unit = p.unit
  }
  return byCode
}

// Nguong sap dat: thieu <= max(20% moc ke, 10tr) — xem ghi chu dau file.
export function nearThreshold(nextMin) {
  return Math.max(n(nextMin) * 0.2, 10)
}
export const isNearGap = (gap, nextMin) => n(gap) > 0 && n(gap) <= nearThreshold(nextMin)

const byValueDesc = (a, b) => (b.value - a.value) || String(a.name || '').localeCompare(String(b.name || ''), 'vi')
const byGapAsc = (a, b) => (a.gap - b.gap) || (b.value - a.value) || String(a.name || '').localeCompare(String(b.name || ''), 'vi')

// ─────────────────────────────────────────────────────────────
// (1) Memo 00311/AD/2026 — Kickoff 2027 (thang 11/2026)
// ─────────────────────────────────────────────────────────────
export const KICKOFF_TARGET = 50 // TVV thuong: IP thuan T11 >= 50tr -> 1 ve
export const KICKOFF_TARGET_NEW = 25 // TVV MOI co hoat dong: >= 25tr -> 1 ve

export const RACE_KICKOFF_META = {
  id: 'kickoff',
  memo: '00311/AD/2026',
  name: 'Tăng tốc về đích 2026 — Ghi danh Agency Kickoff 2027',
  periodLabel: '01/11 – 30/11/2026',
  deadline: '2026-11-30',
  tiersSummary: [
    'TVV: IP thuần tháng 11 từ 50tr → 01 vé tham dự',
    'TVV MỚI có hoạt động: IP thuần tháng 11 từ 25tr → 01 vé',
  ],
  notes: [
    'TVV mới được xác định theo lần đầu xuất hiện trong dữ liệu Daily (chưa có mặt ở snapshot tháng 10/2026) — danh sách chính thức theo điều kiện tốt nghiệp T10–T11/2026 của memo, Admin đối chiếu thêm.',
    'Điều kiện nhận vé ngoài Daily: tỷ lệ duy trì phí tái tục cá nhân tại 30/11/2026 từ 75%; TVV mới không áp dụng cho trường hợp khôi phục hợp đồng dưới 24 tháng; tối đa 01 vé/TVV.',
    'Vé cho QLTVV có TVV mới đạt chuẩn và vé giới thiệu: memo có quy định riêng — app không tự tính (Daily không có dữ kiện người giới thiệu), xem ghi chú trong memo.',
  ],
}

/**
 * TVV MOI (xap xi theo du lieu Daily app co): co mat trong du lieu
 * thang 11 (sheet Agent hoac co dong phat hanh) nhung KHONG co mat
 * trong sheet Agent cua snapshot thang 10/2026.
 */
export function raceKickoff(snaps) {
  const snapNov = latestSnapOfMonth(snaps, '2026-11')
  const snapOct = latestSnapOfMonth(snaps, '2026-10')
  if (!snapNov) return { meta: RACE_KICKOFF_META, dataDate: null, hasOct: !!snapOct, achieved: [], near: [], counts: { standard: 0, fresh: 0 } }
  const octAgents = new Set(Object.keys((snapOct && snapOct.data && snapOct.data.agents) || {}))
  const novAgents = (snapNov.data && snapNov.data.agents) || {}
  const net = issuedNetByAgent(snapNov)
  // Tap ung vien: moi TVV co o sheet Agent T11 hoac co IP thuan T11.
  const candidates = new Map()
  for (const [msdl, a] of Object.entries(novAgents)) {
    candidates.set(msdl, { msdl, name: a.agName || '', unit: a.unit || '', ip: 0 })
  }
  for (const [msdl, r] of net.entries()) {
    const cur = candidates.get(msdl) || { msdl, name: r.name, unit: r.unit, ip: 0 }
    cur.ip = r.ip
    if (!cur.name) cur.name = r.name
    if (!cur.unit) cur.unit = r.unit
    candidates.set(msdl, cur)
  }
  const achieved = []
  const near = []
  let standard = 0
  let fresh = 0
  for (const c of candidates.values()) {
    const isNew = !octAgents.has(c.msdl)
    const target = isNew ? KICKOFF_TARGET_NEW : KICKOFF_TARGET
    if (c.ip >= target) {
      if (isNew) fresh += 1; else standard += 1
      achieved.push({
        ...c, value: c.ip, isNew,
        tierLabel: isNew ? '🎟️ Vé Kickoff — TVV mới (mốc 25tr)' : '🎟️ Vé Kickoff (mốc 50tr)',
      })
    } else if (isNearGap(target - c.ip, target)) {
      near.push({
        ...c, value: c.ip, isNew, gap: target - c.ip,
        nextLabel: isNew ? 'mốc 25tr (vé TVV mới)' : 'mốc 50tr (vé Kickoff)',
      })
    }
  }
  achieved.sort(byValueDesc)
  near.sort(byGapAsc)
  return { meta: RACE_KICKOFF_META, dataDate: snapNov.id, hasOct: !!snapOct, achieved, near, counts: { standard, fresh } }
}

// ─────────────────────────────────────────────────────────────
// (2) Memo 00211/AD/2026 — Thi dua Thang 11/2026
// ─────────────────────────────────────────────────────────────
export const NOV_TIERS = [
  { min: 100, label: 'Từ 100tr — thưởng 8% IP', bonus: (ip) => ip * 0.08 },
  { min: 50, label: '50–<100tr — thưởng 5,0tr', bonus: () => 5 },
  { min: 25, label: '25–<50tr — thưởng 2,5tr', bonus: () => 2.5 },
  { min: 18, label: '18–<25tr — thưởng 1,5tr', bonus: () => 1.5 },
]
export const NOV_BONUS_CAP = 100

export const RACE_NOV_META = {
  id: 'nov',
  memo: '00211/AD/2026',
  name: 'Thi đua Tháng 11/2026',
  periodLabel: '01/11 – 30/11/2026',
  deadline: '2026-11-30',
  tiersSummary: [
    'IP phát hành từ 18–<25tr → thưởng 1,5tr',
    'IP phát hành từ 25–<50tr → thưởng 2,5tr',
    'IP phát hành từ 50–<100tr → thưởng 5,0tr',
    'IP phát hành từ 100tr → thưởng 8% IP (tổng thưởng tối đa 100tr/TVV)',
  ],
  notes: [
    'Thưởng chính được nhân đôi (×2) nếu IP bán cùng đạt từ 40% — điều kiện này Daily chưa có dữ kiện, app chỉ ghi nhận thưởng gốc, Admin đối chiếu thêm.',
  ],
}

/** Bac thuong 00211 tu IP phat hanh thang 11 (don vi: trieu dong). */
export function novTier(ip) {
  const v = n(ip)
  let cur = null
  for (const t of NOV_TIERS) if (v >= t.min) { cur = t; break }
  const bonus = cur ? Math.min(cur.bonus(v), NOV_BONUS_CAP) : 0
  const nextMin = v < 18 ? 18 : v < 25 ? 25 : v < 50 ? 50 : v < 100 ? 100 : null
  return { tier: cur, bonus, nextMin, gap: nextMin !== null ? nextMin - v : 0 }
}

export function raceNov(snaps) {
  const snapNov = latestSnapOfMonth(snaps, '2026-11')
  if (!snapNov) return { meta: RACE_NOV_META, dataDate: null, achieved: [], near: [], counts: { total: 0, byTier: [0, 0, 0, 0] } }
  const byAgent = issuedSubByAgent(snapNov)
  const achieved = []
  const near = []
  const byTier = [0, 0, 0, 0] // theo thu tu NOV_TIERS: >=100, 50, 25, 18
  for (const r of byAgent.values()) {
    const t = novTier(r.ip)
    if (t.tier) {
      const idx = NOV_TIERS.indexOf(t.tier)
      if (idx >= 0) byTier[idx] += 1
      achieved.push({
        msdl: r.msdl, name: r.name, unit: r.unit, value: r.ip,
        tierLabel: t.tier.label, bonus: t.bonus,
      })
    } else if (t.nextMin !== null && isNearGap(t.gap, t.nextMin)) {
      near.push({ msdl: r.msdl, name: r.name, unit: r.unit, value: r.ip, gap: t.gap, nextLabel: 'mốc 18tr (thưởng 1,5tr)' })
    }
  }
  achieved.sort(byValueDesc)
  near.sort(byGapAsc)
  return { meta: RACE_NOV_META, dataDate: snapNov.id, achieved, near, counts: { total: achieved.length, byTier } }
}

// ─────────────────────────────────────────────────────────────
// (3) Memo 00210/AD/2026 — Quy 4/2026
// ─────────────────────────────────────────────────────────────
export const Q4_GIFTS = [
  { min: 900, label: 'iPhone Duo 256GB' },
  { min: 600, label: 'iPhone 18 Pro Max 256GB' },
]

export const RACE_Q4_META = {
  id: 'q4',
  memo: '00210/AD/2026',
  name: 'Đỉnh cao hiệu suất — Rinh ngay quà lớn (Quý 4/2026)',
  periodLabel: 'Quý 4/2026 (T10–T12)',
  deadline: '2026-12-31',
  tiersSummary: [
    'IP tính thưởng 600–<900tr → iPhone 18 Pro Max 256GB',
    'IP tính thưởng từ 900tr → iPhone Duo 256GB (tối đa 1 quà/TVV, không quy đổi tiền)',
    'Hệ số nhân: T10 ×2 · T11 ×1,5 (TA9 ×2) · T12 ×1 (TA9 ×2)',
  ],
  notes: [
    'Hồ sơ Pru-Đầu Tư Vững Tiến chỉ tính khi IP từ 20tr (dưới 20tr không tính vào IP thưởng quý).',
  ],
}

/** IP tinh thuong Q4 cua 1 TVV tu IP phat hanh tung thang (da loai DTVT < 20tr o tang du lieu). */
export function q4BonusIp({ octIp = 0, novIp = 0, novIpTA9 = 0, decIp = 0, decIpTA9 = 0 } = {}) {
  return n(octIp) * 2
    + (n(novIp) - n(novIpTA9)) * 1.5 + n(novIpTA9) * 2
    + (n(decIp) - n(decIpTA9)) * 1 + n(decIpTA9) * 2
}

export function raceQ4(snaps) {
  const snapOct = latestSnapOfMonth(snaps, '2026-10')
  const snapNov = latestSnapOfMonth(snaps, '2026-11')
  const snapDec = latestSnapOfMonth(snaps, '2026-12')
  const base = { meta: RACE_Q4_META, hasDec: !!snapDec, dataDates: { oct: snapOct?.id || null, nov: snapNov?.id || null, dec: snapDec?.id || null } }
  if (!snapOct && !snapNov && !snapDec) return { ...base, achieved: [], near: [], counts: { total: 0, duo: 0, pro: 0 } }
  const oct = issuedSubByAgent(snapOct, { forQ4: true })
  const nov = issuedSubByAgent(snapNov, { forQ4: true })
  const dec = issuedSubByAgent(snapDec, { forQ4: true })
  const keys = new Set([...oct.keys(), ...nov.keys(), ...dec.keys()])
  const achieved = []
  const near = []
  let duo = 0
  let pro = 0
  for (const k of keys) {
    const o = oct.get(k); const nv = nov.get(k); const dc = dec.get(k)
    const ref = nv || o || dc
    const bonusIp = q4BonusIp({
      octIp: o?.ip || 0,
      novIp: nv?.ip || 0, novIpTA9: nv?.ipTA9 || 0,
      decIp: dc?.ip || 0, decIpTA9: dc?.ipTA9 || 0,
    })
    if (bonusIp <= 0) continue
    const row = { msdl: k, name: ref?.name || '', unit: ref?.unit || '', value: bonusIp }
    const gift = bonusIp >= 900 ? Q4_GIFTS[0] : bonusIp >= 600 ? Q4_GIFTS[1] : null
    if (gift) {
      if (gift.min === 900) duo += 1; else pro += 1
      achieved.push({ ...row, tierLabel: `🎁 ${gift.label}` })
      // Da dat moc thap, sap len moc cao hon (600 -> 900) van vao sap dat.
      if (gift.min === 600 && isNearGap(900 - bonusIp, 900)) {
        near.push({ ...row, gap: 900 - bonusIp, nextLabel: 'mốc 900tr (iPhone Duo 256GB)' })
      }
    } else if (isNearGap(600 - bonusIp, 600)) {
      near.push({ ...row, gap: 600 - bonusIp, nextLabel: 'mốc 600tr (iPhone 18 Pro Max 256GB)' })
    }
  }
  achieved.sort(byValueDesc)
  near.sort(byGapAsc)
  return { ...base, achieved, near, counts: { total: achieved.length, duo, pro } }
}

/** Ca 3 chuong trinh theo thu tu hien thi tren tab Thi Dua. */
export function buildRaces(snaps) {
  return [raceKickoff(snaps), raceNov(snaps), raceQ4(snaps)]
}
