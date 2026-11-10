// Test lib/attention.js (CAN CHU Y HOM NAY — 10/11/2026) tren file
// Daily THAT 8.11 (snapshot 2026-11-08):
//  - Nhom SAP CHAM MOC: tap MSDL + so thieu khop TINH TAY DOC LAP tu
//    sheet Agent (doc thang agents cua ban parse: 0 < ipNet < 15 va
//    thieu <= 2tr; hoac 0 < fyc < 5 va thieu <= 2tr).
//  - Nhom PENDING LAU NHAT: top 5 khop pendingAll cua analyze sap
//    ageDays giam dan (sap doc lap trong test tu pendingAll tho).
//  - Nhom CHUA CO HO SO: snapshot ngay 8 (< 10) -> RONG theo quy tac;
//    doi id sang ngay 15 (cung du lieu) -> TVV liet ke phai dung la
//    TVV khong co bat ky ho so nao trong buildCases, toi da 15 nguoi.
// Chay: node scripts/test-attention.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { buildCases } from '../src/lib/cases.js'
import { analyzeSoSanLuong } from '../src/lib/analyze.js'
import { buildAttentionList } from '../src/lib/attention.js'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const up = (v) => String(v || '').trim().toUpperCase()

function loadSnap(path, dateId) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
  return { id: dateId, data: parseWorkbook(wb) }
}
const snap = loadSnap(process.env.HOME + '/workspace/user/files/Daily_Sales_8.11.xlsx', '2026-11-08')
const snapT10 = loadSnap(process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx', '2026-10-25')
const cases = buildCases(snap)
const analysis = analyzeSoSanLuong([snap], [snapT10], { year: 2026, month: 11 })
const att = buildAttentionList(snap, cases, analysis.pendingAll)

// ── (a) Sap cham moc — tinh tay doc lap tu agents ──
{
  const expected = new Map()
  for (const a of Object.values(snap.data.agents)) {
    const marks = []
    const ip = num(a.ipNet); const fyc = num(a.fyc)
    if (ip > 0 && ip < 15 && 15 - ip <= 2) marks.push({ kind: 'active', gap: 15 - ip })
    if (fyc > 0 && fyc < 5 && 5 - fyc <= 2) marks.push({ kind: 'fyc', gap: 5 - fyc })
    if (marks.length) expected.set(up(a.msdl), marks)
  }
  assert.strictEqual(att.near.length, expected.size, `near: so TVV phai = ${expected.size} (tinh tay), thuc te ${att.near.length}`)
  for (const row of att.near) {
    const exp = expected.get(row.msdl)
    assert.ok(exp, `near: ${row.msdl} khong nam trong tap tinh tay`)
    assert.strictEqual(row.marks.length, exp.length, `near: ${row.msdl} so moc phai khop tinh tay`)
    for (const m of row.marks) {
      const e = exp.find((x) => x.kind === m.kind)
      assert.ok(e && Math.abs(e.gap - m.gap) < 1e-6, `near: ${row.msdl} thieu ${m.kind} phai = ${e && e.gap} (thuc te ${m.gap})`)
    }
  }
  for (let i = 1; i < att.near.length; i++) {
    assert.ok(att.near[i - 1].minGap <= att.near[i].minGap, 'near: sap theo khoang thieu nho nhat tang dan')
  }
  console.log(`=== near (sap cham moc): ${att.near.length} TVV khop tinh tay tu sheet Agent ===`)
}

// ── (c) Pending lau nhat — sap doc lap tu pendingAll tho ──
{
  const expectedTop = (analysis.pendingAll || [])
    .filter((c) => c.ageDays !== null && c.ageDays !== undefined)
    .slice()
    .sort((x, y) => num(y.ageDays) - num(x.ageDays))
    .slice(0, 5)
  assert.strictEqual(att.pendingTop.length, expectedTop.length, 'pendingTop: so ho so phai khop top 5 pendingAll')
  att.pendingTop.forEach((row, i) => {
    assert.strictEqual(row.proposalNum, expectedTop[i].proposalNum, `pendingTop[${i}]: dung ho so pending lau thu ${i + 1}`)
    assert.strictEqual(row.ageDays, num(expectedTop[i].ageDays), `pendingTop[${i}]: ageDays khop`)
  })
  console.log(`=== pendingTop: ${att.pendingTop.length} ho so pending lau nhat khop pendingAll (lau nhat ${att.pendingTop[0]?.ageDays ?? '—'} ngay) ===`)
}

// ── (b) Chua co ho so — ngay 8 thi rong; ngay 15 thi dung dinh nghia ──
{
  assert.strictEqual(att.snapDay, 8, 'snapDay cua snapshot 8.11 phai = 8')
  assert.deepStrictEqual(att.noCases, [], 'noCases: ngay du lieu 8 (< 10) -> rong theo quy tac')
  const snap15 = { id: '2026-11-15', data: snap.data }
  const cases15 = buildCases(snap15)
  const att15 = buildAttentionList(snap15, cases15, analysis.pendingAll)
  const withCase = new Set(cases15.map((c) => up(c.msdl)).filter(Boolean))
  assert.ok(att15.noCases.length > 0 && att15.noCases.length <= 15, `noCases ngay 15: 1-15 nguoi (thuc te ${att15.noCases.length})`)
  for (const row of att15.noCases) {
    assert.ok(!withCase.has(row.msdl), `noCases: ${row.msdl} phai la TVV khong co ho so nao trong buildCases`)
    assert.ok(snap.data.agents[row.msdl] || Object.values(snap.data.agents).some((a) => up(a.msdl) === row.msdl), `noCases: ${row.msdl} phai co trong sheet Agent`)
  }
  for (let i = 1; i < att15.noCases.length; i++) {
    assert.ok(att15.noCases[i - 1].fypYtd >= att15.noCases[i].fypYtd, 'noCases: uu tien FYP nam cao truoc')
  }
  console.log(`=== noCases: ngay 8 -> rong; ngay 15 -> ${att15.noCases.length} TVV chua co ho so (dung dinh nghia buildCases) ===`)
}

// ── Snapshot rong -> 3 nhom rong, khong loi ──
{
  const empty = buildAttentionList(null, [], [])
  assert.deepStrictEqual(empty.near, [], 'empty: near rong')
  assert.deepStrictEqual(empty.noCases, [], 'empty: noCases rong')
  assert.deepStrictEqual(empty.pendingTop, [], 'empty: pendingTop rong')
  console.log('=== snapshot null -> 3 nhom rong, khong loi ===')
}

console.log('\n✅ TAT CA ASSERT DAT (test-attention)')
