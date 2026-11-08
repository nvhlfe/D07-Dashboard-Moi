// Test lib/cases.js bang file Daily Sales THAT 25.10 (node):
//  - buildCases: tong ho so duy nhat, dem theo trang thai goc
//  - journalForDay('2026-10-25'): so nop hom do phai = 4 (khop heatmap da kiem chung)
//  - pending: phai hoa giai voi PS ~ 50 cua analyzeSoSanLuong
//  - Co che MOI (Lan chot chieu 08/11 — bo chinh tay, cap nhat bang file moi):
//    caseKey khoa theo PolicyNumber cho IF/PS; policyNum bo sung tu sheet
//    Pending khi Proposal thieu; diffCases doi chieu 2 ban (kich ban tong hop
//    tu du lieu that: bo 5 dong proposal + doi 1 ho so IF -> PS).
// Chay: node scripts/test-cases.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { analyzeSoSanLuong } from '../src/lib/analyze.js'
import { buildCases, caseKey, diffCases, groupValue, journalForDay, summarizeCases } from '../src/lib/cases.js'

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
const cases = buildCases(snapshot)
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

// ── Co che moi: khong con lop dieu chinh — effective* luon = base* ──
assert.ok(cases.every((c) => c.effectiveStatus === c.baseStatus && c.effectiveIpNet === c.ipNet
  && c.adjusted === false && c.adjustmentStale === false && c.adjustment === null && c.adjNote === ''),
  'Khong dieu chinh tay: effectiveStatus/effectiveIpNet phai = base, adjusted phai = false')

// ── caseKey: IF/PS co PolicyNumber -> khoa 'PN:'; con lai 'HS:' ──
const ifWithPolicy = cases.find((c) => c.baseStatus === 'IF' && c.policyNum)
const psWithPolicy = cases.find((c) => c.baseStatus === 'PS' && c.policyNum)
const pipeCase = cases.find((c) => c.baseStatus === 'PIPELINE')
console.log(`\ncaseKey: IF co Policy -> ${ifWithPolicy ? caseKey(ifWithPolicy).slice(0, 12) + '…' : '(khong co)'} · PS co Policy -> ${psWithPolicy ? caseKey(psWithPolicy).slice(0, 12) + '…' : '(khong co)'} · PIPELINE -> ${pipeCase ? caseKey(pipeCase).slice(0, 12) + '…' : '(khong co)'}`)
assert.ok(ifWithPolicy, 'Phai co ho so IF co PolicyNum trong file that')
assert.ok(caseKey(ifWithPolicy).startsWith('PN:'), 'Ho so IF co PolicyNum: caseKey phai bat dau PN:')
if (psWithPolicy) assert.ok(caseKey(psWithPolicy).startsWith('PN:'), 'Ho so PS co PolicyNum: caseKey phai bat dau PN:')
if (pipeCase) assert.ok(caseKey(pipeCase).startsWith('HS:'), 'Ho so PIPELINE: caseKey phai theo HSYC (HS:)')
assert.strictEqual(caseKey({ baseStatus: 'OTHER', policyNum: 'POL123', proposalNum: 'HSYC9' }), 'HS:HSYC9', 'OTHER du co PolicyNum van khoa theo HSYC')

// ── policyNum bo sung tu sheet Pending khi dong Proposal thieu ──
const pendByNum = new Map(parsed.pendingRows.filter((r) => r.policyNum).map((r) => [String(r.proposalNum), r.policyNum]))
const filledFromPending = cases.filter((c) => {
  const prow = parsed.proposalRows.find((p) => String(p.proposalNum) === c.proposalNum)
  return pendByNum.has(c.proposalNum) && (!prow || !prow.policyNum) && c.policyNum === pendByNum.get(c.proposalNum)
})
console.log(`Ho so duoc bo sung PolicyNum tu sheet Pending: ${filledFromPending.length}`)
for (const c of filledFromPending) {
  assert.strictEqual(c.policyNum, pendByNum.get(c.proposalNum), 'PolicyNum bo sung phai khop sheet Pending')
}

// ── diffCases: kich ban tong hop tu du lieu that ──
// prev = snapshot 25.10 nhung LOAI 5 dong Proposal (cua 5 ho so duy nhat, giu
// lai dong trung neu co) + DOI 1 ho so IF (co dong duy nhat) sang PS.
// next = snapshot goc. Ky vong: added = 5 ho so bi loai; ho so doi trang thai
// IF -> PS o prev, o next la IF => becameIssued = 1 (chinh ho so do); con lai
// giu nguyen; removed/becamePending/statusChanged = 0.
const firstRowNums = []
const seenNums = new Set()
for (const p of parsed.proposalRows) {
  const k = String(p.proposalNum)
  if (!seenNums.has(k)) { seenNums.add(k); firstRowNums.push(k) }
}
// Chi chon ho so CHI co o sheet Proposal (khong co o Pending/Pipeline) —
// loai dong Proposal cua ho so con xuat hien o 2 sheet kia thi case van con
// trong prev (build tu sheet con lai) nen diff se khong dem la "added".
const otherSheetNums = new Set([
  ...parsed.pendingRows.map((r) => String(r.proposalNum)),
  ...parsed.pipelineRows.map((r) => String(r.proposalNum)),
])
const removedNums = firstRowNums.filter((n) => !otherSheetNums.has(n)).slice(0, 5)
assert.strictEqual(removedNums.length, 5, 'Phai tim du 5 ho so chi co o Proposal de loai trong kich ban diff')
const flipNum = firstRowNums.find((n) => !removedNums.includes(n)
  && parsed.proposalRows.filter((p) => String(p.proposalNum) === n).length === 1
  && cases.find((c) => c.proposalNum === n)?.baseStatus === 'IF')
assert.ok(flipNum, 'Phai tim duoc 1 ho so IF dong duy nhat de doi trang thai trong kich ban diff')
const prevData = {
  ...snapshot.data,
  proposalRows: parsed.proposalRows
    .filter((p) => !removedNums.includes(String(p.proposalNum)))
    .map((p) => (String(p.proposalNum) === flipNum ? { ...p, status: 'PS', statusGroup: 'PS' } : p)),
}
const prevCases = buildCases({ id: '2026-10-24', data: prevData })
const diff = diffCases(prevCases, cases)
console.log(`\ndiffCases kich ban: added=${diff.added.length} · removed=${diff.removed.length} · becameIssued=${diff.becameIssued.length} · becamePending=${diff.becamePending.length} · statusChanged=${diff.statusChanged.length} · unchanged=${diff.unchanged}`)
console.log(`  added (HSYC): ${diff.added.map((c) => c.proposalNum).sort().join(', ')} · becameIssued: ${diff.becameIssued.map((c) => c.proposalNum).join(', ')}`)
assert.deepStrictEqual(diff.added.map((c) => c.proposalNum).sort(), [...removedNums].sort(), 'added phai = dung 5 ho so bi loai khoi prev')
assert.strictEqual(diff.removed.length, 0, 'Kich ban nay khong co ho so bien mat (removed = 0)')
assert.strictEqual(diff.becameIssued.length, 1, 'Chi 1 ho so chuyen PS(prev) -> IF(next)')
assert.strictEqual(diff.becameIssued[0].proposalNum, flipNum, 'Ho so becameIssued phai la ho so da doi trang thai')
assert.strictEqual(diff.becamePending.length, 0, 'Khong co ho so nao chuyen sang PS o ban moi')
assert.strictEqual(diff.statusChanged.length, 0, 'Khong co doi trang thai khac')
assert.strictEqual(diff.unchanged, prevCases.length - 1, 'Con lai giu nguyen = tong prev tru ho so doi trang thai')

// ── apeSub/apeNet tren case + groupValue (dot Bang Vang / thanh xep chong, 08/11) ──
// Case phai mang apeSub/apeNet cua dong Proposal dau tien theo HSYC; tong
// theo case (chi case inProposal) phai khop tong theo DONG DUY NHAT.
const seenApe = new Set()
let apeSubUnique = 0
let apeNetUnique = 0
for (const p of parsed.proposalRows) {
  const k = String(p.proposalNum)
  if (seenApe.has(k)) continue
  seenApe.add(k)
  apeSubUnique += Number(p.apeSub) || 0
  apeNetUnique += Number(p.apeNet) || 0
}
const caseApeSub = cases.filter((c) => c.inProposal).reduce((s, c) => s + c.apeSub, 0)
const caseApeNet = cases.filter((c) => c.inProposal).reduce((s, c) => s + c.apeNet, 0)
console.log(`\napeSub: tong case inProposal = ${r1(caseApeSub)} tr · tong dong Proposal duy nhat = ${r1(apeSubUnique)} tr · apeNet duy nhat = ${r1(apeNetUnique)} tr`)
assert.ok(Math.abs(caseApeSub - apeSubUnique) < 1e-6, 'Tong apeSub cua case inProposal phai = tong apeSub dong Proposal duy nhat')
assert.ok(Math.abs(caseApeNet - apeNetUnique) < 1e-6, 'Tong apeNet cua case inProposal phai = tong apeNet dong Proposal duy nhat')
assert.ok(cases.filter((c) => !c.inProposal).every((c) => c.apeSub === 0 && c.apeNet === 0), 'Case khong co dong Proposal: apeSub/apeNet phai = 0')

// groupValue: tong nhom IF toan GA phai = tong IP Net duy nhat 1.577,6 tr.
const gvIssued = cases.filter((c) => c.effectiveStatus === 'IF').reduce((s, c) => s + groupValue(c), 0)
const gvPending = cases.filter((c) => c.effectiveStatus === 'PS').reduce((s, c) => s + groupValue(c), 0)
const gvPipeline = cases.filter((c) => c.effectiveStatus === 'PIPELINE').reduce((s, c) => s + groupValue(c), 0)
console.log(`groupValue toan GA: phat hanh = ${r1(gvIssued)} tr · pending = ${r1(gvPending)} tr · chua len phi = ${r1(gvPipeline)} tr · tong thanh = ${r1(gvIssued + gvPending + gvPipeline)} tr`)
assert.ok(Math.abs(gvIssued - 1577.6) <= 0.1, `Tong groupValue nhom IF phai = 1.577,6 tr (thuc te ${r1(gvIssued)})`)
assert.ok(cases.filter((c) => c.effectiveStatus === 'OTHER').every((c) => groupValue(c) === 0), 'groupValue cua OTHER phai = 0')

console.log('\n✅ TAT CA ASSERT DAT')
