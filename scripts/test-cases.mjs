// Test lib/cases.js bang file Daily Sales THAT 25.10 (node):
//  - buildCases: tong ho so duy nhat, dem theo trang thai goc
//  - journalForDay('2026-10-25'): so nop hom do phai = 4 (khop heatmap da kiem chung)
//  - pending: phai hoa giai voi PS ~ 50 cua analyzeSoSanLuong
//  - vong dieu chinh: PS -> IF (doi IP) thay doi trang thai hieu luc + tong;
//    roi mo phong snapshot goc bat kip gia tri da chinh -> adjustmentStale = true,
//    ghi de dung lai (gia tri hieu luc = gia tri goc).
// Chay: node scripts/test-cases.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { analyzeSoSanLuong } from '../src/lib/analyze.js'
import { buildCases, journalForDay, summarizeCases } from '../src/lib/cases.js'

const path = process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx'
const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
const parsed = parseWorkbook(wb)
const SNAP_ID = '2026-10-25'
const snapshot = {
  id: SNAP_ID,
  data: {
    proposalRows: parsed.proposalRows,
    pendingRows: parsed.pendingRows,
    pipelineRows: parsed.pipelineRows,
    agents: parsed.agents,
    units: parsed.units,
  },
}

console.log('=== buildCases — Daily_Sales_25.10.xlsx, snapshot', SNAP_ID, '===')
const cases = buildCases(snapshot, {})
console.log(`Tong ho so duy nhat (proposal ∪ pending ∪ pipeline): ${cases.length}`)
const byBase = { IF: 0, PS: 0, PIPELINE: 0, OTHER: 0 }
cases.forEach((c) => { byBase[c.baseStatus] = (byBase[c.baseStatus] || 0) + 1 })
console.log('Theo trang thai GOC:', JSON.stringify(byBase))

const summary = summarizeCases(cases)
console.log('summarizeCases byStatus (hieu luc, chua dieu chinh):',
  Object.entries(summary.byStatus).map(([k, v]) => `${k}: ${v.n} HS / ${Math.round(v.ipNet * 10) / 10} tr IP Net`).join(' · '))
console.log(`Pending (hieu luc): ${summary.pending.length} ho so`)

// Hoa giai voi analyze: analyze dem theo DONG Proposal (PS=50 dong), cases.js dem
// theo HO SO duy nhat. File that co 21 so HSYC trung 2 dong y het (PS trung 7 dong)
// -> PS duy nhat = 50 - 7 = 43. Kiem tra dung cong thuc hoa giai nay.
const analysis = analyzeSoSanLuong([snapshot], [], { year: 2026, month: 10 })
const rowCountByGroup = { IF: 0, PS: 0, OTHER: 0 }
parsed.proposalRows.forEach((p) => { rowCountByGroup[p.statusGroup] += 1 })
const dupRows = {
  IF: rowCountByGroup.IF - byBase.IF,
  PS: rowCountByGroup.PS - byBase.PS,
  OTHER: rowCountByGroup.OTHER - byBase.OTHER,
}
console.log(`analyze (theo dong): PS=${analysis.totals.psN} · pendN=${analysis.totals.pendN} · pipeN=${analysis.totals.pipeN}`)
console.log(`Dong Proposal trung lap theo nhom: ${JSON.stringify(dupRows)} (tong ${dupRows.IF + dupRows.PS + dupRows.OTHER} dong)`)
assert.strictEqual(rowCountByGroup.PS, analysis.totals.psN)
assert.strictEqual(byBase.PS + dupRows.PS, analysis.totals.psN, 'PS duy nhat + dong PS trung = psN cua analyze')
assert.strictEqual(summary.pending.length, byBase.PS, 'Pending hieu luc (chua dieu chinh) = so ho so PS duy nhat')

// ── Hoa giai IP Sub cua PS (gia tri the ho so PS hien thi) ──
// The PS hien ipSub, KHONG phai ipNet (ipNet cua PS = 0 se gay hieu nham "0 tr").
// Tong ipSub theo HO SO duy nhat phai > 0. Hoa giai voi so theo DONG:
// duy nhat + dong trung = tong theo dong. (Tham chieu: analyze bao pending
// 947.1tr / 50 dong PS — co so tinh rieng cua analyze, khong phai tong ipSub.)
const r1 = (x) => Math.round(x * 10) / 10
const psCasesUnique = cases.filter((c) => c.baseStatus === 'PS')
const psIpSubUnique = psCasesUnique.reduce((s, c) => s + (Number(c.ipSub) || 0), 0)
const seenPs = new Set()
let psDupIpSub = 0
for (const p of parsed.proposalRows) {
  if (p.statusGroup !== 'PS') continue
  const k = String(p.proposalNum)
  if (seenPs.has(k)) psDupIpSub += Number(p.ipSub) || 0
  else seenPs.add(k)
}
const psIpSubRows = parsed.proposalRows
  .filter((p) => p.statusGroup === 'PS')
  .reduce((s, p) => s + (Number(p.ipSub) || 0), 0)
console.log(`IP Sub PS: duy nhat ${psCasesUnique.length} HS = ${r1(psIpSubUnique)} tr · dong trung ${dupRows.PS} dong = ${r1(psDupIpSub)} tr · tong theo dong ${rowCountByGroup.PS} dong = ${r1(psIpSubRows)} tr · (tham chieu analyze: pendIp ${r1(analysis.totals.pendIp)} tr / pendN ${analysis.totals.pendN} dong)`)
assert.ok(psIpSubUnique > 0, 'Tong ipSub cua cac ho so PS duy nhat phai > 0 (the PS hien so nay, khong phai 0 tr)')
assert.ok(Math.abs(psIpSubUnique + psDupIpSub - psIpSubRows) < 1e-6, 'Hoa giai ipSub PS: duy nhat + dong trung phai = tong theo dong')

// ── Nhat ky ngay 25/10: heatmap da kiem chung ghi 4 ho so nop ──
const journal = journalForDay(cases, SNAP_ID)
console.log(`\njournalForDay('${SNAP_ID}'): nop(Proposal)=${journal.submitted.length} · nop chua len phi (Pipeline)=${journal.submittedPipeline.length} · phat hanh hom do=${journal.issued.length} · nop hom do dang pending=${journal.submittedPending.length}`)
console.log('  Ho so nop 25/10:', journal.submitted.map((c) => `${c.proposalNum.slice(-2)} (${c.agName})`).join(', '))
assert.strictEqual(journal.submitted.length, 4, 'So ho so nop (Proposal) ngay 2026-10-25 phai = 4 (khop heatmap da kiem chung)')
assert.strictEqual(journal.submittedPipeline.length, 4, 'Ngay 25/10 co them 4 ho so Pipeline nop moi (tach rieng khoi so Nop cua heatmap)')

// ── Vong 1: dieu chinh 1 ho so PS -> IF, IP moi ──
const target = cases.find((c) => c.baseStatus === 'PS')
assert.ok(target, 'Phai co it nhat 1 ho so PS de test dieu chinh')
const NEW_IP = 999
const before = summarizeCases(cases)
const adjMap = { [target.proposalNum]: { status: 'IF', ipNet: NEW_IP, note: 'Test: bo sung ho so kham', updatedAt: '2026-10-25T10:00:00.000Z', updatedBy: 'Test' } }
const casesAdj = buildCases(snapshot, adjMap)
const adjCase = casesAdj.find((c) => c.proposalNum === target.proposalNum)
const after = summarizeCases(casesAdj)
console.log(`\nDieu chinh ho so ••••${target.proposalNum.slice(-2)} (${target.agName}): PS -> IF, IP Net ${target.ipNet} -> ${NEW_IP}`)
console.log(`  effectiveStatus=${adjCase.effectiveStatus} · effectiveIpNet=${adjCase.effectiveIpNet} · adjusted=${adjCase.adjusted} · stale=${adjCase.adjustmentStale}`)
console.log(`  Tong: PS ${before.byStatus.PS.n} -> ${after.byStatus.PS.n} · IF ${before.byStatus.IF.n} -> ${after.byStatus.IF.n} · IP Net IF ${Math.round(before.byStatus.IF.ipNet)} -> ${Math.round(after.byStatus.IF.ipNet)} tr`)
assert.strictEqual(adjCase.effectiveStatus, 'IF')
assert.strictEqual(adjCase.effectiveIpNet, NEW_IP)
assert.strictEqual(adjCase.adjusted, true)
assert.strictEqual(adjCase.adjustmentStale, false)
assert.strictEqual(after.byStatus.PS.n, before.byStatus.PS.n - 1)
assert.strictEqual(after.byStatus.IF.n, before.byStatus.IF.n + 1)
assert.ok(Math.abs(after.byStatus.IF.ipNet - (before.byStatus.IF.ipNet + NEW_IP)) < 1e-9, 'Tong IP Net IF phai tang dung bang IP moi cua ho so da chinh')

// ── Vong 2: snapshot goc bat kip (Proposal da la IF voi IP = gia tri da chinh) -> stale ──
const caughtUpData = {
  ...snapshot.data,
  proposalRows: snapshot.data.proposalRows.map((p) =>
    p.proposalNum === target.proposalNum ? { ...p, status: 'IF', statusGroup: 'IF', ipNet: NEW_IP } : p),
}
const casesStale = buildCases({ id: SNAP_ID, data: caughtUpData }, adjMap)
const staleCase = casesStale.find((c) => c.proposalNum === target.proposalNum)
console.log(`\nMo phong he thong bat kip: baseStatus=${staleCase.baseStatus} · baseIpNet=${staleCase.ipNet} -> stale=${staleCase.adjustmentStale} · effectiveStatus=${staleCase.effectiveStatus} · effectiveIpNet=${staleCase.effectiveIpNet}`)
assert.strictEqual(staleCase.adjustmentStale, true, 'Dieu chinh phai thanh stale khi snapshot goc khop gia tri da chinh')
assert.strictEqual(staleCase.effectiveStatus, staleCase.baseStatus, 'Khi stale, trang thai hieu luc phai lay tu goc (khong ghi de)')
assert.strictEqual(staleCase.effectiveIpNet, staleCase.ipNet, 'Khi stale, IP hieu luc phai lay tu goc')

console.log('\n✅ TAT CA ASSERT DAT')
