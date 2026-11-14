// Test du lieu IPHONE CHINH THUC Memo 00210 (lib/iphoneOfficial)
// doi chieu voi file trich xuat tu anh bang cong ty:
// scripts/iphone-official-extract.json (Lan gui 13/11/2026).
// Kiem tra CHEO bat buoc cho MOI dong:
//  (a) tong == co so + cong them T10 + cong them T11 (lech 0 dong);
//  (b) tong >= 600tr thi Promax "Dat", nguoc lai so thieu Promax
//      trong file trich xuat == 600tr - tong;
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

const extract = JSON.parse(readFileSync(new URL('./iphone-official-extract.json', import.meta.url), 'utf8'))
const libRows = IPHONE_OFFICIAL.rows
const exRows = extract.rows

console.log('=== iPhone chinh thuc 00210: lib khop file trich xuat + kiem tra cheo ===')
assert.strictEqual(IPHONE_OFFICIAL.updatedLabel, 'Cập nhật theo bảng công ty ngày 13/11/2026')
assert.strictEqual(IPHONE_PROMAX_GOAL, 600000000)
assert.strictEqual(IPHONE_DUO_GOAL, 900000000)
assert.strictEqual(libRows.length, exRows.length, 'so dong lib phai bang file trich xuat')
assert.strictEqual(libRows.length, 44, 'bang cong ty trich duoc 44 dong (22 + 22)')

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
  // (b) + (c): trang thai moc trong file trich xuat vs tinh tu tong
  const st = iphoneRowStatus(e)
  assert.strictEqual(st.promax.reached, e.promax === 'dat', `${e.msdl}: Promax dat/thieu khop tong`)
  assert.strictEqual(st.duo.reached, e.duo === 'dat', `${e.msdl}: Duo dat/thieu khop tong`)
  if (!st.promax.reached) assert.strictEqual(st.promax.lack, e.promax, `${e.msdl}: so thieu Promax khop file trich xuat`)
  if (!st.duo.reached) assert.strictEqual(st.duo.lack, e.duo, `${e.msdl}: so thieu Duo khop file trich xuat`)
  assert.ok(!seen.has(e.msdl), `${e.msdl}: khong trung MSDL`)
  seen.add(e.msdl)
  if (i > 0) assert.ok(libRows[i - 1].total >= e.total, 'danh sach phai sap GIAM DAN theo tong')
}
console.log(`44/44 dong: lib == file trich xuat, ca 3 cong thuc kiem tra cheo deu khop, khong trung MSDL`)

// ── Tong ket + 2 ca chuan ──
const sum = iphoneSummary()
assert.strictEqual(sum.total, 44)
assert.strictEqual(sum.datPromax, 2, 'Dat iPhone 18 Pro Max: dung 2 TVV')
assert.strictEqual(sum.datDuo, 1, 'Dat iPhone Duo: dung 1 TVV')

const trang = libRows.find((r) => r.msdl === '60556971')
assert.ok(trang, 'phai co My Trang (60556971)')
assert.strictEqual(trang.total, 1578792400, 'Trang: tong IP tinh thuong = 1.578.792.400d')
assert.deepStrictEqual(iphoneRowStatus(trang), {
  promax: { reached: true, lack: 0 },
  duo: { reached: true, lack: 0 },
}, 'Trang: DAT CA 2 moc')

const phuong = libRows.find((r) => r.msdl === '60789834')
assert.ok(phuong, 'phai co Thanh Phuong (60789834)')
assert.strictEqual(phuong.total, 624721800, 'Phuong: tong IP tinh thuong = 624.721.800d')
const stP = iphoneRowStatus(phuong)
assert.strictEqual(stP.promax.reached, true, 'Phuong: Dat Pro Max')
assert.strictEqual(stP.duo.reached, false)
assert.strictEqual(stP.duo.lack, 275278200, 'Phuong: Duo con thieu 275.278.200d')
console.log('Tong ket: Dat Pro Max 2 · Dat Duo 1; Trang 1.578,8tr dat ca 2; Phuong 624,7tr dat Pro Max, Duo thieu 275,3tr')

// ── Ham trang thai o bien ──
assert.deepStrictEqual(iphoneGoalStatus(600000000, IPHONE_PROMAX_GOAL), { reached: true, lack: 0 })
assert.deepStrictEqual(iphoneGoalStatus(599999999, IPHONE_PROMAX_GOAL), { reached: false, lack: 1 })
assert.deepStrictEqual(iphoneGoalStatus(0, IPHONE_DUO_GOAL), { reached: false, lack: 900000000 })

console.log('\n✅ test-iphone: TAT CA KHAI BAO DAT')
