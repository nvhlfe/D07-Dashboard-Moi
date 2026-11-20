// Test du lieu IPHONE CHINH THUC Memo 00210 (lib/iphoneOfficial)
// doi chieu voi file trich xuat tu bang Excel cong ty
// Memo_18.11.xlsx: scripts/memo-1811-extract.json, khoa
// 'iphone00210' (Lan gui 20/11/2026, bang cap nhat 18/11/2026).
// Kiem tra CHEO bat buoc cho MOI dong:
//  (a) tong == co so + cong them T10 + cong them T11 (lech 0 dong);
//  (b) tong >= 600tr thi Promax "Dat", nguoc lai con thieu
//      600tr - tong (tinh tu tong, file trich xuat khong luu san);
//  (c) tuong tu Duo voi 900tr.
// Cong: lib phai trung file trich xuat tung dong; Trang/Phuong la
// 2 ca chuan; danh sach sap giam dan theo tong; khong trung MSDL.
// Chay: node scripts/test-iphone.mjs
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import {
  IPHONE_OFFICIAL, IPHONE_PROMAX_GOAL, IPHONE_DUO_GOAL,
  iphoneGoalStatus, iphoneRowStatus, iphoneSummary,
} from '../src/lib/iphoneOfficial.js'

const extract = JSON.parse(readFileSync(new URL('./memo-1811-extract.json', import.meta.url), 'utf8'))
const libRows = IPHONE_OFFICIAL.rows
const exRows = extract.iphone00210

console.log('=== iPhone chinh thuc 00210 (bang 18/11): lib khop file trich xuat + kiem tra cheo ===')
assert.ok(IPHONE_OFFICIAL.updatedLabel.includes('18/11/2026'), 'updatedLabel phai chua 18/11/2026')
assert.strictEqual(IPHONE_PROMAX_GOAL, 600000000)
assert.strictEqual(IPHONE_DUO_GOAL, 900000000)
assert.strictEqual(libRows.length, exRows.length, 'so dong lib phai bang file trich xuat')
assert.strictEqual(libRows.length, 45, 'bang cong ty 18/11 trich duoc 45 dong')

const FIELDS = ['msdl', 'name', 'unit', 'base', 'bonus10', 'bonus11', 'total']
const seen = new Set()
for (let i = 0; i < exRows.length; i++) {
  const e = exRows[i]
  const l = libRows[i]
  for (const f of FIELDS) {
    assert.strictEqual(l[f], e[f], `dong ${i} (${e.msdl}): truong ${f} lib phai trung file trich xuat`)
  }
  // (a) tong = co so + cong them T10 + T11
  assert.strictEqual(e.base + e.bonus10 + e.bonus11, e.total, `${e.msdl}: tong phai bang co so + cong them T10 + T11`)
  // (b) + (c): trang thai moc tinh tu tong phai khop iphoneRowStatus
  const st = iphoneRowStatus(e)
  assert.strictEqual(st.promax.reached, e.total >= IPHONE_PROMAX_GOAL, `${e.msdl}: Promax dat/thieu khop tong`)
  assert.strictEqual(st.duo.reached, e.total >= IPHONE_DUO_GOAL, `${e.msdl}: Duo dat/thieu khop tong`)
  if (!st.promax.reached) assert.strictEqual(st.promax.lack, IPHONE_PROMAX_GOAL - e.total, `${e.msdl}: so thieu Promax = 600tr - tong`)
  if (!st.duo.reached) assert.strictEqual(st.duo.lack, IPHONE_DUO_GOAL - e.total, `${e.msdl}: so thieu Duo = 900tr - tong`)
  assert.ok(!seen.has(e.msdl), `${e.msdl}: khong trung MSDL`)
  seen.add(e.msdl)
  if (i > 0) assert.ok(libRows[i - 1].total >= e.total, 'danh sach phai sap GIAM DAN theo tong')
}
console.log('45/45 dong: lib == file trich xuat, ca 3 cong thuc kiem tra cheo deu khop, khong trung MSDL')

// ── Tong ket + 2 ca chuan ──
const sum = iphoneSummary()
assert.deepStrictEqual(
  { total: sum.total, datPromax: sum.datPromax, datDuo: sum.datDuo },
  { total: 45, datPromax: 2, datDuo: 1 },
  'Tong ket bang 18/11: 45 TVV · Dat Pro Max 2 · Dat Duo 1',
)

const trang = libRows.find((r) => r.msdl === '60556971')
assert.ok(trang, 'phai co My Trang (60556971)')
assert.strictEqual(trang.total, 1842093900, 'Trang: tong IP tinh thuong = 1.842.093.900d')
assert.deepStrictEqual(iphoneRowStatus(trang), {
  promax: { reached: true, lack: 0 },
  duo: { reached: true, lack: 0 },
}, 'Trang: DAT CA 2 moc')

const phuong = libRows.find((r) => r.msdl === '60789834')
assert.ok(phuong, 'phai co Thanh Phuong (60789834)')
assert.strictEqual(phuong.total, 621094800, 'Phuong: tong IP tinh thuong = 621.094.800d')
const stP = iphoneRowStatus(phuong)
assert.strictEqual(stP.promax.reached, true, 'Phuong: Dat Pro Max')
assert.strictEqual(stP.duo.reached, false)
assert.strictEqual(stP.duo.lack, 900000000 - 621094800, 'Phuong: Duo con thieu 278.905.200d')
console.log('Tong ket: Dat Pro Max 2 · Dat Duo 1; Trang 1.842,1tr dat ca 2; Phuong 621,1tr dat Pro Max, Duo thieu 278,9tr')

// ── Ham trang thai o bien ──
assert.deepStrictEqual(iphoneGoalStatus(600000000, IPHONE_PROMAX_GOAL), { reached: true, lack: 0 })
assert.deepStrictEqual(iphoneGoalStatus(599999999, IPHONE_PROMAX_GOAL), { reached: false, lack: 1 })
assert.deepStrictEqual(iphoneGoalStatus(0, IPHONE_DUO_GOAL), { reached: false, lack: 900000000 })

console.log('\n✅ test-iphone: TAT CA KHAI BAO DAT')
