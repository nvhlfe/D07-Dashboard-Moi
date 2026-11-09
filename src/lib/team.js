// ─────────────────────────────────────────────────────────────
// team.js — Man hinh "Doi Ngu" (Dashboard D07 Moi, SPEC v3, man hinh 3).
// Logic THUAN (khong React / DOM / localStorage) de test bang node duoc.
//
// Nguon: snapshot Daily Sales moi nhat cua thang:
//   - snapshot.data.agents: sheet Agent, khoa theo MSDL (fyp/fyc/caseNet/
//     actCase/agSeg/level/fypYtd/fycQtd/fycL12m/tldtptt/ipSub/ipNet/caseSub
//     — xem lib/parseDaily.js).
//   - snapshot.data.units: sheet Leader, khoa theo UnitCode (leaderName).
//   - cases: lib/cases.js buildCases — ho so DUY NHAT theo MSDL:
//     nop = case inProposal, PH = effectiveStatus 'IF', pend = 'PS'.
//
// DOT LAM LAI THEO MAU D03 (Lan gui anh 08/11/2026): man Doi Ngu hien theo
// TVV kieu BANG VANG (xep hang + thanh xep chong 3 nhom bang groupValue +
// bam vao TVV xem ho so pending cua chinh ho), KHONG con hien theo nhom
// Unit/MOC. Phan buildTeam theo Unit + MOC van GIU trong lib (khong xoa)
// de test cu va kha nang dung lai sau nay khong bi mat.
//
// LUOT ACT / MOC — SO UOC TINH TU DAILY, KHONG PHAI SO CHINH THUC:
// Dinh nghia MOC o ban cu (file Compensation, sheet UM-OFF): duy tri chuc
// danh UM; moi Unit can >= 6 LUOT ACT trong ky; luot = TVV co HD + 2 x
// TVV moi CL. Dashboard moi KHONG co file Compensation nen tu tinh:
// da doi chieu 2 file Daily that (25.10 + 11.10), cot 'Active Net (Case)'
// > 0 khop 100% voi 'Case Net' > 0 o cac TVV hop le, nen dinh nghia:
//   TVV dat Act trong thang <=> caseNet > 0 (hoac actCase > 0),
//   moi TVV dat Act = 1 LUOT cho Unit cua ho.
// KHONG tinh he so x2 cho TVV moi CL (Daily khong co du kien nay).
// So MOC chinh thuc nam o file Compensation.
// LUU Y 09/11/2026: THE UNIT o muc Phong KHONG con hien uoc tinh MOC
// nua — hien "Luot Active" = activeFycUnit (cot '#Active Agent (FYC)
// Unit' sheet Leader, parse o parseDaily). actCount/actNeed/actEnough
// o day van tinh de phuc vu nhom Active (Case Net) trong CHI TIET Unit
// va cac test/tong hop lib khac.
// Don vi tien: trieu dong (nhu du lieu Daily).
// ─────────────────────────────────────────────────────────────

import { groupValue } from './cases.js'

export const MOC_TARGET = 6

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Gop snapshot + cases thanh cau truc Doi Ngu:
 * { units: [{ unit, leaderName, leaderCode, activeFycUnit, agentCount,
 *             fyp, fyc, actCount, actNeed, actEnough, agents: [agentView] }],
 *   totals: { unitCount, agentCount, actAgents, unitsEnough, fyp, fyc } }
 * agentView: { msdl, agName, unit, agSeg, level, fyp, fyc, nop, ph, pend,
 *              isAct, caseNet, fypYtd, fycQtd, fycL12m, tldtptt, ipSub, ipNet, caseSub,
 *              bar: { issued, pending, pipeline, total } (groupValue),
 *              pendingCases: [{ policyNum, proposalNum, product,
 *              proposalDate, ageDays, ageBucket, pendingReasons, value }] }
 * Sap xep: Unit chua du MOC truoc, trong nhom theo FYP giam dan;
 * TVV trong Unit theo FYP giam dan.
 */
export function buildTeam(snapshot, cases) {
  const data = (snapshot && snapshot.data) || snapshot || {}
  const agentsObj = data.agents || {}
  const unitsObj = data.units || {}

  // Dem ho so duy nhat theo MSDL tu cases (buildCases) + tong gia tri trung
  // bay (groupValue) theo nhom trang thai cho thanh xep chong + danh sach
  // ho so pending rut gon cua tung TVV (cho man Doi Ngu kieu Bang Vang).
  const counts = new Map()
  for (const c of cases || []) {
    const msdl = String(c.msdl || '')
    if (!msdl) continue
    const cur = counts.get(msdl) || {
      nop: 0, ph: 0, pend: 0,
      bar: { issued: 0, pending: 0, pipeline: 0, total: 0 },
      pendingCases: [],
    }
    if (c.inProposal) cur.nop += 1
    if (c.effectiveStatus === 'IF') { cur.ph += 1; cur.bar.issued += groupValue(c) }
    if (c.effectiveStatus === 'PS') {
      cur.pend += 1
      cur.bar.pending += groupValue(c)
      cur.pendingCases.push({
        policyNum: c.policyNum || '', proposalNum: c.proposalNum,
        product: c.product || '', proposalDate: c.proposalDate || null,
        ageDays: c.ageDays, ageBucket: c.ageBucket,
        pendingReasons: c.pendingReasons || [], value: groupValue(c),
      })
    }
    if (c.effectiveStatus === 'PIPELINE') cur.bar.pipeline += groupValue(c)
    counts.set(msdl, cur)
  }
  for (const cur of counts.values()) {
    cur.bar.total = cur.bar.issued + cur.bar.pending + cur.bar.pipeline
    // Pending cho lau nhat len truoc — can xu ly truoc
    cur.pendingCases.sort((x, y) => (y.ageDays ?? -1) - (x.ageDays ?? -1))
  }

  const unitMap = new Map()
  const ensureUnit = (unitCode) => {
    const key = String(unitCode || '')
    if (!unitMap.has(key)) {
      const u = unitsObj[key]
      unitMap.set(key, {
        unit: key,
        leaderName: (u && u.leaderName) || '',
        // leaderCode = MSDL cua truong Unit (sheet Leader): DoiNgu dung de
        // chi cho phep UM dung dau Unit do mo CHI TIET phong cua minh.
        leaderCode: (u && u.leaderCode) || '',
        // activeFycUnit = cot '#Active Agent (FYC) Unit' (sheet Leader):
        // so LUOT ACTIVE theo FYC cua Unit. null = file chua co so o Unit
        // nay (UI hien "–"). The Unit o muc Phong hien so nay thay cho
        // uoc tinh MOC (Lan chot 09/11/2026); actCount/actNeed/actEnough
        // ben duoi van giu cho nhom Active cua chi tiet + tong hop lib.
        activeFycUnit: u && typeof u.activeFycUnit === 'number' && Number.isFinite(u.activeFycUnit)
          ? u.activeFycUnit
          : null,
        agents: [],
      })
    }
    return unitMap.get(key)
  }
  // Unit co trong sheet Leader (ke ca chua co TVV nao) van duoc liet ke
  Object.keys(unitsObj).forEach((k) => ensureUnit(k))

  for (const a of Object.values(agentsObj)) {
    const msdl = String(a.msdl || '')
    const c = counts.get(msdl) || {
      nop: 0, ph: 0, pend: 0,
      bar: { issued: 0, pending: 0, pipeline: 0, total: 0 },
      pendingCases: [],
    }
    const view = {
      msdl,
      agName: a.agName || '',
      unit: String(a.unit || ''),
      agSeg: a.agSeg || '',
      level: a.level || '',
      fyp: num(a.fyp),
      fyc: num(a.fyc),
      fypYtd: num(a.fypYtd),
      fycQtd: num(a.fycQtd),
      fycL12m: num(a.fycL12m),
      tldtptt: a.tldtptt === null || a.tldtptt === undefined ? null : num(a.tldtptt),
      ipSub: num(a.ipSub),
      ipNet: num(a.ipNet),
      caseSub: num(a.caseSub),
      // caseNet tho: chi tiet Unit (DoiNgu) hien so nay tung TVV lam can
      // cu Active (isAct o duoi tinh tu caseNet/actCase nhu toan app).
      caseNet: num(a.caseNet),
      nop: c.nop,
      ph: c.ph,
      pend: c.pend,
      bar: c.bar,
      pendingCases: c.pendingCases,
      isAct: num(a.caseNet) > 0 || num(a.actCase) > 0,
    }
    // Unit la (khong co trong sheet Leader) van tao tu agents, leaderName ''
    ensureUnit(view.unit).agents.push(view)
  }

  const totals = { unitCount: 0, agentCount: 0, actAgents: 0, unitsEnough: 0, fyp: 0, fyc: 0 }
  const units = []
  for (const u of unitMap.values()) {
    u.agents.sort((x, y) => y.fyp - x.fyp || String(x.agName).localeCompare(String(y.agName), 'vi'))
    u.agentCount = u.agents.length
    u.fyp = u.agents.reduce((s, a) => s + a.fyp, 0)
    u.fyc = u.agents.reduce((s, a) => s + a.fyc, 0)
    u.actCount = u.agents.filter((a) => a.isAct).length
    u.actNeed = Math.max(0, MOC_TARGET - u.actCount)
    u.actEnough = u.actCount >= MOC_TARGET
    units.push(u)
    totals.agentCount += u.agentCount
    totals.actAgents += u.actCount
    totals.fyp += u.fyp
    totals.fyc += u.fyc
    if (u.actEnough) totals.unitsEnough += 1
  }
  totals.unitCount = units.length
  // Chua du MOC len truoc; trong cung nhom theo FYP giam dan
  units.sort((x, y) => {
    if (x.actEnough !== y.actEnough) return x.actEnough ? 1 : -1
    if (y.fyp !== x.fyp) return y.fyp - x.fyp
    return String(x.unit).localeCompare(String(y.unit))
  })
  return { units, totals }
}

/**
 * Loc danh sach Unit cho MUC PHONG: chi giu Unit CO TRONG sheet Leader
 * (snapshot.data.leaderUnits — tap UnitCode parse tu sheet Leader, xem
 * lib/parseDaily.js), tuc Unit co truong phong chinh thuc (Lan chot
 * 09/11/2026). Unit chi co o sheet Agent (khong truong phong) bi loai.
 * FALLBACK: snapshot cu chua co leaderUnits (nap truoc dot nay) -> tra
 * nguyen danh sach, giu hanh vi cu de khong vo man hinh.
 */
export function filterLeaderUnits(units, leaderUnits) {
  const list = units || []
  if (!Array.isArray(leaderUnits) || leaderUnits.length === 0) return list
  const set = new Set(leaderUnits.map((c) => String(c || '').trim().toUpperCase()))
  return list.filter((u) => set.has(String((u && u.unit) || '').trim().toUpperCase()))
}

/** Lam phang: moi agentView cua moi Unit (da kem truong unit cua chinh no). */
export function flattenAgents(team) {
  const out = []
  for (const u of (team && team.units) || []) {
    for (const a of u.agents) out.push({ ...a, unit: a.unit || u.unit })
  }
  return out
}

const RANK_KEYS = {
  ipNet: (a) => num(a.ipNet), // IP phat hanh (mac dinh, nhu bang chi so D03)
  barTotal: (a) => num(a.bar && a.bar.total), // tong nop theo groupValue
  fyp: (a) => num(a.fyp), // FYP thang (giu cho tuong thich nguoc)
  fyc: (a) => num(a.fyc), // FYC thang (chip sap xep Bang Vang — Lan chot 09/11/2026: cap TVV dung FYC thang thay FYP thang)
}

/**
 * Moc IP phat hanh de TVV duoc coi la "toi Active" theo doanh so:
 * 15 trieu dong IP phat hanh rong trong thang (Lan chot 09/11/2026).
 * Chi tiet Unit (DoiNgu) dung moc nay de ghi so thieu cho TVV CHUA
 * Active (nhom van chia theo Case Net nhu toan app — moc IP chi la
 * nhan giai thich bo sung, khong doi dinh nghia nhom).
 */
export const ACTIVE_IP_TARGET = 15

/**
 * Moc FYC THANG toi thieu cua 1 TVV: 5 trieu dong (Lan chot
 * 09/11/2026). Hang Bang Vang o che do sap theo FYC thang (DoiNgu)
 * dung moc nay lam CANH BAO: TVV co fyc < 5tr thi so FYC to do kem
 * so thieu (FYC_FLOOR - fyc); fyc >= 5tr hien binh thuong. Chi ap o
 * dong FYC cua hang Bang Vang — chi tiet TVV / trang Ca nhan khong
 * dung moc nay, va khong anh huong cach chia danh sach.
 */
export const FYC_FLOOR = 5

/**
 * Xep hang TVV toan GA (moi agentView tu moi Unit) theo sortKey:
 * 'ipNet' (IP phat hanh — mac dinh) | 'barTotal' (tong nop) | 'fyp' | 'fyc'.
 * Giam dan; hoa thi theo ten TVV (tieng Viet) tang dan cho on dinh.
 */
export function rankAgents(team, sortKey = 'ipNet') {
  const keyFn = RANK_KEYS[sortKey] || RANK_KEYS.ipNet
  return flattenAgents(team)
    .slice()
    .sort((x, y) => keyFn(y) - keyFn(x)
      || String(x.agName || '').localeCompare(String(y.agName || ''), 'vi'))
}
