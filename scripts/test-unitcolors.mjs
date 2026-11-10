// Test lib/unitColors.js (MAU RIENG TUNG PHONG — 10/11/2026):
//  - ON DINH: cung ma phong goi nhieu lan / viet hoa-thuong / thua
//    khoang trang -> cung 1 cap mau (bam xac dinh, khong phu thuoc
//    danh sach phong cua thang).
//  - PHAN BIET: 20 ma phong that T11 (sheet Leader file Daily
//    8.11) phai cho ra TOI THIEU 18 mau chinh khac nhau.
//  - MOI mau deu co cap soft; bang mau co toi thieu 24 cap; ma
//    trong / "—" -> mau mac dinh, khong loi.
// Chay: node scripts/test-unitcolors.mjs
import assert from 'node:assert'
import { unitColor, UNIT_COLOR_PALETTE, UNIT_COLOR_DEFAULT } from '../src/lib/unitColors.js'

// 20 ma phong T11 (co trong sheet Leader)
const T11_UNITS = ['9CF', '9CJ', '9DA', '9EB', '9HA', 'B51', 'FTK', 'G4D', 'GB4', 'M1G', 'P3G', 'PKA', 'PRH', 'QBC', 'SWZ', 'TCG', 'TUQ', 'UVC', 'V5W', 'VA9']

// ── Bang mau: toi thieu 24 cap, moi cap du main + soft dang hex ──
{
  assert.ok(Array.isArray(UNIT_COLOR_PALETTE), 'palette phai la mang')
  assert.ok(UNIT_COLOR_PALETTE.length >= 24, `palette phai co >= 24 cap mau (dang co ${UNIT_COLOR_PALETTE.length})`)
  const hex = /^#[0-9a-f]{6}$/i
  for (const c of UNIT_COLOR_PALETTE) {
    assert.ok(hex.test(c.main), `main khong phai hex: ${c.main}`)
    assert.ok(hex.test(c.soft), `soft khong phai hex: ${c.soft}`)
  }
  assert.strictEqual(new Set(UNIT_COLOR_PALETTE.map((c) => c.main)).size, UNIT_COLOR_PALETTE.length, 'cac mau main trong bang phai khac nhau het')
  console.log(`=== Bang mau: ${UNIT_COLOR_PALETTE.length} cap, main khac nhau het, du cap soft ===`)
}

// ── On dinh: cung ma -> cung mau, bat chap hoa/thuong/khoang trang ──
{
  for (const code of T11_UNITS) {
    const a = unitColor(code)
    assert.deepStrictEqual(unitColor(code), a, `${code}: goi lai phai cung mau`)
    assert.deepStrictEqual(unitColor(code.toLowerCase()), a, `${code}: viet thuong phai cung mau`)
    assert.deepStrictEqual(unitColor(`  ${code} `), a, `${code}: thua khoang trang phai cung mau`)
    assert.ok(a.main && a.soft, `${code}: phai co du main + soft`)
  }
  console.log('=== On dinh: 20 ma phong goi lai / doi hoa-thuong / them khoang trang -> mau khong doi ===')
}

// ── Phan biet: 20 ma T11 -> toi thieu 18 mau chinh khac nhau ──
{
  const mains = T11_UNITS.map((c) => unitColor(c).main)
  const distinct = new Set(mains).size
  assert.ok(distinct >= 18, `20 phong T11 phai co >= 18 mau khac nhau (dang co ${distinct})`)
  console.log(`=== Phan biet: 20 phong T11 -> ${distinct} mau chinh khac nhau ===`)
  const dup = mains.filter((m, i) => mains.indexOf(m) !== i)
  if (dup.length) {
    const pairs = T11_UNITS.filter((c) => dup.includes(unitColor(c).main))
    console.log(`    (Mau trung nhau: ${pairs.join(', ')} cung mau ${dup[0]})`)
  }
}

// ── Ma trong / la -> mau mac dinh ──
{
  assert.deepStrictEqual(unitColor(''), UNIT_COLOR_DEFAULT, 'ma rong -> mac dinh')
  assert.deepStrictEqual(unitColor(null), UNIT_COLOR_DEFAULT, 'ma null -> mac dinh')
  assert.deepStrictEqual(unitColor(undefined), UNIT_COLOR_DEFAULT, 'ma undefined -> mac dinh')
  assert.deepStrictEqual(unitColor('—'), UNIT_COLOR_DEFAULT, 'ma "—" -> mac dinh')
  console.log('=== Ma trong/null/"—" -> mau mac dinh, khong loi ===')
}

console.log('\n✅ TAT CA ASSERT DAT (test-unitcolors)')
