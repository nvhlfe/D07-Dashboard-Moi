// Test lib/journey.js bang 2 file Daily Sales THAT (node):
//  - dailyStacks tren snapshot 25.10: tong 3 nhom phai khop tong groupValue
//    da kiem chung o test-cases (phat hanh 1.577,6 · pending 835,5 ·
//    chua len phi 264 tr); ngay 25/10 phai co cot.
//  - monthJourney([11.10, 25.10], 2026): thang 10 chon snapshot MOI NHAT
//    (25.10): ipIssued = 1.577,6 tr, contracts = 101; 11 thang con lai null;
//    dao thu tu mang input -> ket qua khong doi.
// Chay: node scripts/test-journey.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { buildCases } from '../src/lib/cases.js'
import { dailyStacks, monthJourney } from '../src/lib/journey.js'

const loadSnap = (file, id, savedAt) => {
  const wb = XLSX.read(readFileSync(process.env.HOME + '/workspace/user/files/' + file), { type: 'buffer', cellDates: false })
  const parsed = parseWorkbook(wb)
  return {
    id,
    savedAt,
    data: {
      proposalRows: parsed.proposalRows,
      pendingRows: parsed.pendingRows,
      pipelineRows: parsed.pipelineRows,
      agents: parsed.agents,
      units: parsed.units,
    },
  }
}

const snap25 = loadSnap('Daily_Sales_25.10.xlsx', '2026-10-25', '2026-10-25T20:00:00.000Z')
const snap11 = loadSnap('Daily_Sales_11.10.xlsx', '2026-10-11', '2026-10-11T20:00:00.000Z')

const r1 = (x) => Math.round(x * 10) / 10
const near = (a, b, tol = 0.1) => Math.abs(a - b) <= tol

// ── dailyStacks: snapshot 25.10, thang 2026-10 ──
console.log('=== dailyStacks — Daily_Sales_25.10.xlsx ===')
const cases25 = buildCases(snap25)
const stacks = dailyStacks(cases25, '2026-10')
const sum = { issued: 0, pending: 0, pipeline: 0, total: 0 }
Object.values(stacks).forEach((e) => {
  sum.issued += e.issued; sum.pending += e.pending; sum.pipeline += e.pipeline; sum.total += e.total
})
console.log(`Tong ca thang: phat hanh = ${r1(sum.issued)} tr · pending = ${r1(sum.pending)} tr · chua len phi = ${r1(sum.pipeline)} tr · tong = ${r1(sum.total)} tr · so ngay co cot: ${Object.keys(stacks).length}`)
assert.ok(near(sum.issued, 1577.6), `Tong issued phai = 1.577,6 tr (thuc te ${r1(sum.issued)})`)
assert.ok(near(sum.pending, 835.5), `Tong pending phai = 835,5 tr (thuc te ${r1(sum.pending)})`)
assert.ok(near(sum.pipeline, 264), `Tong pipeline phai = 264 tr (thuc te ${r1(sum.pipeline)})`)

const day25 = stacks['2026-10-25']
console.log(`Ngay 2026-10-25: phat hanh = ${r1(day25?.issued ?? 0)} tr · pending = ${r1(day25?.pending ?? 0)} tr · chua len phi = ${r1(day25?.pipeline ?? 0)} tr · tong = ${r1(day25?.total ?? 0)} tr`)
assert.ok(day25 && day25.total > 0, 'Ngay 2026-10-25 phai co cot (total > 0)')

// Prefix thang khac -> rong (khong lan ho so sang thang khac)
assert.deepStrictEqual(dailyStacks(cases25, '2026-11'), {}, 'dailyStacks voi prefix thang khac phai rong')

// ── monthJourney: 2 snapshot cung thang 10/2026 -> chon ban 25.10 ──
console.log('\n=== monthJourney — [11.10, 25.10], nam 2026 ===')
const journey = monthJourney([snap11, snap25], 2026)
assert.strictEqual(journey.year, 2026)
assert.strictEqual(journey.months.length, 12, 'Phai co du 12 phan tu thang')
const oct = journey.months[9]
console.log(`Thang 10: ipIssued = ${r1(oct.ipIssued)} tr · contracts = ${oct.contracts} · dataDate = ${oct.dataDate}`)
assert.strictEqual(oct.month, 10)
assert.ok(near(oct.ipIssued, 1577.6), `IP phat hanh T10 phai = 1.577,6 tr (thuc te ${r1(oct.ipIssued)})`)
assert.strictEqual(oct.contracts, 101, 'So hop dong phat hanh T10 phai = 101 (so case IF duy nhat)')
assert.strictEqual(oct.dataDate, '2026-10-25', 'Thang 10 phai lay snapshot moi nhat 25.10, khong phai 11.10')
for (const m of journey.months) {
  if (m.month === 10) continue
  assert.strictEqual(m.ipIssued, null, `Thang ${m.month} khong co snapshot -> ipIssued null`)
  assert.strictEqual(m.contracts, null, `Thang ${m.month} khong co snapshot -> contracts null`)
  assert.strictEqual(m.dataDate, null, `Thang ${m.month} khong co snapshot -> dataDate null`)
}
console.log('11 thang con lai: ipIssued/contracts/dataDate deu null — dung')

// Dao thu tu input -> khong doi (chon theo dataDate/savedAt, khong theo vi tri mang)
const journeyRev = monthJourney([snap25, snap11], 2026)
assert.deepStrictEqual(journeyRev.months, journey.months, 'Dao thu tu snaps: monthJourney phai cho ket qua giong het')

// Nam khac -> toan null
const journey2025 = monthJourney([snap11, snap25], 2025)
assert.ok(journey2025.months.every((m) => m.ipIssued === null), 'Nam 2025 khong co snapshot 2025 -> tat ca null')

console.log('\n✅ TAT CA ASSERT DAT (test-journey)')
