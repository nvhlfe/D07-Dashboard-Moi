// Test parse bang file Daily Sales THAT (node): chay LOI parseWorkbook tren workbook
// doc bang SheetJS, in so lieu + KPI So San Luong cho file 25.10.
// Chay: node scripts/test-parse.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook, dedupeProposalRows } from '../src/lib/parseDaily.js'
import { analyzeSoSanLuong } from '../src/lib/analyze.js'
import { buildCases, groupValue } from '../src/lib/cases.js'

function loadAndParse(path) {
  const buf = readFileSync(path)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false })
  return parseWorkbook(wb)
}

function summarize(label, path, snapDate) {
  const p = loadAndParse(path)
  const agents = Object.values(p.agents)
  const fypTotal = agents.reduce((s, a) => s + (a.fyp || 0), 0)
  console.log(`\n=== ${label} (${path}) ===`)
  console.log('Sheets:', JSON.stringify(p.sheetStatus))
  console.log(`TVV (agents): ${agents.length}`)
  console.log(`Units: ${Object.keys(p.units).length}`)
  console.log(`Proposal rows: ${p.proposalRows.length}`)
  console.log(`Pending rows: ${p.pendingRows.length}`)
  console.log(`Pipeline rows: ${p.pipelineRows.length}`)
  console.log(`Tong FYP (agents): ${Math.round(fypTotal * 10) / 10} tr`)
  // APE Sub/Net tren Proposal + PolicyNum tren Pending/Pipeline (dot chieu 08/11)
  const apeSubTotal = p.proposalRows.reduce((s, r) => s + (Number(r.apeSub) || 0), 0)
  const pendWithPolicy = p.pendingRows.filter((r) => r.policyNum).length
  const pipeWithPolicy = p.pipelineRows.filter((r) => r.policyNum).length
  console.log(`Tong APE Sub (Proposal): ${Math.round(apeSubTotal * 10) / 10} tr · Pending co PolicyNum: ${pendWithPolicy}/${p.pendingRows.length} · Pipeline co PolicyNum: ${pipeWithPolicy}/${p.pipelineRows.length}`)
  assert.ok(p.proposalRows.every((r) => typeof r.apeSub === 'number' && typeof r.apeNet === 'number'), 'proposalRows phai co apeSub/apeNet la so')
  assert.ok(p.pendingRows.every((r) => typeof r.policyNum === 'string') && p.pipelineRows.every((r) => typeof r.policyNum === 'string'), 'pendingRows/pipelineRows phai co truong policyNum (string)')
  // Chi so tham khao TVV (dot Bang Vang theo mau D03, 08/11): FYC QTD / FYC L12M
  // la so; TLDTPTT so % truc tiep hoac null khi o trong (KHONG ep 0).
  assert.ok(agents.every((a) => typeof a.fycQtd === 'number' && Number.isFinite(a.fycQtd)), 'agent phai co fycQtd la so')
  assert.ok(agents.every((a) => typeof a.fycL12m === 'number' && Number.isFinite(a.fycL12m)), 'agent phai co fycL12m la so')
  assert.ok(agents.every((a) => a.tldtptt === null || (typeof a.tldtptt === 'number' && Number.isFinite(a.tldtptt))), 'tldtptt phai la so huu han hoac null')
  const tldtCount = agents.filter((a) => a.tldtptt !== null).length
  console.log(`TLDTPTT: ${tldtCount}/${agents.length} TVV co gia tri (con lai null -> hien “—”)`)
  if (label.includes('25.10')) {
    assert.strictEqual(tldtCount, 106, 'File 25.10: so TVV co TLDTPTT phai = 106 (dem doc lap tu file tho)')
  }
  if (label.includes('25.10')) {
    assert.ok(apeSubTotal > 0, 'Tong APE Sub file 25.10 phai > 0')
    assert.ok(pendWithPolicy > 0, 'Pending file 25.10 phai co dong co PolicyNum')
    // LUU Y du lieu that 25.10: sheet Pipeline CO cot PolicyNum nhung TRONG
    // toan bo (29/29 dong tho) — ho so chua len phi chua co so Policy.
    // Chi assert truong ton tai, khong assert > 0 cho Pipeline o file nay.
    assert.strictEqual(pipeWithPolicy, 0, 'Pipeline file 25.10: cot PolicyNum ton tai nhung chua co gia tri (khop du lieu tho)')
  }
  if (snapDate) {
    const [y, m] = snapDate.split('-').map(Number)
    const doc = { id: snapDate, data: { agents: p.agents, units: p.units, proposalRows: p.proposalRows, pendingRows: p.pendingRows, pipelineRows: p.pipelineRows } }
    const r = analyzeSoSanLuong([doc], [], { year: y, month: m })
    const t = r.totals
    console.log(`-- KPI So San Luong thang ${m}/${y} (snapshot ${snapDate}, khong co thang truoc de tru CF) --`)
    console.log(`Nop: ${t.nopN} HS · ${(Math.round((t.subIp + t.pipeApe) * 10) / 10)} tr (da len phi ${t.subN} HS/${Math.round(t.subIp * 10) / 10} tr + chua len phi ${t.pipeN} HS/${Math.round(t.pipeApe * 10) / 10} tr)`)
    console.log(`Phat hanh gop: ${t.issN} HD · ${Math.round(t.issIp * 10) / 10} tr | Rong: ${t.netN} HD · ${Math.round(t.netIp * 10) / 10} tr`)
    console.log(`Pending: ${t.pendN} HS · ${Math.round(t.pendIp * 10) / 10} tr`)
    console.log(`IF: ${t.ifN} · PS: ${t.psN} · Khac: ${t.otherN}`)
    console.log(`Ty le phat hanh: ${t.rate === null ? '—' : Math.round(t.rate * 100) + '%'}`)
    console.log('Top phat hanh rong:', r.topNet.map((a) => `${a.name} (${a.unit}) ${Math.round(a.netIp * 10) / 10}tr`).join(' | ') || '(khong co)')
    const heat = {}
    p.proposalRows.forEach((r2) => { if (r2.proposalDate) heat[r2.proposalDate] = (heat[r2.proposalDate] || 0) + 1 })
    console.log('Nop theo ngay (proposalDate):', Object.entries(heat).sort().map(([d, c]) => `${d}:${c}`).join(' '))
  }
  return p
}

summarize('Daily 25.10', process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx', '2026-10-25')
summarize('Daily 11.10', process.env.HOME + '/workspace/user/files/Daily_Sales_11.10.xlsx', null)

// ── leaderUnits + activeFycUnit (dot chinh muc Phong 09/11/2026) ──
// leaderUnits = UnitCode co trong sheet Leader (muc Phong chi liet ke
// cac Unit nay). activeFycUnit = cot '#Active Agent (FYC) Unit' cua Unit:
// co so -> so; o trong -> null (UI hien "–", khong ep 0).
// So doi soat dem DOC LAP bang openpyxl tu file tho:
//   8.11: 20 Unit Leader · 6 Unit co so · tong = 7
//   25.10: 21 Unit Leader · 10 Unit co so · tong = 15 · Unit 9CJ = 1
function checkLeaderActive(label, path, expUnits, expWithNum, expTotal, exp9CJ) {
  const p = loadAndParse(path)
  assert.ok(Array.isArray(p.leaderUnits), `${label}: parse phai tra leaderUnits (mang UnitCode sheet Leader)`)
  assert.strictEqual(p.leaderUnits.length, expUnits, `${label}: so Unit trong sheet Leader phai = ${expUnits}`)
  assert.strictEqual(new Set(p.leaderUnits).size, p.leaderUnits.length, `${label}: leaderUnits khong duoc trung UnitCode`)
  let withNum = 0; let total = 0
  for (const code of p.leaderUnits) {
    const u = p.units[code]
    assert.ok(u, `${label}: Unit ${code} trong leaderUnits phai co mat trong units`)
    assert.ok(u.activeFycUnit === null || (typeof u.activeFycUnit === 'number' && Number.isFinite(u.activeFycUnit)), `${label}: Unit ${code} activeFycUnit phai la so hoac null`)
    if (u.activeFycUnit !== null) { withNum++; total += u.activeFycUnit }
  }
  assert.strictEqual(withNum, expWithNum, `${label}: so Unit co so o cot Active FYC Unit phai = ${expWithNum}`)
  assert.strictEqual(total, expTotal, `${label}: tong cot Active FYC Unit phai = ${expTotal}`)
  if (exp9CJ !== undefined) assert.strictEqual(p.units['9CJ'].activeFycUnit, exp9CJ, `${label}: Unit 9CJ activeFycUnit phai = ${exp9CJ}`)
  // Unit chi co o sheet Agent (khong trong Leader) -> activeFycUnit null
  for (const [code, u] of Object.entries(p.units)) {
    if (!p.leaderUnits.includes(code)) assert.strictEqual(u.activeFycUnit, null, `${label}: Unit ${code} khong co trong Leader -> activeFycUnit phai null`)
  }
  console.log(`\n=== ${label}: leaderUnits = ${p.leaderUnits.length} · Unit co so Active FYC = ${withNum} · tong = ${total} ===`)
}
checkLeaderActive('Daily 8.11', process.env.HOME + '/workspace/user/files/Daily_Sales_8.11.xlsx', 20, 6, 7, undefined)
checkLeaderActive('Daily 25.10', process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx', 21, 10, 15, 1)
console.log('\n✅ leaderUnits + activeFycUnit khop doi soat doc lap ca 2 file')

// ── Khu trung dong Proposal khi parse (Lan chot 10/11/2026) ──
// Phan tich file tho: cac dong trung la CUNG MOT HO SO (moi truong cua ho so
// giong het: Policy/trang thai/san pham/ngay/IP/APE) chi khac TVV duoc ghi
// nhan (unit/msdl/agName). parse khu theo dau van ho so, giu dong dau tien:
//   25.10: 182 dong tho -> 161 dong (loai 21) · 8.11: 58 -> 52 (loai 6)
// Sau khu trung, so dem theo DONG cua Trang Chu (analyze) PHAI KHOP so dem
// theo HO SO duy nhat cua Sales Report (buildCases + groupValue) — moc duy
// nhat doi soat doc lap: 25.10 PH 1577.6tr · Pend 835.5tr · Pipe 264tr,
// 183 ho so (IF 101 / PS 43 / PIPELINE 22 / OTHER 17).
const R1 = (x) => Math.round(x * 10) / 10
function checkDedup(label, path, snapDate, expRows, expIss, expPend, expIfN, expPsN) {
  const p = loadAndParse(path)
  assert.strictEqual(p.proposalRows.length, expRows, `${label}: proposalRows sau khu trung phai = ${expRows}`)
  const [y, m] = snapDate.split('-').map(Number)
  const snap = { id: snapDate, data: p }
  const t = analyzeSoSanLuong([snap], [], { year: y, month: m }).totals
  assert.strictEqual(R1(t.issIp), expIss, `${label}: analyze phat hanh gop sau khu trung phai = ${expIss}tr`)
  assert.strictEqual(R1(t.netIp), expIss, `${label}: analyze phat hanh rong (khong thang truoc) phai = ${expIss}tr`)
  assert.strictEqual(R1(t.pendIp), expPend, `${label}: analyze pending sau khu trung phai = ${expPend}tr`)
  assert.strictEqual(t.pendN, expPsN, `${label}: analyze pendN phai = ${expPsN}`)
  assert.strictEqual(t.ifN, expIfN, `${label}: analyze ifN phai = ${expIfN}`)
  assert.strictEqual(t.psN, expPsN, `${label}: analyze psN phai = ${expPsN}`)
  // Idempotent: khu trung lai tren ket qua da khu -> khong loai them dong nao
  assert.strictEqual(dedupeProposalRows(p.proposalRows).length, expRows, `${label}: dedupeProposalRows phai idempotent`)
  console.log(`\n=== ${label}: proposalRows = ${p.proposalRows.length} · analyze PH = ${R1(t.issIp)}tr · Pend = ${R1(t.pendIp)}tr · IF ${t.ifN} / PS ${t.psN} ===`)
  return p
}
const p25dd = checkDedup('Daily 25.10', process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx', '2026-10-25', 161, 1577.6, 835.5, 101, 43)
checkDedup('Daily 8.11', process.env.HOME + '/workspace/user/files/Daily_Sales_8.11.xlsx', '2026-11-08', 52, 671.8, 375.6, 33, 19)
// Moc duy nhat phia Sales Report (buildCases) giu nguyen sau khu trung o parse
{
  const cases = buildCases({ id: '2026-10-25', data: p25dd })
  const cnt = { IF: 0, PS: 0, PIPELINE: 0, OTHER: 0 }
  const val = { IF: 0, PS: 0, PIPELINE: 0, OTHER: 0 }
  for (const c of cases) { cnt[c.effectiveStatus]++; val[c.effectiveStatus] += groupValue(c) }
  assert.strictEqual(cases.length, 183, '25.10: buildCases tong ho so duy nhat phai = 183')
  assert.deepStrictEqual(cnt, { IF: 101, PS: 43, PIPELINE: 22, OTHER: 17 }, '25.10: dem ho so theo trang thai phai = IF 101 / PS 43 / PIPELINE 22 / OTHER 17')
  assert.strictEqual(R1(val.IF), 1577.6, '25.10: groupValue IF phai = 1577.6tr')
  assert.strictEqual(R1(val.PS), 835.5, '25.10: groupValue PS phai = 835.5tr')
  assert.strictEqual(R1(val.PIPELINE), 264, '25.10: groupValue PIPELINE phai = 264tr')
  console.log('=== 25.10 buildCases: 183 HS (IF 101/PS 43/PIPE 22/OTHER 17) · 1577.6 / 835.5 / 264 tr — KHOP moc duy nhat ===')
}
// Don vi: dau van ho so bo qua dinh danh TVV nhung giu dong khac so lieu
{
  const base = { proposalNum: 'HS1', policyNum: 'P1', status: 'IF', statusGroup: 'IF', statusFull: 'IF - Issued', product: 'X', proposalDate: '2026-10-02', firstIssuedDate: '2026-10-15', caseSub: 1, ipSub: 10, ipNet: 10, apeSub: 10, apeNet: 10, unit: 'AAA', msdl: '111', agName: 'A' }
  const sameCaseOtherAgent = { ...base, unit: 'BBB', msdl: '222', agName: 'B' }
  const diffMoney = { ...base, ipNet: 99 }
  const out = dedupeProposalRows([base, sameCaseOtherAgent, diffMoney])
  assert.strictEqual(out.length, 2, 'dedupe: dong trung ho so khac TVV bi loai, dong khac so lieu duoc giu')
  assert.strictEqual(out[0], base, 'dedupe: giu dong DAU TIEN cua nhom trung')
  console.log('=== dedupeProposalRows (don vi): trung khac TVV -> loai · khac so lieu -> giu · giu dong dau ===')
}
console.log('\n✅ Khu trung Proposal: Trang Chu va Sales Report khop nhau tren ca 2 file that')
