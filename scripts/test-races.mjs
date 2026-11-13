// Test lib/races.js (TAB THI DUA — 13/11/2026) tren 2 file Daily THAT:
// 25.10 = thang 10/2026, 8.11 = thang 11/2026.
// Doi chieu DOC LAP tu sheet Proposal/Agent THO (XLSX sheet_to_json,
// khong qua lib) cho ca 3 chuong trinh:
//  - 00311 Kickoff: IP THUAN T11 = tong ipNet dong IF theo TVV; moc
//    50tr (TVV thuong) / 25tr (TVV MOI = khong co mat o sheet Agent
//    cua snapshot T10 nhung co mat o du lieu T11).
//  - 00211 T11: IP PHAT HANH = tong ipSub dong IF; bac 18/25/50/100,
//    thuong du kien (8% o bac cao nhat, tran 100tr).
//  - 00210 Q4: IP tinh thuong = T10 x2 + T11 x1,5 (TA9 x2), LOAI ho
//    so Dau Tu Vung Tien ipSub < 20tr; moc qua 600/900tr.
// Nguong sap dat (ca 3): gap <= max(20% moc ke, 10tr).
// Chay: node scripts/test-races.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import {
  isTA9Product, isDTVTProduct, latestSnapOfMonth, issuedSubByAgent,
  raceKickoff, raceNov, raceQ4, novTier, q4BonusIp,
} from '../src/lib/races.js'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const R1 = (x) => Math.round(x * 10) / 10
const H = process.env.HOME

function loadSnap(path, dateId) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
  return { id: dateId, data: parseWorkbook(wb) }
}
const snapT10 = loadSnap(H + '/workspace/user/files/Daily_Sales_25.10.xlsx', '2026-10-25')
const snapT11 = loadSnap(H + '/workspace/user/files/Daily_Sales_8.11.xlsx', '2026-11-08')
const snaps = [snapT10, snapT11]

// ── Doc lap: doc thang sheet Proposal + Agent THO ──
function rawRows(path, sheet) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
  return XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: null })
}
const prop10 = rawRows(H + '/workspace/user/files/Daily_Sales_25.10.xlsx', 'Proposal')
const prop11 = rawRows(H + '/workspace/user/files/Daily_Sales_8.11.xlsx', 'Proposal')
const ag10 = rawRows(H + '/workspace/user/files/Daily_Sales_25.10.xlsx', 'Agent')
const ag11 = rawRows(H + '/workspace/user/files/Daily_Sales_8.11.xlsx', 'Agent')

const isIF = (r) => String(r['PolicyStatus'] || '').trim().toUpperCase() === 'IF'
const prodOf = (r) => r['Remarked_ProductNameVN'] || r['ProductCode'] || ''
const ta9Raw = (p) => { const s = String(p || '').toUpperCase(); return s.includes('TA9') || s.includes('YÊN TÂM VUI KHỎE') }
const dtvtRaw = (p) => String(p || '').toUpperCase().includes('ĐẦU TƯ VỮNG TIẾN')
const nearRule = (gap, next) => gap > 0 && gap <= Math.max(next * 0.2, 10)

// ═══ Nhan dien san pham ═══
console.log('=== nhan dien san pham TA9 / Dau Tu Vung Tien ===')
assert.strictEqual(isTA9Product('PRUYÊN TÂM VUI KHỎE'), true)
assert.strictEqual(isTA9Product('TA9'), true)
assert.strictEqual(isTA9Product('PRU-ĐẦU TƯ VỮNG TIẾN'), false)
assert.strictEqual(isDTVTProduct('PRU-ĐẦU TƯ VỮNG TIẾN'), true)
assert.strictEqual(isDTVTProduct('UR9'), true)
assert.strictEqual(isDTVTProduct('PRUBẢO VỆ TỐI ĐA 2.0'), false)
assert.strictEqual(isDTVTProduct(''), false)
console.log('TA9 (ten VN + ma) / DTVT (ten VN + UR9) — dung')

// ═══ latestSnapOfMonth ═══
assert.strictEqual(latestSnapOfMonth(snaps, '2026-11').id, '2026-11-08')
assert.strictEqual(latestSnapOfMonth(snaps, '2026-12'), null)
console.log('latestSnapOfMonth: lay doc moi nhat cua thang, thang chua co -> null')

// ═══ (1) 00311 Kickoff ═══
console.log('\n=== 00311 Kickoff: IP thuan T11, moc 50tr / TVV moi 25tr ===')
const octAgentSet = new Set(ag10.filter((r) => r['AGCode']).map((r) => String(r['AGCode'])))
const thuanMap = new Map()
for (const r of prop11) {
  if (!isIF(r) || !r['AGCode']) continue
  const k = String(r['AGCode'])
  const cur = thuanMap.get(k) || { ip: 0, name: r['AGName'] || '', unit: r['UnitCode'] || '' }
  cur.ip += num(r['IP Net'])
  thuanMap.set(k, cur)
}
const novAgentKeys = new Set(ag11.filter((r) => r['AGCode']).map((r) => String(r['AGCode'])))
const expKickAch = []
const expKickNear = []
const candKeys = new Set([...novAgentKeys, ...thuanMap.keys()])
for (const k of candKeys) {
  const ip = thuanMap.get(k)?.ip || 0
  const isNew = !octAgentSet.has(k)
  const target = isNew ? 25 : 50
  if (ip >= target) expKickAch.push({ msdl: k, ip, isNew })
  else if (nearRule(target - ip, target)) expKickNear.push({ msdl: k, ip, gap: target - ip })
}
expKickAch.sort((a, b) => b.ip - a.ip)
expKickNear.sort((a, b) => a.gap - b.gap)

const kick = raceKickoff(snaps)
assert.strictEqual(kick.achieved.length, expKickAch.length, 'Kickoff: so nguoi dat phai khop tinh doc lap')
assert.strictEqual(kick.achieved.length, 5, 'Kickoff: du lieu 8.11 phai co 5 TVV dat moc')
assert.strictEqual(kick.counts.standard, 5)
assert.strictEqual(kick.counts.fresh, 0, 'Kickoff: chua co TVV moi dat 25tr tren du lieu 8.11')
for (let i = 0; i < expKickAch.length; i++) {
  assert.strictEqual(kick.achieved[i].msdl, expKickAch[i].msdl, `Kickoff: nguoi dat #${i} khop thu tu`)
  assert.strictEqual(R1(kick.achieved[i].value), R1(expKickAch[i].ip))
  assert.strictEqual(kick.achieved[i].isNew, expKickAch[i].isNew)
}
const trangKick = kick.achieved.find((r) => r.msdl === '60556971')
assert.ok(trangKick, 'Kickoff: My Trang phai co trong danh sach dat')
assert.strictEqual(R1(trangKick.value), 165.7, 'Kickoff: IP thuan T11 cua Trang = 165,7tr')
assert.deepStrictEqual(kick.near.map((r) => r.msdl), expKickNear.map((r) => r.msdl), 'Kickoff: danh sach sap dat khop doc lap')
console.log(`Dat moc: ${kick.achieved.length} (thuong ${kick.counts.standard} · moi ${kick.counts.fresh}); Trang IP thuan ${R1(trangKick.value)}tr; sap dat ${kick.near.length} nguoi`)

// ═══ (2) 00211 Thi dua Thang 11 ═══
console.log('\n=== 00211 T11: IP phat hanh (ipSub dong IF), bac thuong ===')
const phMap = new Map()
for (const r of prop11) {
  if (!isIF(r) || !r['AGCode']) continue
  const k = String(r['AGCode'])
  const cur = phMap.get(k) || { ip: 0, name: r['AGName'] || '', unit: r['UnitCode'] || '' }
  cur.ip += num(r['IP Sub'])
  phMap.set(k, cur)
}
const cntGe = (min) => [...phMap.values()].filter((v) => v.ip >= min).length
assert.strictEqual(cntGe(18), 14); assert.strictEqual(cntGe(25), 9)
assert.strictEqual(cntGe(50), 5); assert.strictEqual(cntGe(100), 1)

const nov = raceNov(snaps)
assert.strictEqual(nov.achieved.length, 14, '00211: 14 TVV dat tu moc 18tr')
assert.deepStrictEqual(nov.counts.byTier, [1, 4, 4, 5], '00211: phan bo bac >=100/50/25/18 = 1/4/4/5')
const trangNov = nov.achieved.find((r) => r.msdl === '60556971')
assert.strictEqual(R1(trangNov.value), 165.7)
assert.strictEqual(R1(trangNov.bonus), R1(Math.min(165.7 * 0.08, 100)), '00211: Trang bac 8% IP')
const huanNov = nov.achieved.find((r) => r.msdl === '60776590')
assert.strictEqual(R1(huanNov.value), 90)
assert.strictEqual(huanNov.bonus, 5, '00211: Huan (90tr) o bac 50-<100 -> thuong 5,0tr')
assert.strictEqual(novTier(10).nextMin, 18)
assert.strictEqual(novTier(120).bonus, Math.min(120 * 0.08, 100))
assert.strictEqual(novTier(2000).bonus, 100, '00211: thuong bi ap tran 100tr/TVV')
const expNovNear = [...phMap.entries()]
  .map(([k, v]) => ({ msdl: k, gap: 18 - v.ip }))
  .filter((x) => nearRule(x.gap, 18))
  .sort((a, b) => a.gap - b.gap)
assert.deepStrictEqual(nov.near.map((r) => r.msdl), expNovNear.map((r) => r.msdl), '00211: sap dat (sap cham moc 18tr) khop doc lap')
console.log(`Dat thuong: ${nov.achieved.length} TVV (bac 100/50/25/18 = ${nov.counts.byTier.join('/')}); Trang thuong du kien ${R1(trangNov.bonus)}tr; sap dat ${nov.near.length} nguoi`)

// ═══ (3) 00210 Quy 4 ═══
console.log('\n=== 00210 Q4: IP tinh thuong (he so + loai DTVT <20tr), moc 600/900 ===')
function monthIpRaw(rows) {
  const m = new Map()
  for (const r of rows) {
    if (!isIF(r) || !r['AGCode']) continue
    const ip = num(r['IP Sub']); const p = prodOf(r)
    if (dtvtRaw(p) && ip < 20) continue
    const k = String(r['AGCode'])
    const cur = m.get(k) || { ip: 0, ta9: 0, name: r['AGName'] || '', unit: r['UnitCode'] || '' }
    cur.ip += ip; if (ta9Raw(p)) cur.ta9 += ip
    m.set(k, cur)
  }
  return m
}
const oMap = monthIpRaw(prop10); const nMap = monthIpRaw(prop11)
const expQ4 = []
for (const k of new Set([...oMap.keys(), ...nMap.keys()])) {
  const o = oMap.get(k) || { ip: 0, ta9: 0 }; const nv = nMap.get(k) || { ip: 0, ta9: 0 }
  const b = o.ip * 2 + (nv.ip - nv.ta9) * 1.5 + nv.ta9 * 2
  if (b > 0) expQ4.push({ msdl: k, b })
}
expQ4.sort((a, b) => b.b - a.b)

const q4 = raceQ4(snaps)
assert.strictEqual(q4.hasDec, false, 'Q4: du lieu test chua co thang 12')
assert.strictEqual(q4.achieved.length, 0, 'Q4: chua ai dat 600tr tren du lieu den 8.11')
assert.strictEqual(q4.counts.total, 0)
assert.strictEqual(R1(q4BonusIp({ octIp: 100, novIp: 100, novIpTA9: 40 })), R1(100 * 2 + 60 * 1.5 + 40 * 2), 'q4BonusIp: he so T10 x2, T11 thuong x1,5 + TA9 x2')
// Gia tri tung TVV: tinh lai bang cac ham lib (issuedSubByAgent +
// q4BonusIp) de doi chieu tung nguoi voi tinh doc lap o tren.
const q4All = new Map()
{
  const o = issuedSubByAgent(snapT10, { forQ4: true })
  const nv2 = issuedSubByAgent(snapT11, { forQ4: true })
  for (const k of new Set([...o.keys(), ...nv2.keys()])) {
    q4All.set(k, q4BonusIp({ octIp: o.get(k)?.ip || 0, novIp: nv2.get(k)?.ip || 0, novIpTA9: nv2.get(k)?.ipTA9 || 0 }))
  }
}
for (const e of expQ4) {
  assert.strictEqual(R1(q4All.get(e.msdl)), R1(e.b), `Q4: IP tinh thuong cua ${e.msdl} khop doc lap`)
}
assert.strictEqual(R1(q4All.get('60556971')), 456.6, 'Q4: Trang IP tinh thuong = 456,6tr (T10 179,9 x2 + T11 64,5 x1,5)')
assert.strictEqual(R1(q4All.get('60789834')), 358.4, 'Q4: Phuong IP tinh thuong = 358,4tr')
const expQ4Near = expQ4
  .map((e) => ({ msdl: e.msdl, gap: 600 - e.b }))
  .filter((x) => nearRule(x.gap, 600))
  .sort((a, b) => a.gap - b.gap)
assert.deepStrictEqual(q4.near.map((r) => r.msdl), expQ4Near.map((r) => r.msdl), 'Q4: danh sach sap dat moc 600 khop doc lap (gap <= max(20% x 600, 10) = 120)')
console.log(`Chua ai dat qua (dung du lieu den 8.11, chua gom T12); Trang dan dau IP tinh thuong ${R1(q4All.get('60556971'))}tr; sap dat moc 600: ${q4.near.length} nguoi`)

console.log('\n✅ test-races: TAT CA KHAI BAO DAT')
