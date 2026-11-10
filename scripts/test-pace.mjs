// Test lib/pace.js (NHIP DO VE DICH o Trang Chu — 10/11/2026):
//  - snaps GIA LAP: 3 snapshot cung thang -> pacePoints sap theo ngay,
//    fyp = tong agents.fyp cua tung snapshot (cong thuc doc lap trong test).
//  - paceNeededAt: duong thang tu (0,0) toi (cuoi thang, target).
//  - paceStatus: ahead/behind/null dung dinh nghia.
//  - File THAT: 8.11 (snapshot 2026-11-08) -> 1 diem ngay 8, FYP 768,3;
//    25.10 (snapshot 2026-10-25) -> 1 diem ngay 25, FYP 1.761,6
//    (so neo da kiem chung o test-homekpi).
// Chay: node scripts/test-pace.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { pacePoints, paceNeededAt, paceStatus, snapshotFyp } from '../src/lib/pace.js'

const R1 = (x) => Math.round(x * 10) / 10

// ── Snaps gia lap ──
const mkSnap = (id, fyps) => ({
  id,
  data: {
    agents: Object.fromEntries(fyps.map((f, i) => [`M${i}`, { msdl: `M${i}`, fyp: f }])),
  },
})
{
  const snaps = [
    mkSnap('2026-11-20', [300, 200]), // fyp 500
    mkSnap('2026-11-05', [100]), // fyp 100
    mkSnap('2026-10-31', [999]), // thang khac — phai bi loc ra
    mkSnap('2026-11-12', [150, 100]), // fyp 250
  ]
  const pts = pacePoints(snaps, 2026, 11)
  assert.strictEqual(pts.length, 3, 'pacePoints: chi lay snapshot cua thang dang xem')
  assert.deepStrictEqual(pts.map((p) => p.day), [5, 12, 20], 'pacePoints: sap xep theo ngay tang dan')
  assert.deepStrictEqual(pts.map((p) => p.fyp), [100, 250, 500], 'pacePoints: fyp = tong agents.fyp cua snapshot')
  assert.strictEqual(pts[0].dateId, '2026-11-05', 'pacePoints: giu dateId cua snapshot')
  console.log('=== pacePoints gia lap: loc dung thang, sap ngay, cong FYP dung ===')
}

// ── paceNeededAt ──
{
  assert.strictEqual(paceNeededAt(3000, 0, 30), 0, 'paceNeededAt: ngay 0 -> 0')
  assert.strictEqual(paceNeededAt(3000, 15, 30), 1500, 'paceNeededAt: giua thang -> nua muc tieu')
  assert.strictEqual(paceNeededAt(3000, 30, 30), 3000, 'paceNeededAt: cuoi thang -> tron muc tieu')
  assert.strictEqual(paceNeededAt(3000, 45, 30), 3000, 'paceNeededAt: vuot ngay cuoi thang thi kep ve muc tieu')
  assert.strictEqual(paceNeededAt(null, 15, 30), null, 'paceNeededAt: chua dat muc tieu -> null')
  assert.strictEqual(paceNeededAt(0, 15, 30), null, 'paceNeededAt: muc tieu 0 -> null')
  console.log('=== paceNeededAt: duong thang (0,0) -> (cuoi thang, target); thieu target -> null ===')
}

// ── paceStatus ──
{
  const ahead = [{ day: 15, dateId: '2026-11-15', fyp: 1600 }]
  const behind = [{ day: 15, dateId: '2026-11-15', fyp: 1400 }]
  assert.strictEqual(paceStatus(ahead, 3000, 30), 'ahead', 'paceStatus: FYP >= nhip can -> ahead')
  assert.strictEqual(paceStatus(behind, 3000, 30), 'behind', 'paceStatus: FYP < nhip can -> behind')
  assert.strictEqual(paceStatus([], 3000, 30), null, 'paceStatus: chua co diem -> null')
  assert.strictEqual(paceStatus(ahead, null, 30), null, 'paceStatus: chua dat muc tieu -> null')
  console.log('=== paceStatus: ahead/behind/null dung dinh nghia ===')
}

// ── File that: moi file 1 snapshot cua thang ──
function loadSnap(path, dateId) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
  return { id: dateId, data: parseWorkbook(wb) }
}
{
  const s811 = loadSnap(process.env.HOME + '/workspace/user/files/Daily_Sales_8.11.xlsx', '2026-11-08')
  const pts = pacePoints([s811], 2026, 11)
  assert.strictEqual(pts.length, 1, '8.11: thang 11 chi co 1 snapshot -> 1 diem')
  assert.strictEqual(pts[0].day, 8, '8.11: diem o ngay 8')
  assert.strictEqual(R1(pts[0].fyp), 768.3, `8.11: FYP diem = 768,3 (thuc te ${R1(pts[0].fyp)})`)
  assert.strictEqual(R1(snapshotFyp(s811.data)), 768.3, '8.11: snapshotFyp khop 768,3')

  const s2510 = loadSnap(process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx', '2026-10-25')
  const pts10 = pacePoints([s2510], 2026, 10)
  assert.strictEqual(pts10.length, 1, '25.10: thang 10 chi co 1 snapshot -> 1 diem')
  assert.strictEqual(pts10[0].day, 25, '25.10: diem o ngay 25')
  assert.strictEqual(R1(pts10[0].fyp), 1761.6, `25.10: FYP diem = 1.761,6 (thuc te ${R1(pts10[0].fyp)})`)
  // 2 snapshot 2 thang khac nhau: loc theo thang khong lan
  const both = pacePoints([s811, s2510], 2026, 11)
  assert.strictEqual(both.length, 1, 'loc thang: snaps co ca T10+T11 thi T11 chi lay 1 diem')
  console.log('=== File that: 8.11 -> diem ngay 8 FYP 768,3 · 25.10 -> diem ngay 25 FYP 1.761,6 ===')
}

console.log('\n✅ TAT CA ASSERT DAT (test-pace)')
