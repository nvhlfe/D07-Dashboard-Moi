// Test du lieu CHINH THUC 2 chuong trinh thang 11/2026
// (lib/raceOfficial) doi chieu voi file trich xuat tu bang Excel
// cong ty Memo_18.11.xlsx: scripts/memo-1811-extract.json, khoa
// 'nov00211' (Memo 00211) + 'kickoff00311' (Memo 00311) — Lan gui
// 20/11/2026, bang cap nhat 18/11/2026.
// Kiem tra: lib trung file trich xuat TUNG TRUONG tung dong; tong
// ket 00211 (so TVV dat, phan bo bac, tong thuong, so ca x2) va
// 00311 (so TVV, so ve); 2 ca x2 chuan; moi dong Kickoff co
// tickets == ticketsStd + ticketsNew + ticketsRef + ticketsMgr.
// Chay: node scripts/test-raceofficial.mjs
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import {
  NOV_OFFICIAL, KICKOFF_OFFICIAL, KICKOFF_OFFICIAL_TARGET,
  novOfficialTier, novOfficialSummary, kickoffOfficialSummary,
} from '../src/lib/raceOfficial.js'

const extract = JSON.parse(readFileSync(new URL('./memo-1811-extract.json', import.meta.url), 'utf8'))

// ── Memo 00211: lib == file trich xuat tung truong ──
console.log('=== 00211 chinh thuc (bang 18/11): lib khop file trich xuat ===')
assert.ok(NOV_OFFICIAL.updatedLabel.includes('18/11/2026'), 'NOV_OFFICIAL.updatedLabel phai chua 18/11/2026')
const exNov = extract.nov00211
assert.strictEqual(NOV_OFFICIAL.rows.length, exNov.length, 'so dong 00211 lib phai bang file trich xuat')
assert.strictEqual(NOV_OFFICIAL.rows.length, 29, 'bang 00211 co 29 dong')
const NOV_FIELDS = ['msdl', 'name', 'unit', 'total', 'week1', 'crossIp', 'crossRatio']
{
  const seen = new Set()
  for (let i = 0; i < exNov.length; i++) {
    const e = exNov[i]
    const l = NOV_OFFICIAL.rows[i]
    for (const f of NOV_FIELDS) {
      assert.strictEqual(l[f], e[f], `00211 dong ${i} (${e.msdl}): truong ${f} lib phai trung file trich xuat`)
    }
    assert.ok(!seen.has(e.msdl), `00211 ${e.msdl}: khong trung MSDL`)
    seen.add(e.msdl)
  }
}
console.log('29/29 dong 00211: moi truong lib == file trich xuat, khong trung MSDL')

// ── Tong ket 00211 + 2 ca x2 chuan ──
const novSum = novOfficialSummary()
assert.deepStrictEqual(
  novSum,
  { total: 29, achieved: 20, byTier: [4, 5, 6, 5], totalBonus: 120746360, doubles: 2 },
  'Tong ket 00211: 29 TVV · dat 20 · bac [100tr:4, 50tr:5, 25tr:6, 18tr:5] · tong thuong 120.746.360d · 2 ca x2',
)
const ngocPhuong = NOV_OFFICIAL.rows.find((r) => r.msdl === '60337183')
assert.ok(ngocPhuong && ngocPhuong.name === 'Trần Thị Ngọc Phương', 'phai co Tran Thi Ngoc Phuong (60337183)')
assert.strictEqual(novOfficialTier(ngocPhuong.total, ngocPhuong.crossRatio).bonus, 5000000, 'Ngoc Phuong: bac 25tr (2,5tr) x2 ban cung >= 40% = 5.000.000d')
assert.strictEqual(novOfficialTier(ngocPhuong.total, ngocPhuong.crossRatio).doubled, true, 'Ngoc Phuong: phai duoc danh dau x2')
const ngocThao = NOV_OFFICIAL.rows.find((r) => r.msdl === '60806792')
assert.ok(ngocThao && ngocThao.name === 'Đỗ Ngọc Thảo', 'phai co Do Ngoc Thao (60806792)')
assert.strictEqual(novOfficialTier(ngocThao.total, ngocThao.crossRatio).bonus, 3000000, 'Ngoc Thao: bac 18tr (1,5tr) x2 ban cung >= 40% = 3.000.000d')
assert.strictEqual(novOfficialTier(ngocThao.total, ngocThao.crossRatio).doubled, true, 'Ngoc Thao: phai duoc danh dau x2')
console.log('Tong ket 00211 dung; 2 ca x2: Ngoc Phuong 5,0tr · Ngoc Thao 3,0tr')

// ── Memo 00311: lib == file trich xuat tung truong ──
console.log('\n=== 00311 chinh thuc (bang 18/11): lib khop file trich xuat ===')
assert.ok(KICKOFF_OFFICIAL.updatedLabel.includes('18/11/2026'), 'KICKOFF_OFFICIAL.updatedLabel phai chua 18/11/2026')
assert.strictEqual(KICKOFF_OFFICIAL_TARGET, 50000000, 'Moc ve TVV thuong 00311 = 50tr')
const exKick = extract.kickoff00311
assert.strictEqual(KICKOFF_OFFICIAL.rows.length, exKick.length, 'so dong 00311 lib phai bang file trich xuat')
assert.strictEqual(KICKOFF_OFFICIAL.rows.length, 33, 'bang 00311 co 33 dong')
const KICK_FIELDS = ['msdl', 'name', 'unit', 'title', 'ipNet', 'retention', 'isManager', 'isReferrer', 'tickets', 'ticketsStd', 'ticketsNew', 'ticketsRef', 'ticketsMgr']
{
  const seen = new Set()
  for (let i = 0; i < exKick.length; i++) {
    const e = exKick[i]
    const l = KICKOFF_OFFICIAL.rows[i]
    for (const f of KICK_FIELDS) {
      assert.strictEqual(l[f], e[f], `00311 dong ${i} (${e.msdl}): truong ${f} lib phai trung file trich xuat`)
    }
    assert.ok(!seen.has(e.msdl), `00311 ${e.msdl}: khong trung MSDL`)
    seen.add(e.msdl)
    // Ve tong phai bang tong 4 dien ve (theo file trich xuat)
    assert.strictEqual(
      e.tickets, e.ticketsStd + e.ticketsNew + e.ticketsRef + e.ticketsMgr,
      `00311 ${e.msdl}: tickets phai bang ticketsStd + ticketsNew + ticketsRef + ticketsMgr`,
    )
    assert.strictEqual(
      l.tickets, l.ticketsStd + l.ticketsNew + l.ticketsRef + l.ticketsMgr,
      `00311 ${e.msdl} (lib): tickets phai bang tong 4 dien ve`,
    )
  }
}
console.log('33/33 dong 00311: moi truong lib == file trich xuat; tickets = tong 4 dien ve o ca lib lan file trich xuat')

// ── Tong ket 00311 ──
const kickSum = kickoffOfficialSummary()
assert.deepStrictEqual(
  kickSum,
  { total: 33, achievers: 10, totalTickets: 10 },
  'Tong ket 00311: 33 TVV · 10 TVV dat · 10 ve tam dat',
)
console.log('Tong ket 00311 dung: 33 TVV · 10 TVV dat · 10 ve')

console.log('\n✅ test-raceofficial: TAT CA KHAI BAO DAT')
