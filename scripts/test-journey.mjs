// Test lib/journey.js + lib/gaHistory.js:
//  - dailyStacks tren snapshot 25.10 THAT: tong 3 nhom phai khop tong
//    groupValue da kiem chung o test-cases (phat hanh 1.577,6 · pending
//    835,5 · chua len phi 264 tr); ngay 25/10 phai co cot.
//  - gaHistory: dung 10 thang (T1-T10/2026), so neo khop bang Lan gui
//    09/11/2026, KHONG co thang 11.
//  - buildYearJourney: thang co so GA -> 'ga' (uu tien hon ca snapshot Daily
//    cua thang do); thang 11/2026 co snapshot gia lap -> fyp = tong agent.fyp,
//    act = so agent caseNet > 0, source 'daily', chon snapshot MOI NHAT;
//    thang 12 khong du lieu -> null; nam 2025 -> toan null.
//  - HomNay.jsx khong con khoi "Thay doi so voi ngay".
// Chay: node scripts/test-journey.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { buildCases } from '../src/lib/cases.js'
import { dailyStacks, buildYearJourney } from '../src/lib/journey.js'
import { GA_HISTORY } from '../src/lib/gaHistory.js'

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

// ── gaHistory: bang so GA Lan gui 09/11/2026 ──
console.log('\n=== gaHistory — so GA 2026 ===')
const ga2026 = GA_HISTORY[2026] || {}
assert.deepStrictEqual(Object.keys(ga2026).map(Number).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'GA_HISTORY[2026] phai co dung 10 thang T1-T10')
assert.deepStrictEqual(ga2026[1], { fyp: 2596, act: 41 }, 'T1: fyp 2596, act 41')
assert.deepStrictEqual(ga2026[6], { fyp: 4898.6, act: 47 }, 'T6: fyp 4898.6, act 47')
assert.deepStrictEqual(ga2026[9], { fyp: 3676.5, act: 52 }, 'T9: fyp 3676.5, act 52')
assert.deepStrictEqual(ga2026[10], { fyp: 3364.7, act: 42 }, 'T10: fyp 3364.7, act 42')
assert.ok(!(11 in ga2026) && !(12 in ga2026), 'GA_HISTORY[2026] KHONG duoc co thang 11/12 (tu T11 lay theo Daily)')
console.log('Dung 10 thang T1-T10; neo T1 2596/41 · T6 4898.6/47 · T9 3676.5/52 · T10 3364.7/42 — khop')

// ── buildYearJourney voi file that: T1-T10 'ga', T11/T12 null ──
console.log('\n=== buildYearJourney — [11.10, 25.10], nam 2026 ===')
const journey = buildYearJourney([snap11, snap25], 2026)
assert.strictEqual(journey.year, 2026)
assert.strictEqual(journey.months.length, 12, 'Phai co du 12 phan tu thang')
for (let m = 1; m <= 10; m++) {
  const e = journey.months[m - 1]
  assert.strictEqual(e.month, m)
  assert.strictEqual(e.source, 'ga', `Thang ${m} phai lay so GA`)
  assert.strictEqual(e.fyp, ga2026[m].fyp, `Thang ${m}: fyp phai = so GA ${ga2026[m].fyp}`)
  assert.strictEqual(e.act, ga2026[m].act, `Thang ${m}: act phai = so GA ${ga2026[m].act}`)
}
// Thang 10 CO snapshot Daily that (25.10) nhung van phai la 'ga' (uu tien so GA)
console.log(`Thang 10: fyp = ${journey.months[9].fyp} · act = ${journey.months[9].act} · source = ${journey.months[9].source} (co snapshot Daily nhung van theo GA — dung)`)
assert.deepStrictEqual(journey.months[10], { month: 11, fyp: null, act: null, source: null }, 'Thang 11 chua co snapshot thang 11 -> null')
assert.deepStrictEqual(journey.months[11], { month: 12, fyp: null, act: null, source: null }, 'Thang 12 khong du lieu -> null')
console.log('Thang 11/12: null — dung')

// Dao thu tu input -> khong doi
const journeyRev = buildYearJourney([snap25, snap11], 2026)
assert.deepStrictEqual(journeyRev.months, journey.months, 'Dao thu tu snaps: buildYearJourney phai cho ket qua giong het')

// Nam khac khong co so GA lan snapshot -> toan null
const journey2025 = buildYearJourney([snap11, snap25], 2025)
assert.ok(journey2025.months.every((m) => m.fyp === null && m.act === null && m.source === null), 'Nam 2025: tat ca thang null')

// ── buildYearJourney: thang 11/2026 tu Daily (snapshot gia lap) ──
console.log('\n=== buildYearJourney — thang 11/2026 theo Daily (gia lap) ===')
const snapNovOld = {
  id: '2026-11-05', savedAt: '2026-11-05T09:00:00.000Z',
  data: { agents: { X: { fyp: 999, caseNet: 5 } } },
}
const snapNov = {
  id: '2026-11-20', savedAt: '2026-11-20T10:00:00.000Z',
  data: {
    agents: {
      A: { fyp: 100.5, caseNet: 2 },
      B: { fyp: 200, caseNet: 0 },
      C: { fyp: 50.25, caseNet: 1 },
      D: { fyp: 0 },
    },
  },
}
const jNov = buildYearJourney([snapNovOld, snapNov], 2026)
const nov = jNov.months[10]
console.log(`Thang 11: fyp = ${nov.fyp} tr · act = ${nov.act} · source = ${nov.source}`)
assert.strictEqual(nov.source, 'daily', 'Thang 11 phai lay theo Daily')
assert.ok(near(nov.fyp, 350.75, 0.01), `FYP T11 phai = tong agent.fyp = 350,75 (thuc te ${nov.fyp}) — phai chon snapshot 20/11, khong phai 05/11`)
assert.strictEqual(nov.act, 2, 'ACT T11 phai = 2 (agent A va C co caseNet > 0)')
assert.deepStrictEqual(jNov.months[11], { month: 12, fyp: null, act: null, source: null }, 'Thang 12 khong du lieu -> null')

// Thang 3 co CA so GA lan snapshot Daily -> van 'ga'
const snapMar = {
  id: '2026-03-15', savedAt: '2026-03-15T10:00:00.000Z',
  data: { agents: { X: { fyp: 777, caseNet: 9 } } },
}
const jMar = buildYearJourney([snapMar], 2026)
assert.deepStrictEqual(jMar.months[2], { month: 3, fyp: 3147.7, act: 48, source: 'ga' }, 'Thang 3 co ca GA lan Daily -> van lay so GA 3147.7/48')
console.log('Thang 3: GA thang Daily (3147.7/48, source ga) — dung')

// ── HomNay: da go khoi "Thay doi so voi ngay" ──
console.log('\n=== HomNay — bo khoi thay doi ===')
const homNaySrc = readFileSync(new URL('../src/components/HomNay.jsx', import.meta.url), 'utf8')
assert.ok(!homNaySrc.includes('Thay đổi so với ngày'), 'HomNay.jsx khong duoc con khoi "Thay doi so voi ngay"')
assert.ok(homNaySrc.includes('buildYearJourney'), 'HomNay.jsx phai dung buildYearJourney cho Hanh trinh nam')
console.log('HomNay: khong con "Thay doi so voi ngay"; dung buildYearJourney — dung')

// ── YearJourneyChart: GIU duong Active (dinh chinh cua Lan 09/11), chi
//    chuyen SO LIEU xuong duoi thang — tren duong KHONG co nhan so ──
console.log('\n=== YearJourneyChart — duong Active + so duoi thang ===')
const chartsSrc = readFileSync(new URL('../src/components/Charts.jsx', import.meta.url), 'utf8')
assert.ok(chartsSrc.includes('<polyline'), 'Charts.jsx: duong Active (polyline) phai duoc KHOI PHUC')
assert.ok(chartsSrc.includes('actMax') && chartsSrc.includes('lineY'), 'Charts.jsx: duong Active phai dung thang rieng actMax + ham lineY')
assert.ok(chartsSrc.includes('actSegs'), 'Charts.jsx: duong Active phai dut doan o thang trong (actSegs — khong noi qua thang khong co du lieu)')
assert.ok(!/y=\{lineY\(m\.act\)\s*-/.test(chartsSrc), 'Charts.jsx: KHONG duoc ve nhan so tai diem cua duong Active (so chi nam o hang duoi thang)')
assert.ok(chartsSrc.includes('C_ACT'), 'Charts.jsx: duong + so Active dung hang mau cam dam C_ACT')
assert.ok(chartsSrc.includes('baseY + 40'), 'Charts.jsx: hang so Active phai nam DUOI nhan thang (baseY + 40)')
assert.ok(homNaySrc.includes('Đường cam + số dưới tháng: TVV Active'), 'HomNay: chu thich Hanh trinh phai noi ro duong cam + so duoi thang la TVV Active')
assert.ok(homNaySrc.includes('Số Active dưới tháng'), 'HomNay: legend phai co mau so "Số Active dưới tháng"')
assert.ok(homNaySrc.includes('TVV Active (đường cam)'), 'HomNay: legend phai co mau duong cam TVV Active')
assert.ok(homNaySrc.includes('T1–T10: số liệu GA · Từ T11: theo Daily Sales'), 'HomNay: dong NGUON so lieu GA/Daily phai duoc GIU LAI')
assert.ok(!homNaySrc.includes('Giá trị hồ sơ theo ngày nộp, tô theo trạng thái hiện tại'), 'HomNay: da bo dong ghi chu giai thich cach tinh o bieu do nhip nop')
console.log('YearJourneyChart: duong Active da khoi phuc (thang rieng, dut doan, khong nhan tren diem); so Active o hang duoi thang; chu thich + dong nguon dung')

console.log('\n✅ TAT CA ASSERT DAT (test-journey)')
