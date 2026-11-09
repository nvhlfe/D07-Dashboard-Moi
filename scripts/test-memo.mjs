// Test lib/memoLib.js (logic thuan thu vien Memo) + kiem tra luong xem
// PDF truc tiep (khong con pdfjs-dist/pdfSplit —
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

// ── Xem PDF truc tiep + anh bia tu dong tu trang 1 ──
// XEM memo van doc PDF goc truc tiep (khung iframe) nhu Lan chot
// 08/11/2026. RIENG anh bia thu vien duoc tao tu trang 1 bang
// pdfjs-dist IMPORT TINH qua lib/pdfCover (KHONG React.lazy/dynamic
// import nhu ban pdfSplit cu bi 404 chunk).
console.log('\n=== xem PDF truc tiep + bia trang 1 (pdfjs tinh) ===')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
assert.ok(pkg.dependencies && pkg.dependencies['pdfjs-dist'], 'package.json CO dependency pdfjs-dist (dung cho tao bia)')
const memoSrc = readFileSync(new URL('../src/components/MemoThuVien.jsx', import.meta.url), 'utf8')
assert.ok(!memoSrc.includes('pdfSplit'), 'MemoThuVien khong con tham chieu pdfSplit')
assert.ok(memoSrc.includes('uploadMemoPdf'), 'MemoThuVien dang bang uploadMemoPdf (chi tai PDF goc)')
assert.ok(memoSrc.includes('memo-pdf-frame'), 'Man hinh chi tiet co khung xem PDF truc tiep')

// pdfCover: module rieng, import tinh, worker qua ?url
const coverSrc = readFileSync(new URL('../src/lib/pdfCover.js', import.meta.url), 'utf8')
assert.ok(coverSrc.includes("from 'pdfjs-dist'"), 'pdfCover import tinh pdfjs-dist')
assert.ok(coverSrc.includes('pdf.worker.min.mjs?url'), 'pdfCover cau hinh worker qua ?url (chuan Vite)')
assert.ok(coverSrc.includes('getDocument'), 'pdfCover dung getDocument de render trang 1')
assert.ok(coverSrc.includes('renderPdfFirstPageToJpegBlob'), 'pdfCover export renderPdfFirstPageToJpegBlob')
assert.ok(memoSrc.includes("from '../lib/pdfCover'"), 'MemoThuVien import tinh pdfCover')
assert.ok(!memoSrc.includes("import('../lib/pdfCover')") && !memoSrc.includes("import('../lib/pdfSplit"), 'MemoThuVien KHONG dynamic-import pdfCover (tranh loi chunk 404 cu)')
console.log('pdfCover import tinh + worker ?url — khong lazy chunk')

// Thu vien: bia uu tien coverUrl truoc pages[0]
assert.ok(memoSrc.includes('m.coverUrl || (Array.isArray(m.pages) && m.pages[0])'), 'The thu vien lay bia = coverUrl || pages[0]')
assert.ok(memoSrc.includes('selected.coverUrl || selected.pages[0]'), 'Chi tiet hien bia = coverUrl || pages[0]')
console.log('Thu vien + chi tiet: coverUrl uu tien truoc pages[0]')

// Luong dang: sau khi upload PDF + tao doc thi moi tao bia tu File goc
const iUpload = memoSrc.indexOf('uploadMemoPdf(memoId, pdfFile)')
const iDoc = memoSrc.indexOf('createMemoDoc({')
const iCoverRender = memoSrc.indexOf('renderPdfFirstPageToJpegBlob(pdfFile)')
assert.ok(iUpload > -1 && iDoc > iUpload, 'Dang: upload PDF truoc, tao doc sau')
assert.ok(iCoverRender > iDoc, 'Dang: tao bia SAU khi tao doc thanh cong')
assert.ok(memoSrc.includes('uploadMemoCover(memoId, coverBlob)'), 'Dang: upload bia bang uploadMemoCover')
assert.ok(memoSrc.includes('setMemoCoverUrl(memoId, upCover.coverUrl)'), 'Dang: ghi coverUrl vao doc sau khi upload bia')
console.log('Luong dang: upload PDF -> tao doc -> render trang 1 -> upload cover -> ghi coverUrl')

// Chi tiet: Admin mo memo thieu bia -> tu bo sung bia 1 lan qua SDK
assert.ok(memoSrc.includes('fetchMemoPdfBlob(selected.id)'), 'Chi tiet lay PDF goc qua fetchMemoPdfBlob (Storage SDK, tranh CORS)')
assert.ok(memoSrc.includes('coverTriedRef'), 'Chi tiet chi thu tao bia 1 lan/memo (coverTriedRef)')
assert.ok(memoSrc.includes('uploadMemoCover(selected.id, coverBlob)'), 'Chi tiet upload bia bang uploadMemoCover')
assert.ok(memoSrc.includes('setMemoCoverUrl(selected.id, up.coverUrl)'), 'Chi tiet ghi coverUrl vao doc')
console.log('Chi tiet: tu bo sung bia cho memo cu thieu coverUrl (chi Admin kich hoat)')

// store: du cac ham bia + xoa memo don ca cover.jpg
const storeSrc = readFileSync(new URL('../src/lib/store.js', import.meta.url), 'utf8')
assert.ok(storeSrc.includes('export async function uploadMemoCover'), 'store co uploadMemoCover')
assert.ok(storeSrc.includes('memos/${memoId}/cover.jpg'), 'uploadMemoCover ghi vao memos/{id}/cover.jpg')
assert.ok(storeSrc.includes('export async function setMemoCoverUrl'), 'store co setMemoCoverUrl')
assert.ok(storeSrc.includes('export async function fetchMemoPdfBlob'), 'store co fetchMemoPdfBlob')
assert.ok(storeSrc.includes('getBlob'), 'fetchMemoPdfBlob dung getBlob cua Storage SDK')
assert.ok(storeSrc.includes('memos/${memo.id}/cover.jpg'), 'deleteMemoEverywhere xoa ca memos/{id}/cover.jpg')
console.log('store: uploadMemoCover/setMemoCoverUrl/fetchMemoPdfBlob + xoa memo don cover.jpg')

console.log('\n✅ TAT CA ASSERT DAT (test-memo)')
