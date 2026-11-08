// ─────────────────────────────────────────────────────────────
// team.js — Man hinh "Doi Ngu" (Dashboard D07 Moi, SPEC v3, man hinh 3).
// Logic THUAN (khong React / DOM / localStorage) de test bang node duoc.
//
// Nguon: snapshot Daily Sales moi nhat cua thang:
//   - snapshot.data.agents: sheet Agent, khoa theo MSDL (fyp/fyc/caseNet/
//     actCase/agSeg/level... — xem lib/parseDaily.js).
//   - snapshot.data.units: sheet Leader, khoa theo UnitCode (leaderName).
//   - cases: lib/cases.js buildCases — ho so DUY NHAT theo MSDL:
//     nop = case inProposal, PH = effectiveStatus 'IF', pend = 'PS'.
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
// Don vi tien: trieu dong (nhu du lieu Daily).
// ─────────────────────────────────────────────────────────────

export const MOC_TARGET = 6

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Gop snapshot + cases thanh cau truc Doi Ngu:
 * { units: [{ unit, leaderName, agentCount, fyp, fyc, actCount, actNeed,
 *             actEnough, agents: [agentView] }],
 *   totals: { unitCount, agentCount, actAgents, unitsEnough, fyp, fyc } }
 * agentView: { msdl, agName, unit, agSeg, level, fyp, fyc, nop, ph, pend, isAct }
 * Sap xep: Unit chua du MOC truoc, trong nhom theo FYP giam dan;
 * TVV trong Unit theo FYP giam dan.
 */
export function buildTeam(snapshot, cases) {
  const data = (snapshot && snapshot.data) || snapshot || {}
  const agentsObj = data.agents || {}
  const unitsObj = data.units || {}

  // Dem ho so duy nhat theo MSDL tu cases (buildCases)
  const counts = new Map()
  for (const c of cases || []) {
    const msdl = String(c.msdl || '')
    if (!msdl) continue
    const cur = counts.get(msdl) || { nop: 0, ph: 0, pend: 0 }
    if (c.inProposal) cur.nop += 1
    if (c.effectiveStatus === 'IF') cur.ph += 1
    if (c.effectiveStatus === 'PS') cur.pend += 1
    counts.set(msdl, cur)
  }

  const unitMap = new Map()
  const ensureUnit = (unitCode) => {
    const key = String(unitCode || '')
    if (!unitMap.has(key)) {
      const u = unitsObj[key]
      unitMap.set(key, {
        unit: key,
        leaderName: (u && u.leaderName) || '',
        agents: [],
      })
    }
    return unitMap.get(key)
  }
  // Unit co trong sheet Leader (ke ca chua co TVV nao) van duoc liet ke
  Object.keys(unitsObj).forEach((k) => ensureUnit(k))

  for (const a of Object.values(agentsObj)) {
    const msdl = String(a.msdl || '')
    const c = counts.get(msdl) || { nop: 0, ph: 0, pend: 0 }
    const view = {
      msdl,
      agName: a.agName || '',
      unit: String(a.unit || ''),
      agSeg: a.agSeg || '',
      level: a.level || '',
      fyp: num(a.fyp),
      fyc: num(a.fyc),
      nop: c.nop,
      ph: c.ph,
      pend: c.pend,
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

/** Lam phang: moi agentView cua moi Unit (da kem truong unit cua chinh no). */
export function flattenAgents(team) {
  const out = []
  for (const u of (team && team.units) || []) {
    for (const a of u.agents) out.push({ ...a, unit: a.unit || u.unit })
  }
  return out
}
