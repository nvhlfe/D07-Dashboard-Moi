// Test lib/team.js bang file Daily Sales THAT 25.10 (node):
//  - buildTeam: tong TVV/Unit, luot Act uoc tinh (dinh nghia: caseNet > 0
//    hoac actCase > 0 — doi chieu DOC LAP truc tiep tu data.agents),
//    actNeed/actEnough theo nguong MOC 6, tong nop/PH hoa giai voi buildCases.
//  - flattenAgents: du 547 TVV, moi dong kem unit.
// LUU Y con so Act: sheet Agent THO co 35 dong 'Case Net' > 0, nhung 1 dong
// bi loai boi bo loc dong hop le cua parseDaily (YearMonth/AGCode) nen
// data.agents chi con 34 TVV dat Act. Test doi chieu tren data.agents
// (du lieu app thuc su dung), KHONG khoa cung 35.
// Chay: node scripts/test-team.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { buildCases } from '../src/lib/cases.js'
import { buildTeam, flattenAgents, MOC_TARGET } from '../src/lib/team.js'

const path = process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx'
const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
const parsed = parseWorkbook(wb)
const SNAP_ID = '2026-10-25'
const snapshot = { id: SNAP_ID, data: parsed }
const cases = buildCases(snapshot)
const team = buildTeam(snapshot, cases)
const t = team.totals

console.log('=== buildTeam — Daily_Sales_25.10.xlsx, snapshot', SNAP_ID, '===')
console.log(`Units: ${t.unitCount} · TVV: ${t.agentCount} · TVV dat Act (uoc tinh): ${t.actAgents} · Unit du MOC: ${t.unitsEnough}/${t.unitCount}`)
console.log(`Tong FYP: ${Math.round(t.fyp * 10) / 10} tr · Tong FYC: ${Math.round(t.fyc * 10) / 10} tr`)

// ── Nguong MOC + tong TVV ──
assert.strictEqual(MOC_TARGET, 6, 'MOC_TARGET phai = 6 luot/Unit')
assert.strictEqual(t.agentCount, 547, 'Tong TVV (agent sheet Agent) phai = 547')

// ── unitCount: dem doc lap = |units sheet Leader ∪ unit cua agents| ──
const unitUnion = new Set([
  ...Object.keys(parsed.units),
  ...Object.values(parsed.agents).map((a) => String(a.unit || '')),
])
console.log(`unitCount: buildTeam=${t.unitCount} · dem doc lap (Leader ∪ Agent)=${unitUnion.size}`)
assert.strictEqual(t.unitCount, unitUnion.size, 'unitCount phai khop dem doc lap tu data.units ∪ units cua agents')
assert.strictEqual(team.units.length, unitUnion.size, 'So Unit liet ke phai = unitCount')

// ── Luot Act: dem doc lap truc tiep tu data.agents bang 2 cot khac nhau ──
const agentsArr = Object.values(parsed.agents)
const actByCaseNet = agentsArr.filter((a) => Number(a.caseNet) > 0).length
const actByActCase = agentsArr.filter((a) => Number(a.actCase) > 0).length
const xor = agentsArr.filter((a) => (Number(a.caseNet) > 0) !== (Number(a.actCase) > 0)).length
console.log(`TVV dat Act — dem doc lap: caseNet>0 = ${actByCaseNet} · actCase>0 = ${actByActCase} · lech nhau (xor) = ${xor}`)
assert.strictEqual(xor, 0, "2 cot 'Case Net' va 'Active Net (Case)' phai khop 100% (>0) tren TVV hop le")
assert.strictEqual(t.actAgents, actByCaseNet, 'totals.actAgents phai = so agent caseNet>0 dem truc tiep tu data.agents')
assert.strictEqual(t.actAgents, actByActCase, 'totals.actAgents phai = so agent actCase>0 dem truc tiep tu data.agents')
const flat = flattenAgents(team)
assert.strictEqual(flat.filter((a) => a.isAct).length, actByCaseNet, 'So agentView isAct=true phai = so dem doc lap')
assert.ok(flat.every((a) => a.isAct === (Number(parsed.agents[a.msdl].caseNet) > 0 || Number(parsed.agents[a.msdl].actCase) > 0)), 'isAct cua tung TVV phai khop dinh nghia tu data.agents')

// ── Tung Unit: actNeed / actEnough dung cong thuc nguong 6 ──
for (const u of team.units) {
  assert.strictEqual(u.actNeed, Math.max(0, MOC_TARGET - u.actCount), `Unit ${u.unit}: actNeed phai = max(0, 6 - actCount)`)
  assert.strictEqual(u.actEnough, u.actCount >= MOC_TARGET, `Unit ${u.unit}: actEnough phai ⟺ actCount >= 6`)
  assert.strictEqual(u.agentCount, u.agents.length, `Unit ${u.unit}: agentCount phai = so TVV trong danh sach`)
  assert.strictEqual(u.actCount, u.agents.filter((a) => a.isAct).length, `Unit ${u.unit}: actCount phai = so TVV isAct cua Unit`)
}
assert.strictEqual(t.unitsEnough, team.units.filter((u) => u.actEnough).length, 'unitsEnough phai = so Unit actEnough')

// ── Sap xep Unit: chua du MOC truoc, trong nhom FYP giam dan ──
for (let i = 1; i < team.units.length; i++) {
  const prevU = team.units[i - 1]
  const curU = team.units[i]
  if (prevU.actEnough === curU.actEnough) {
    assert.ok(prevU.fyp >= curU.fyp - 1e-9, `Trong cung nhom MOC, Unit phai sap FYP giam dan (${prevU.unit} truoc ${curU.unit})`)
  } else {
    assert.ok(prevU.actEnough === false && curU.actEnough === true, 'Unit chua du MOC phai xep truoc Unit da du')
  }
}

// ── Hoa giai nop / PH / pending voi buildCases (dem truc tiep tu cases) ──
const directNop = cases.filter((c) => c.inProposal).length
const directPh = cases.filter((c) => c.effectiveStatus === 'IF').length
const directPend = cases.filter((c) => c.effectiveStatus === 'PS').length
const sumNop = flat.reduce((s, a) => s + a.nop, 0)
const sumPh = flat.reduce((s, a) => s + a.ph, 0)
const sumPend = flat.reduce((s, a) => s + a.pend, 0)
console.log(`Hoa giai ho so: nop buildTeam=${sumNop} / buildCases=${directNop} · PH buildTeam=${sumPh} / buildCases=${directPh} · pending buildTeam=${sumPend} / buildCases=${directPend}`)
assert.strictEqual(sumNop, directNop, 'Tong nop theo TVV phai = so case inProposal cua buildCases')
assert.strictEqual(sumPh, directPh, 'Tong PH theo TVV phai = so case IF cua buildCases')
assert.strictEqual(directPh, 101, 'So ho so phat hanh (IF duy nhat) file 25.10 phai = 101')
assert.strictEqual(sumPend, directPend, 'Tong pending theo TVV phai = so case PS cua buildCases')

// ── flattenAgents: du TVV, kem unit dung ──
assert.strictEqual(flat.length, 547, 'flattenAgents phai tra du 547 TVV')
assert.ok(flat.every((a) => typeof a.unit === 'string' && a.unit === String(parsed.agents[a.msdl].unit || '')), 'Moi agentView phang phai kem unit dung cua TVV do')
assert.strictEqual(new Set(flat.map((a) => a.msdl)).size, 547, 'flattenAgents khong duoc trung/thieu MSDL')

// ── Tong FYP/FYC: hoa giai voi cong truc tiep tu data.agents ──
const directFyp = agentsArr.reduce((s, a) => s + (Number(a.fyp) || 0), 0)
const directFyc = agentsArr.reduce((s, a) => s + (Number(a.fyc) || 0), 0)
assert.ok(Math.abs(t.fyp - directFyp) < 1e-6, 'Tong FYP phai = tong FYP sheet Agent')
assert.ok(Math.abs(t.fyc - directFyc) < 1e-6, 'Tong FYC phai = tong FYC sheet Agent')

console.log('Top Unit theo luot Act:', [...team.units].sort((x, y) => y.actCount - x.actCount).slice(0, 3).map((u) => `${u.unit}:${u.actCount}/${MOC_TARGET}`).join(' · '))
console.log(`TVV chua co ho so (nop=0): ${flat.filter((a) => a.nop === 0).length}`)
console.log('\n✅ TAT CA ASSERT DAT')
