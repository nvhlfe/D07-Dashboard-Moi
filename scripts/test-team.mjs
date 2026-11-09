// Test lib/team.js bang file Daily Sales THAT 25.10 (node):
//  - buildTeam: tong TVV/Unit, luot Act uoc tinh (dinh nghia: caseNet > 0
//    hoac actCase > 0 — doi chieu DOC LAP truc tiep tu data.agents),
//    actNeed/actEnough theo nguong MOC 6, tong nop/PH hoa giai voi buildCases.
//  - flattenAgents: du 547 TVV, moi dong kem unit.
//  - Bang Vang (08/11): agentView co chi so tham khao + bar (groupValue) +
//    pendingCases; rankAgents xep hang dung thu tu; tong bar.issued = 1.577,6tr.
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
import { buildTeam, flattenAgents, rankAgents, filterLeaderUnits, MOC_TARGET, ACTIVE_IP_TARGET, FYC_FLOOR } from '../src/lib/team.js'

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

// ── Bang Vang theo TVV (dot lam lai theo mau D03, 08/11) ──
// agentView phai co cac chi so tham khao + bar (groupValue) + pendingCases.
const r1t = (x) => Math.round(x * 10) / 10
assert.ok(flat.every((a) => typeof a.fypYtd === 'number' && typeof a.fycQtd === 'number' && typeof a.fycL12m === 'number'
  && typeof a.ipSub === 'number' && typeof a.ipNet === 'number' && typeof a.caseSub === 'number'
  && (a.tldtptt === null || typeof a.tldtptt === 'number')
  && a.bar && typeof a.bar.issued === 'number' && typeof a.bar.pending === 'number'
  && typeof a.bar.pipeline === 'number' && Array.isArray(a.pendingCases)),
'agentView phai co fypYtd/fycQtd/fycL12m/tldtptt/ipSub/ipNet/caseSub + bar + pendingCases')
assert.ok(flat.every((a) => Math.abs(a.bar.total - (a.bar.issued + a.bar.pending + a.bar.pipeline)) < 1e-9), 'bar.total phai = issued + pending + pipeline cua tung TVV')

// rankAgents mac dinh (ipNet): phan tu dau phai la TVV co ipNet lon nhat,
// doi chieu truc tiep tu data.agents.
const rankedDefault = rankAgents(team)
const maxIpNet = Math.max(...agentsArr.map((a) => Number(a.ipNet) || 0))
console.log(`\nrankAgents('ipNet'): dau bang = ${rankedDefault[0].agName} (${rankedDefault[0].unit}) ipNet = ${r1t(rankedDefault[0].ipNet)} tr · max ipNet dem truc tiep tu sheet Agent = ${r1t(maxIpNet)} tr`)
assert.strictEqual(rankedDefault.length, 547, 'rankAgents phai tra du 547 TVV')
assert.ok(Math.abs(rankedDefault[0].ipNet - maxIpNet) < 1e-9, 'Phan tu dau rankAgents mac dinh phai co ipNet = max ipNet cua data.agents')
assert.ok(rankedDefault.every((a, i) => i === 0 || rankedDefault[i - 1].ipNet >= a.ipNet - 1e-9), 'rankAgents ipNet phai giam dan')
const rankedBar = rankAgents(team, 'barTotal')
assert.ok(rankedBar.every((a, i) => i === 0 || rankedBar[i - 1].bar.total >= a.bar.total - 1e-9), 'rankAgents barTotal phai giam dan theo bar.total')
const rankedFyp = rankAgents(team, 'fyp')
assert.ok(rankedFyp.every((a, i) => i === 0 || rankedFyp[i - 1].fyp >= a.fyp - 1e-9), 'rankAgents fyp phai giam dan theo fyp')

// Tong bar toan GA: issued phai = 1.577,6 tr (IP Net IF duy nhat).
const barIssued = flat.reduce((s, a) => s + a.bar.issued, 0)
const barPending = flat.reduce((s, a) => s + a.bar.pending, 0)
const barPipeline = flat.reduce((s, a) => s + a.bar.pipeline, 0)
console.log(`Tong bar toan GA: issued = ${r1t(barIssued)} tr · pending = ${r1t(barPending)} tr · pipeline = ${r1t(barPipeline)} tr · tong = ${r1t(barIssued + barPending + barPipeline)} tr`)
assert.ok(Math.abs(barIssued - 1577.6) <= 0.1, `Tong bar.issued toan GA phai = 1.577,6 tr (thuc te ${r1t(barIssued)})`)

// pendingCases: TVV nhieu pending nhat phai khop so case PS dem truc tiep
// tu buildCases theo msdl.
const psByMsdl = new Map()
for (const c of cases) {
  if (c.effectiveStatus !== 'PS') continue
  psByMsdl.set(c.msdl, (psByMsdl.get(c.msdl) || 0) + 1)
}
const topPend = [...flat].sort((x, y) => y.pendingCases.length - x.pendingCases.length)[0]
console.log(`TVV nhieu pending nhat: ${topPend.agName} (${topPend.unit}) = ${topPend.pendingCases.length} HS · dem truc tiep tu buildCases = ${psByMsdl.get(topPend.msdl) || 0} HS`)
assert.strictEqual(topPend.pendingCases.length, psByMsdl.get(topPend.msdl) || 0, 'pendingCases cua TVV nhieu pending nhat phai khop so case PS dem truc tiep tu buildCases')
assert.strictEqual(flat.reduce((s, a) => s + a.pendingCases.length, 0), directPend, 'Tong pendingCases toan GA phai = tong case PS cua buildCases')
assert.ok(flat.every((a) => a.pendingCases.every((pc) => typeof pc.proposalNum === 'string' && Array.isArray(pc.pendingReasons))), 'pendingCases phai co proposalNum + pendingReasons (mang)')

// ── Muc Phong: loc theo sheet Leader + Luot Active cot BD (09/11/2026) ──
// unitView cua buildTeam phai mang activeFycUnit tu data.units (so/null).
assert.ok(team.units.every((u) => u.activeFycUnit === null || (typeof u.activeFycUnit === 'number' && Number.isFinite(u.activeFycUnit))), 'unitView phai co activeFycUnit la so hoac null')
for (const u of team.units) {
  const src = parsed.units[u.unit]
  const exp = src && typeof src.activeFycUnit === 'number' ? src.activeFycUnit : null
  assert.strictEqual(u.activeFycUnit, exp, `Unit ${u.unit}: activeFycUnit cua buildTeam phai khop data.units`)
}
assert.strictEqual(team.units.find((u) => u.unit === '9CJ').activeFycUnit, 1, "Unit 9CJ (25.10): activeFycUnit phai = 1 (cot '#Active Agent (FYC) Unit' sheet Leader)")
const sumActFyc25 = team.units.reduce((s, u) => s + (u.activeFycUnit || 0), 0)
assert.strictEqual(sumActFyc25, 15, 'Tong activeFycUnit toan GA file 25.10 phai = 15 (doi soat doc lap tu file tho)')
// Loc muc Phong: 25.10 con 21 Unit (chi Unit co trong sheet Leader).
const shown25 = filterLeaderUnits(team.units, parsed.leaderUnits)
assert.strictEqual(shown25.length, 21, 'Muc Phong file 25.10: sau loc theo Leader phai con 21 Unit')
assert.ok(shown25.every((u) => parsed.leaderUnits.includes(u.unit)), 'Moi Unit hien o muc Phong phai co trong leaderUnits')
console.log(`Muc Phong 25.10: ${team.units.length} Unit (buildTeam) -> loc Leader con ${shown25.length} · tong Luot Active (cot BD) = ${sumActFyc25}`)
// Fallback snapshot cu (khong co leaderUnits): giu nguyen danh sach.
assert.strictEqual(filterLeaderUnits(team.units, undefined).length, team.units.length, 'Thieu leaderUnits (snapshot cu) -> fallback giu nguyen danh sach Unit')
assert.strictEqual(filterLeaderUnits(team.units, []).length, team.units.length, 'leaderUnits rong -> fallback giu nguyen danh sach Unit')
assert.strictEqual(filterLeaderUnits(team.units, null).length, team.units.length, 'leaderUnits null -> fallback giu nguyen danh sach Unit')
// File 8.11: loc con 20 Unit, tong Luot Active = 7.
const wb811 = XLSX.read(readFileSync(process.env.HOME + '/workspace/user/files/Daily_Sales_8.11.xlsx'), { type: 'buffer', cellDates: false })
const parsed811 = parseWorkbook(wb811)
const snap811 = { id: '2026-11-08', data: parsed811 }
const team811 = buildTeam(snap811, buildCases(snap811))
const shown811 = filterLeaderUnits(team811.units, parsed811.leaderUnits)
const sumActFyc811 = team811.units.reduce((s, u) => s + (u.activeFycUnit || 0), 0)
assert.strictEqual(shown811.length, 20, 'Muc Phong file 8.11: sau loc theo Leader phai con 20 Unit')
assert.strictEqual(sumActFyc811, 7, 'Tong activeFycUnit toan GA file 8.11 phai = 7 (doi soat doc lap tu file tho)')
console.log(`Muc Phong 8.11: ${team811.units.length} Unit (buildTeam) -> loc Leader con ${shown811.length} · tong Luot Active (cot BD) = ${sumActFyc811}`)

// ── Dot 09/11/2026 (tieptheo): sap xep Bang Vang theo FYC thang + moc 15tr IP ──
console.log('\n=== rankAgents theo FYC thang + moc ACTIVE_IP_TARGET (15tr IP) ===')
assert.strictEqual(ACTIVE_IP_TARGET, 15, 'ACTIVE_IP_TARGET phai = 15 (trieu dong IP phat hanh)')
// rankAgents('fyc') o file 25.10: giam dan theo fyc, top1 khop max dem doc lap tu sheet Agent.
const byFyc = rankAgents(team, 'fyc')
for (let i = 1; i < byFyc.length; i++) {
  assert.ok(byFyc[i - 1].fyc >= byFyc[i].fyc, `rankAgents('fyc') phai giam dan theo fyc (lech o vi tri ${i})`)
}
const maxFycRaw = Math.max(...agentsArr.map((a) => Number(a.fyc) || 0))
assert.strictEqual(byFyc[0].fyc, maxFycRaw, "rankAgents('fyc') top1 phai = FYC thang lon nhat dem doc lap tu data.agents")
console.log(`rankAgents('fyc') 25.10: giam dan dung · top1 ${byFyc[0].agName} fyc=${byFyc[0].fyc} (khop max doc lap ${maxFycRaw})`)
// File 8.11 (thang 11): rankAgents('fyc') — hang 1 PHAM THI MY TRANG
// fyc = 44,86tr (doi chieu thang max FYC cua sheet Agent tho). Day la
// con so dong "FYC thang: 44,9 tr" se hien tren hang Bang Vang khi Lan
// chon sap theo FYC thang (DoiNgu hien dong nay co dieu kien sortKey).
const byFyc811 = rankAgents(team811, 'fyc')
for (let i = 1; i < byFyc811.length; i++) {
  assert.ok(byFyc811[i - 1].fyc >= byFyc811[i].fyc, `rankAgents('fyc') 8.11 phai giam dan theo fyc (lech o vi tri ${i})`)
}
const maxFyc811 = Math.max(...Object.values(parsed811.agents).map((a) => Number(a.fyc) || 0))
assert.strictEqual(byFyc811[0].fyc, maxFyc811, "rankAgents('fyc') 8.11 top1 phai = FYC thang lon nhat dem doc lap tu data.agents")
assert.strictEqual(byFyc811[0].agName, 'PHẠM THỊ MỸ TRANG', "rankAgents('fyc') 8.11: hang 1 phai la PHẠM THỊ MỸ TRANG")
assert.strictEqual(Math.round(byFyc811[0].fyc * 100) / 100, 44.86, "rankAgents('fyc') 8.11: FYC thang hang 1 phai = 44,86 tr")
console.log(`rankAgents('fyc') 8.11: giam dan dung · top1 ${byFyc811[0].agName} fyc=${byFyc811[0].fyc} (≈44,86 tr, khop max doc lap ${maxFyc811})`)
// Moc CANH BAO FYC thang toi thieu (Lan chot 09/11/2026): FYC_FLOOR = 5tr.
// Dem tren DUNG danh sach Bang Vang cua DoiNgu (dieu kien "co so lieu
// thang": bar.total > 0 || fyp > 0) o file 8.11: 29 TVV tren bang, 18
// nguoi duoi moc (fyc < 5) — cac so nay khoa cung theo file that hien tai.
assert.strictEqual(FYC_FLOOR, 5, 'FYC_FLOOR phai = 5 (trieu dong FYC thang)')
const listed811 = byFyc811.filter((a) => a.bar.total > 0 || a.fyp > 0)
const lack811 = listed811.filter((a) => a.fyc < FYC_FLOOR)
assert.strictEqual(listed811.length, 29, 'Bang Vang 8.11: phai co 29 TVV co so lieu thang (bar.total>0 hoac fyp>0)')
assert.strictEqual(lack811.length, 18, 'Bang Vang 8.11: phai co 18 TVV fyc < 5tr (duoi moc canh bao FYC)')
for (const a of lack811) {
  const gap = FYC_FLOOR - a.fyc
  assert.ok(gap > 0 && gap <= FYC_FLOOR, `${a.agName}: so thieu = FYC_FLOOR - fyc phai trong (0, 5]`)
}
assert.strictEqual(listed811.filter((a) => a.fyc === 0).length, 7, 'Bang Vang 8.11: 7 TVV fyc = 0 (thieu du 5tr)')
// 3 vi du dau nhom thieu (byFyc811 da sap giam dan theo fyc):
const exQuan = lack811.find((a) => a.agName === 'NGUYỄN HOÀNG QUÂN')
const exTram = lack811.find((a) => a.agName === 'TRẦN THỊ ĐOAN TRÂM')
const exDuy = lack811.find((a) => a.agName === 'ĐÀO THANH DUY')
assert.ok(exQuan && Math.abs(exQuan.fyc - 4.9135) < 0.001 && Math.abs((FYC_FLOOR - exQuan.fyc) - 0.09) < 0.01, 'Vi du thieu: NGUYỄN HOÀNG QUÂN fyc≈4,91 -> thieu≈0,09tr')
assert.ok(exTram && Math.abs(exTram.fyc - 4.74588) < 0.001 && Math.abs((FYC_FLOOR - exTram.fyc) - 0.25) < 0.01, 'Vi du thieu: TRẦN THỊ ĐOAN TRÂM fyc≈4,75 -> thieu≈0,25tr')
assert.ok(exDuy && Math.abs(exDuy.fyc - 4.24662) < 0.001 && Math.abs((FYC_FLOOR - exDuy.fyc) - 0.75) < 0.01, 'Vi du thieu: ĐÀO THANH DUY fyc≈4,25 -> thieu≈0,75tr')
console.log(`Moc FYC_FLOOR=5 (8.11): ${lack811.length}/${listed811.length} TVV tren Bang Vang duoi moc · vi du: QUÂN fyc=${exQuan.fyc} thieu=${Math.round((FYC_FLOOR - exQuan.fyc) * 100) / 100} · TRÂM fyc=${exTram.fyc} thieu=${Math.round((FYC_FLOOR - exTram.fyc) * 100) / 100} · DUY fyc=${exDuy.fyc} thieu=${Math.round((FYC_FLOOR - exDuy.fyc) * 100) / 100}`)
// Doi soat moc 15tr IP tren Unit TUQ file 8.11: 4 TVV, 1 Active, 3 Chua
// Active — ca 3 co ipNet = 0 (doi chieu thang sheet Agent tho) nen so
// thieu theo cong thuc ACTIVE_IP_TARGET - ipNet deu = 15tr.
const tuq811 = team811.units.find((u) => u.unit === 'TUQ')
assert.ok(tuq811, 'File 8.11 phai co Unit TUQ')
assert.strictEqual(tuq811.agentCount, 4, 'TUQ (8.11): phai co 4 TVV')
assert.strictEqual(tuq811.leaderName, 'HOÀNG VĂN HƯNG', 'TUQ (8.11): leaderName phai la HOÀNG VĂN HƯNG (nhan loc phong "TUQ - HOÀNG VĂN HƯNG")')
const tuqInact = tuq811.agents.filter((a) => !a.isAct)
assert.strictEqual(tuqInact.length, 3, 'TUQ (8.11): nhom Chua Active phai co 3 TVV')
for (const a of tuqInact) {
  const rawIp = Number(parsed811.agents[a.msdl].ipNet) || 0
  assert.strictEqual(a.ipNet, rawIp, `TUQ (8.11) ${a.msdl}: ipNet agentView phai khop sheet Agent tho`)
  const gap = ACTIVE_IP_TARGET - a.ipNet
  assert.strictEqual(gap, 15, `TUQ (8.11) ${a.msdl}: thieu = 15 - ipNet(${a.ipNet}) phai = 15`)
  console.log(`  TUQ Chua Active: ${a.agName} (${a.msdl}) ipNet=${a.ipNet} · thieu = 15 - ${a.ipNet} = ${gap} tr`)
}
const tuqAct = tuq811.agents.filter((a) => a.isAct)
assert.strictEqual(tuqAct.length, 1, 'TUQ (8.11): nhom Dang Active phai co 1 TVV')
console.log(`TUQ (8.11): ${tuq811.agentCount} TVV · Active ${tuqAct.length} · Chua Active ${tuqInact.length} (ca 3 ipNet=0 -> thieu 15tr/nguoi)`)

console.log('Top Unit theo luot Act:', [...team.units].sort((x, y) => y.actCount - x.actCount).slice(0, 3).map((u) => `${u.unit}:${u.actCount}/${MOC_TARGET}`).join(' · '))
console.log(`TVV chua co ho so (nop=0): ${flat.filter((a) => a.nop === 0).length}`)
console.log('\n✅ TAT CA ASSERT DAT')
