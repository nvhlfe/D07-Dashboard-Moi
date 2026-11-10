// Test lib/pe.js (PHAN HANG PE TAM TINH — 10/11/2026) tren 2 file Daily
// THAT cua QUY 4/2026: 25.10 = thang 10, 8.11 = thang 11.
//  - activeMonthsInQuarter: doi chieu DOC LAP bang cach doc thang sheet
//    Agent THO (XLSX sheet_to_json, khong qua parseDaily): thang hoat
//    dong = FYC thang >= 5tr.
//  - peStatus: ca bien gia lap (du ca 2 dieu kien / thieu FYC / thieu
//    thang / da Kim Cuong) + phan bo hang TAM TINH toan GA tinh den
//    thang 11 khop tinh doc lap tu sheet tho.
//  - nearRankList: danh sach + thu tu khop tinh doc lap.
// Chay: node scripts/test-pe.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import {
  PE_TIERS, PE_ACTIVE_FYC, segToTier, projectedTier, peStatus,
  quarterMonths, activeMonthsInQuarter, quarterActivity, nearRankList,
} from '../src/lib/pe.js'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const R1 = (x) => Math.round(x * 10) / 10
const H = process.env.HOME

function loadSnap(path, dateId) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
  return { id: dateId, data: parseWorkbook(wb) }
}
const snapT10 = loadSnap(H + '/workspace/user/files/Daily_Sales_25.10.xlsx', '2026-10-25')
const snapT11 = loadSnap(H + '/workspace/user/files/Daily_Sales_8.11.xlsx', '2026-11-08')
const quarterSnaps = [snapT10, snapT11]

// ── Doc lap: doc thang sheet Agent THO ──
function rawAgents(path) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Agent'], { defval: null })
  const map = new Map()
  for (const r of rows) {
    const ym = Number(r['YearMonth'])
    if (!r['AGCode'] || !(ym > 200000 && ym < 300000)) continue
    map.set(String(r['AGCode']), {
      msdl: String(r['AGCode']),
      agName: r['AGName'] || '',
      unit: r['UnitCode'] || '',
      agSeg: r['AGSegName'] || '',
      fyc: num(r['FYC']),
      fycL12m: num(r['FYC L12M']),
    })
  }
  return map
}
const rawOct = rawAgents(H + '/workspace/user/files/Daily_Sales_25.10.xlsx')
const rawNov = rawAgents(H + '/workspace/user/files/Daily_Sales_8.11.xlsx')
const indepMonths = (msdl) =>
  ((rawOct.get(msdl)?.fyc ?? 0) >= PE_ACTIVE_FYC ? 1 : 0)
  + ((rawNov.get(msdl)?.fyc ?? 0) >= PE_ACTIVE_FYC ? 1 : 0)
const TIERS_DESC = [
  { id: 'diamond', l12m: 180, months: 3 },
  { id: 'platinum', l12m: 90, months: 3 },
  { id: 'gold', l12m: 50, months: 2 },
]
const indepProjected = (l12m, months) => {
  for (const t of TIERS_DESC) if (l12m >= t.l12m && months >= t.months) return t.id
  return null
}

// ── segToTier + quarterMonths ──
{
  assert.strictEqual(segToTier('Diamond'), 'diamond')
  assert.strictEqual(segToTier('platinum'), 'platinum')
  assert.strictEqual(segToTier('GOLD'), 'gold')
  assert.strictEqual(segToTier(''), null)
  assert.strictEqual(segToTier(null), null)
  assert.strictEqual(segToTier('Silver'), null)
  assert.deepStrictEqual(quarterMonths(2026, 11).map((q) => q.ym), ['2026-10', '2026-11', '2026-12'], 'quy 4/2026')
  assert.deepStrictEqual(quarterMonths(2026, 1).map((q) => q.ym), ['2026-01', '2026-02', '2026-03'], 'quy 1/2026')
  assert.deepStrictEqual(quarterMonths(2026, 5).map((q) => q.month), [4, 5, 6], 'quy 2/2026')
  console.log('=== segToTier + quarterMonths: dung ===')
}

// ── peStatus: ca bien gia lap ──
{
  let st = peStatus({ agSeg: 'Diamond', fycL12m: 185 }, 3)
  assert.strictEqual(st.projected, 'diamond', 'du 185tr + 3 thang -> Kim Cuong tam tinh')
  assert.strictEqual(st.next, null, 'da Kim Cuong tam tinh -> khong con hang ke tiep')
  assert.strictEqual(st.current, 'diamond')

  st = peStatus({ agSeg: 'Diamond', fycL12m: 185 }, 2)
  assert.strictEqual(st.projected, 'gold', 'du FYC nhung moi 2 thang -> tam tinh Vang')
  assert.strictEqual(st.next.tierId, 'platinum')
  assert.strictEqual(st.next.lackL12m, 0, 'da du FYC cho Bach Kim')
  assert.strictEqual(st.next.lackMonths, 1, 'thieu dung 1 thang hoat dong len Bach Kim')

  st = peStatus({ agSeg: '', fycL12m: 95 }, 3)
  assert.strictEqual(st.projected, 'platinum')
  assert.strictEqual(st.next.tierId, 'diamond')
  assert.strictEqual(st.next.lackL12m, 85)
  assert.strictEqual(st.next.lackMonths, 0)

  st = peStatus({ agSeg: '', fycL12m: 45 }, 3)
  assert.strictEqual(st.projected, null, '45tr < 50 -> chua co hang tam tinh')
  assert.strictEqual(st.next.tierId, 'gold')
  assert.strictEqual(st.next.lackL12m, 5)

  st = peStatus({ agSeg: 'Gold', fycL12m: 60 }, 1)
  assert.strictEqual(st.projected, null, 'du FYC Vang nhung moi 1 thang hoat dong -> chua tam tinh')
  assert.strictEqual(st.next.tierId, 'gold')
  assert.strictEqual(st.next.lackL12m, 0)
  assert.strictEqual(st.next.lackMonths, 1)
  assert.strictEqual(st.current, 'gold')
  console.log('=== peStatus ca bien: du dieu kien / thieu FYC / thieu thang / hang cao nhat — dung ===')
}

// ── activeMonthsInQuarter tren file that, doi chieu doc lap ──
{
  const agentsNov = Object.values(snapT11.data.agents)
  assert.ok(agentsNov.length >= 240, `file 8.11 phai co ~244 TVV, thuc te ${agentsNov.length}`)
  for (const a of agentsNov) {
    const got = activeMonthsInQuarter(quarterSnaps, a.msdl)
    const want = indepMonths(String(a.msdl))
    assert.strictEqual(got, want, `activeMonths ${a.msdl}: lib=${got}, doc lap=${want}`)
  }
  // Ca cu the: TRANG (60556971) FYC T10 107,4 + T11 44,9 -> 2 thang.
  assert.strictEqual(activeMonthsInQuarter(quarterSnaps, '60556971'), 2, 'Trang: 2 thang hoat dong')
  // NGUYEN HOANG QUAN (60797524): T10 23,3 (hoat dong) + T11 4,9 (chua) -> 1 thang.
  assert.strictEqual(activeMonthsInQuarter(quarterSnaps, '60797524'), 1, 'Quan: 1 thang hoat dong')
  // Lay ban MOI NHAT cua thang: snap gia lap 2 ban cung thang 11.
  const fake = [
    { id: '2026-11-01', data: { agents: { X1: { msdl: 'X1', fyc: 9 } } } },
    { id: '2026-11-20', data: { agents: { X1: { msdl: 'X1', fyc: 2 } } } },
  ]
  assert.strictEqual(activeMonthsInQuarter(fake, 'X1'), 0, 'cung thang: ban moi nhat (FYC 2) quyet dinh')
  const qa = quarterActivity(quarterSnaps, '60556971')
  assert.strictEqual(qa.monthsWithData, 2, 'quy 4 tinh den T11: 2 thang co du lieu')
  assert.strictEqual(qa.active, 2)
  console.log(`=== activeMonthsInQuarter: khop doc lap tren ${agentsNov.length} TVV + ca rieng + ban moi nhat/thang ===`)
}

// ── Phan bo hang TAM TINH toan GA (quy 4 tinh den thang 11) ──
{
  const distLib = { diamond: 0, platinum: 0, gold: 0, none: 0 }
  const distIndep = { diamond: 0, platinum: 0, gold: 0, none: 0 }
  for (const a of Object.values(snapT11.data.agents)) {
    const st = peStatus(a, activeMonthsInQuarter(quarterSnaps, a.msdl))
    distLib[st.projected || 'none']++
  }
  for (const a of rawNov.values()) {
    distIndep[indepProjected(a.fycL12m, indepMonths(a.msdl)) || 'none']++
  }
  assert.deepStrictEqual(distLib, distIndep, `phan bo tam tinh lib=${JSON.stringify(distLib)} doc lap=${JSON.stringify(distIndep)}`)
  // Neo cung tu du lieu that: quy moi qua 2/3 thang (T12 chua co) nen
  // chua ai du 3 thang hoat dong -> Kim Cuong/Bach Kim tam tinh = 0.
  assert.strictEqual(distLib.diamond, 0, 'chua co du lieu T12 -> chua ai tam tinh Kim Cuong')
  assert.strictEqual(distLib.platinum, 0, 'chua co du lieu T12 -> chua ai tam tinh Bach Kim')
  console.log(`=== phan bo hang tam tinh Q4 den T11: ${JSON.stringify(distLib)} — khop doc lap ===`)
}

// ── nearRankList: khop doc lap (tap + thu tu) ──
{
  const expected = []
  for (const a of rawNov.values()) {
    const months = indepMonths(a.msdl)
    const proj = indepProjected(a.fycL12m, months)
    const next = !proj ? TIERS_DESC[2] : proj === 'gold' ? TIERS_DESC[1] : proj === 'platinum' ? TIERS_DESC[0] : null
    if (!next) continue
    const lackL = Math.max(0, R1(next.l12m - a.fycL12m))
    const lackM = Math.max(0, next.months - months)
    if ((lackL > 0 && lackL <= 20) || (lackL === 0 && lackM === 1)) {
      expected.push({ msdl: a.msdl, agName: a.agName, nextId: next.id, lackL, lackM })
    }
  }
  expected.sort((x, y) => (x.lackL - y.lackL) || (x.lackM - y.lackM) || String(x.agName).localeCompare(String(y.agName), 'vi'))
  const got = nearRankList(Object.values(snapT11.data.agents), quarterSnaps)
  assert.strictEqual(got.length, expected.length, `nearRankList: lib=${got.length}, doc lap=${expected.length}`)
  for (let i = 0; i < expected.length; i++) {
    assert.strictEqual(got[i].msdl, expected[i].msdl, `nearRankList[${i}]: lib=${got[i].msdl}, doc lap=${expected[i].msdl}`)
    assert.strictEqual(got[i].next.tierId, expected[i].nextId)
    assert.ok(Math.abs(got[i].next.lackL12m - expected[i].lackL) < 1e-9)
    assert.strictEqual(got[i].next.lackMonths, expected[i].lackM)
  }
  for (let i = 1; i < got.length; i++) {
    assert.ok(got[i - 1].next.lackL12m <= got[i].next.lackL12m, 'nearRankList: lackL12m tang dan')
  }
  console.log(`=== nearRankList: ${got.length} nguoi sap len hang — khop doc lap (tap + thu tu) ===`)
}

console.log('\nTEST PE: TAT CA DAT')
