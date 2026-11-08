// Test lib/memoLib.js (logic thuan thu vien Memo) + kiem tra pdfjs-dist
// da duoc cai lam dependency (module pdfSplit chi chay tren trinh duyet —
// node khong co canvas nen KHONG render PDF o day).
// Chay: node scripts/test-memo.mjs
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { AUDIENCES, audienceLabel, stripDiacritics, filterMemos, sortMemos, summaryLines } from '../src/lib/memoLib.js'

// ── AUDIENCES: du 4 nhom theo mau D03 ──
console.log('=== AUDIENCES ===')
assert.deepStrictEqual(AUDIENCES.map((a) => a.code), ['tvv', 'ql', 'kh', 'cstn'])
assert.strictEqual(audienceLabel('tvv'), 'Tư vấn viên')
assert.strictEqual(audienceLabel('ql'), 'Quản lý')
assert.strictEqual(audienceLabel('kh'), 'Khách hàng')
assert.strictEqual(audienceLabel('cstn'), 'Chính sách thu nhập')
console.log('4 nhom: Tu van vien / Quan ly / Khach hang / Chinh sach thu nhap — dung')

// ── stripDiacritics: bo dau + chu thuong, gom ca đ/Đ ──
console.log('\n=== stripDiacritics ===')
assert.strictEqual(stripDiacritics('Thi đua tháng 11'), 'thi dua thang 11')
assert.strictEqual(stripDiacritics('ĐỈNH CAO Hiệu Suất'), 'dinh cao hieu suat')
assert.strictEqual(stripDiacritics(''), '')
assert.strictEqual(stripDiacritics(null), '')
console.log('"Thi đua tháng 11" -> "thi dua thang 11"; "ĐỈNH" -> "dinh" — dung')

// ── filterMemos: tim khong dau tren title/note/fileName + loc audience ──
console.log('\n=== filterMemos ===')
const SAMPLE = [
  { id: 'a', title: 'Memo 00211/AD/2026 - Thi đua ngắn hạn tháng 11', note: 'Thưởng tiền mặt theo Tổng IP', fileName: 'Memo 00211 - Thang Hang.pdf', audience: ['tvv'], pinned: true, createdAt: 100 },
  { id: 'b', title: 'Memo 00210 - Đỉnh Cao Hiệu Suất Quý 4', note: 'iPhone 18 Pro Max, iPhone Duo', fileName: 'Memo 00210 - Dinh Cao.pdf', audience: ['tvv', 'ql'], pinned: false, createdAt: 300 },
  { id: 'c', title: 'Chính sách thu nhập Leader 2026', note: 'Memo 00601/01901/08608', fileName: 'CSTN_Leader.pdf', audience: ['cstn', 'ql'], pinned: false, createdAt: 200 },
  { id: 'd', title: 'Tài liệu tư vấn khách hàng', note: 'Sổ tay CSKH', fileName: 'so-tay-cskh.pdf', audience: ['kh'], pinned: false, createdAt: 400 },
]
const ids = (arr) => arr.map((m) => m.id)
assert.deepStrictEqual(ids(filterMemos(SAMPLE, { q: 'thi dua' })), ['a'], 'Tim "thi dua" (khong dau) phai ra memo Thi đua')
assert.deepStrictEqual(ids(filterMemos(SAMPLE, { q: 'dinh cao' })), ['b'], 'Tim "dinh cao" phai ra memo Đỉnh Cao')
assert.deepStrictEqual(ids(filterMemos(SAMPLE, { q: 'cskh' })), ['d'], 'Tim theo fileName phai ra memo d')
assert.deepStrictEqual(ids(filterMemos(SAMPLE, { q: 'thu nhap' })), ['c'], 'Tim "thu nhap" phai ra memo c')
assert.deepStrictEqual(ids(filterMemos(SAMPLE, { q: 'khong co dau nay' })), [], 'Tu khoa khong khop -> rong')
assert.strictEqual(filterMemos(SAMPLE, {}).length, 4, 'Khong loc gi -> giu ca 4')
assert.strictEqual(filterMemos(SAMPLE, { audience: 'all' }).length, 4, "audience 'all' -> giu ca 4")
assert.deepStrictEqual(ids(filterMemos(SAMPLE, { audience: 'ql' })).sort(), ['b', 'c'], "Loc 'ql' -> b + c")
assert.deepStrictEqual(ids(filterMemos(SAMPLE, { audience: 'kh' })), ['d'], "Loc 'kh' -> chi d")
assert.deepStrictEqual(ids(filterMemos(SAMPLE, { q: 'memo', audience: 'cstn' })), ['c'], 'Ket hop tu khoa + audience')
console.log('Tim khong dau (title/note/fileName) + loc audience — dung')

// ── sortMemos: ghim truoc, moi truoc, khong sua mang goc ──
console.log('\n=== sortMemos ===')
const sorted = sortMemos(SAMPLE)
assert.deepStrictEqual(ids(sorted), ['a', 'd', 'b', 'c'], 'Ghim (a) truoc; con lai theo createdAt giam dan: d(400) > b(300) > c(200)')
assert.deepStrictEqual(ids(SAMPLE), ['a', 'b', 'c', 'd'], 'Mang goc khong bi doi thu tu')
assert.deepStrictEqual(sortMemos([]), [])
console.log('Pinned truoc + createdAt giam dan — dung')

// ── summaryLines: tach dong, bo rong, trim ──
console.log('\n=== summaryLines ===')
assert.deepStrictEqual(summaryLines('Dong 1\n\n  Dong 2  \n\nDong 3'), ['Dong 1', 'Dong 2', 'Dong 3'])
assert.deepStrictEqual(summaryLines(''), [])
assert.deepStrictEqual(summaryLines(null), [])
assert.deepStrictEqual(summaryLines('\n \n'), [])
console.log('Bo dong rong + trim — dung')

// ── pdfjs-dist da cai (pdfSplit nap bang dynamic import tren trinh duyet) ──
console.log('\n=== pdfjs-dist dependency ===')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
assert.ok(pkg.dependencies && pkg.dependencies['pdfjs-dist'], 'package.json phai co dependency pdfjs-dist')
console.log(`pdfjs-dist = ${pkg.dependencies['pdfjs-dist']} (da khai bao trong package.json)`)
console.log('Luu y: render PDF -> anh can canvas cua trinh duyet nen khong test tu dong bang node duoc.')

console.log('\n✅ TAT CA ASSERT DAT (test-memo)')
