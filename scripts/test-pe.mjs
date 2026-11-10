// Test lib/pe.js (PHAN HANG PE) tren 2 file Daily THAT cua QUY
// 4/2026: 25.10 = thang 10, 8.11 = thang 11.
//  - MO HINH DICH (Lan LAM RO 10/11/2026): hang DICH xac dinh thuan
//    theo FYC L12M (>= 180 Kim Cuong / >= 90 Bach Kim / >= 50 Vang;
//    chua dat Vang thi dich van la Vang) — KHONG ha dich khi thieu
//    thang. So thang hoat dong trong quy la DIEU KIEN DONG HANH cua
//    dich (Kim Cuong/Bach Kim can 3 thang, Vang can 2; thang hoat
//    dong = FYC thang >= 5tr). qualified = du ca FYC lan thang.
//  - Test doi chieu DOC LAP tu sheet Agent THO (XLSX sheet_to_json,
//    khong qua lib): fycTier/target/qualified tung TVV, phan bo
//    fycTier toan GA, ca Trang, nearRankList (tap + thu tu).
//  - activeMonthsInQuarter / quarterActivity van doi chieu doc lap.
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
// Mo hinh dich DOC LAP (khong dung lib): dich theo FYC + dieu kien thang.
const TIERS_MODEL = [
  { id: 'diamond', l12m: 180, months: 3 },
  { id: 'platinum', l12m: 90, months: 3 },
  { id: 'gold', l12m: 50, months: 2 },
]
const indepStatus = (l12m, months) => {
  let fycTier = null
  for (const t of TIERS_MODEL) if (l12m >= t.l12m) { fycTier = t; break }
  const target = fycTier || TIERS_MODEL[2]
  const lackL12m = Math.max(0, R1(target.l12m - l12m))
  const lackMonths = Math.max(0, target.months - months)
  return {
    fycTier: fycTier ? fycTier.id : null,
    targetId: target.id,
    lackL12m,
    lackMonths,
    qualified: lackL12m === 0 && lackMonths === 0,
  }
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
  assert.deepStrictEqual(PE_TIERS.map((t) => [t.id, t.l12m, t.months]), [['diamond', 180, 3], ['platinum', 90, 3], ['gold', 50, 2]], 'nguong PE_TIERS (FYC + thang dong hanh)')
  assert.strictEqual(projectedTier(180), 'diamond')
  assert.strictEqual(projectedTier(179.9), 'platinum')
  assert.strictEqual(projectedTier(90), 'platinum')
  assert.strictEqual(projectedTier(50), 'gold')
  assert.strictEqual(projectedTier(49.9), null)
  console.log('=== segToTier + quarterMonths + nguong PE_TIERS: dung ===')
}

// ── peStatus: ca bien gia lap theo MO HINH DICH ──
{
  // Du FYC Kim Cuong + du 3 thang -> qualified Kim Cuong.
  let st = peStatus({ agSeg: 'Diamond', fycL12m: 185 }, 3)
  assert.strictEqual(st.fycTier, 'diamond')
  assert.strictEqual(st.target.tierId, 'diamond')
  assert.strictEqual(st.projected, 'diamond')
  assert.strictEqual(st.target.lackL12m, 0)
  assert.strictEqual(st.target.lackMonths, 0)
  assert.strictEqual(st.qualified, true)
  assert.strictEqual(st.current, 'diamond')

  // CA LOI CU phai het: du FYC Kim Cuong nhung moi 2 thang -> dich
  // VAN la Kim Cuong (KHONG ha xuong), chi thieu 1 thang dong hanh.
  st = peStatus({ agSeg: '', fycL12m: 185 }, 2)
  assert.strictEqual(st.fycTier, 'diamond', '185tr -> fycTier Kim Cuong')
  assert.strictEqual(st.target.tierId, 'diamond', 'dich giu Kim Cuong, khong ha hang')
  assert.strictEqual(st.projected, 'diamond')
  assert.strictEqual(st.target.lackL12m, 0)
  assert.strictEqual(st.target.lackMonths, 1)
  assert.strictEqual(st.target.needMonths, 3)
  assert.strictEqual(st.qualified, false)

  st = peStatus({ agSeg: '', fycL12m: 95 }, 3)
  assert.strictEqual(st.fycTier, 'platinum')
  assert.strictEqual(st.target.tierId, 'platinum')
  assert.strictEqual(st.qualified, true, '95tr + 3 thang -> du dieu kien Bach Kim')

  st = peStatus({ agSeg: '', fycL12m: 95 }, 2)
  assert.strictEqual(st.target.tierId, 'platinum', 'thieu thang van giu dich Bach Kim')
  assert.strictEqual(st.target.lackMonths, 1)
  assert.strictEqual(st.qualified, false)

  st = peStatus({ agSeg: '', fycL12m: 45 }, 0)
  assert.strictEqual(st.fycTier, null, '45tr < 50 -> chua dat nguong Vang')
  assert.strictEqual(st.target.tierId, 'gold', 'dich mac dinh la Vang')
  assert.strictEqual(st.projected, 'gold')
  assert.strictEqual(st.target.lackL12m, 5)
  assert.strictEqual(st.target.lackMonths, 2)
  assert.strictEqual(st.qualified, false)

  st = peStatus({ agSeg: 'Gold', fycL12m: 60 }, 1)
  assert.strictEqual(st.fycTier, 'gold')
  assert.strictEqual(st.target.tierId, 'gold')
  assert.strictEqual(st.target.lackL12m, 0, 'da du FYC cho dich Vang')
  assert.strictEqual(st.target.lackMonths, 1)
  assert.strictEqual(st.qualified, false)
  assert.strictEqual(st.current, 'gold')
  console.log('=== peStatus ca bien (mo hinh dich): du dieu kien / thieu FYC / thieu thang khong ha dich / dich mac dinh Vang — dung ===')
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
  assert.strictEqual(activeMonthsInQuarter(quarterSnaps, '60556971'), 2, 'Trang: 2 thang hoat dong')
  assert.strictEqual(activeMonthsInQuarter(quarterSnaps, '60797524'), 1, 'Quan: 1 thang hoat dong')
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

// ── Phan bo fycTier + target/qualified toan GA (file 8.11, quy 4 den T11) ──
{
  const agentsNov = Object.values(snapT11.data.agents)
  const distLib = { diamond: 0, platinum: 0, gold: 0, none: 0 }
  const distIndep = { diamond: 0, platinum: 0, gold: 0, none: 0 }
  for (const a of agentsNov) {
    const raw = rawNov.get(String(a.msdl))
    assert.ok(raw, `TVV ${a.msdl} phai co trong sheet Agent tho`)
    assert.ok(Math.abs(num(a.fycL12m) - raw.fycL12m) < 1e-9, `fycL12m ${a.msdl}: parse=${a.fycL12m}, tho=${raw.fycL12m}`)
    const months = activeMonthsInQuarter(quarterSnaps, a.msdl)
    const st = peStatus(a, months)
    const want = indepStatus(raw.fycL12m, indepMonths(String(a.msdl)))
    assert.strictEqual(st.fycTier, want.fycTier, `fycTier ${a.msdl}: lib=${st.fycTier}, doc lap=${want.fycTier}`)
    assert.strictEqual(st.target.tierId, want.targetId, `target ${a.msdl}`)
    assert.strictEqual(st.target.lackL12m, want.lackL12m, `lackL12m ${a.msdl}`)
    assert.strictEqual(st.target.lackMonths, want.lackMonths, `lackMonths ${a.msdl}`)
    assert.strictEqual(st.qualified, want.qualified, `qualified ${a.msdl}`)
    assert.strictEqual(st.projected, want.targetId, `projected = dich (${a.msdl})`)
    distLib[st.fycTier || 'none']++
    distIndep[want.fycTier || 'none']++
  }
  assert.deepStrictEqual(distLib, distIndep, `phan bo fycTier lib=${JSON.stringify(distLib)} doc lap=${JSON.stringify(distIndep)}`)
  console.log(`=== phan bo fycTier toan GA (8.11): ${JSON.stringify(distLib)} — khop doc lap tung TVV (${agentsNov.length} TVV) ===`)

  // Ca PHAM THI MY TRANG theo mo hinh dich: dich Kim Cuong, thieu 1 thang.
  const trangRaw = rawNov.get('60556971')
  const trangAgent = agentsNov.find((a) => String(a.msdl) === '60556971')
  assert.ok(trangRaw && trangAgent, 'phai tim thay Trang trong file 8.11')
  const stTrang = peStatus(trangAgent, activeMonthsInQuarter(quarterSnaps, '60556971'))
  assert.strictEqual(stTrang.fycTier, 'diamond', 'Trang: fycTier Kim Cuong')
  assert.strictEqual(stTrang.target.tierId, 'diamond', 'Trang: dich Kim Cuong (khong phai Bach Kim)')
  assert.strictEqual(stTrang.target.lackL12m, 0)
  assert.strictEqual(stTrang.target.lackMonths, 1, 'Trang: con thieu 1 thang hoat dong')
  assert.strictEqual(stTrang.qualified, false, 'Trang: chua qualified (thieu 1 thang)')
  console.log(`=== ca Trang (60556971): FYC L12M = ${R1(trangRaw.fycL12m)}tr -> dich Kim Cuong, thieu 1 thang hoat dong, qualified = false ✓ ===`)
}

// ── nearRankList MO HINH DICH: khop doc lap (tap + thu tu) ──
{
  const expected = []
  for (const a of rawNov.values()) {
    const w = indepStatus(a.fycL12m, indepMonths(a.msdl))
    if ((w.lackL12m > 0 && w.lackL12m <= 20) || (w.lackL12m === 0 && w.lackMonths === 1)) {
      expected.push({ msdl: a.msdl, agName: a.agName, targetId: w.targetId, lackL: w.lackL12m, lackM: w.lackMonths })
    }
  }
  expected.sort((x, y) => (x.lackL - y.lackL) || (x.lackM - y.lackM) || String(x.agName).localeCompare(String(y.agName), 'vi'))
  const got = nearRankList(Object.values(snapT11.data.agents), quarterSnaps)
  assert.strictEqual(got.length, expected.length, `nearRankList: lib=${got.length}, doc lap=${expected.length}`)
  for (let i = 0; i < expected.length; i++) {
    assert.strictEqual(got[i].msdl, expected[i].msdl, `nearRankList[${i}]: lib=${got[i].msdl}, doc lap=${expected[i].msdl}`)
    assert.strictEqual(got[i].target.tierId, expected[i].targetId)
    assert.ok(Math.abs(got[i].target.lackL12m - expected[i].lackL) < 1e-9)
    assert.strictEqual(got[i].target.lackMonths, expected[i].lackM)
  }
  for (let i = 1; i < got.length; i++) {
    const p = got[i - 1].target; const c = got[i].target
    assert.ok(p.lackL12m < c.lackL12m || (p.lackL12m === c.lackL12m && p.lackMonths <= c.lackMonths), 'nearRankList: sap xep lackL12m -> lackMonths tang dan')
  }
  // Trang: du FYC dich Kim Cuong + thieu dung 1 thang -> CO trong Sap len hang.
  assert.ok(got.some((r) => r.msdl === '60556971'), 'Trang (thieu 1 thang toi dich Kim Cuong) phai co trong Sap len hang')
  console.log(`=== nearRankList (mo hinh dich): ${got.length} nguoi sap len hang — khop doc lap (tap + thu tu) ===`)
}

console.log('\nTEST PE: TAT CA DAT')
