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

// Luong dang PDF: sau khi upload PDF + tao doc thi moi tao bia tu File
// goc. Khoanh vung tim kiem TU vi tri upload PDF tro di (createMemoDoc
// con xuat hien o nhanh dang bang anh nam truoc trong file).
const iUpload = memoSrc.indexOf('uploadMemoPdf(memoId, pdfFile)')
const iDoc = memoSrc.indexOf('createMemoDoc({', iUpload)
const iCoverRender = memoSrc.indexOf('renderPdfFirstPageToJpegBlob(pdfFile)', iDoc)
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

// ── Dang memo bang NHIEU ANH (sourceType 'images') — Lan yeu cau
// 09/11/2026 vi xem PDF hoi phuc tap: chon nhieu anh trang cung luc,
// nen JPEG <=1200px phia client, tai tung anh page-{i}.jpg, doc luu
// pages[] + coverUrl = anh dau, khong co pdfUrl (an nut Tai ve PDF).
console.log('\n=== dang memo bang NHIEU ANH (sourceType images) ===')
assert.ok(memoSrc.includes('📄 File PDF') && memoSrc.includes('🖼 Nhiều ảnh'), 'Form dang phai co 2 kieu nguon: File PDF / Nhieu anh (segmented)')
assert.ok(memoSrc.includes("sourceType === 'images'"), 'Form + luong dang phai re nhanh theo sourceType images')
assert.ok(memoSrc.includes('multiple onChange={handlePickImages}'), 'Input anh phai cho chon NHIEU file cung luc (multiple)')
assert.ok(memoSrc.includes('accept="image/*"'), 'Input anh chi nhan file anh (accept image/*)')
assert.ok(memoSrc.includes('MEMO_MAX_IMAGES = 30'), 'Gioi han toi da 30 anh/memo')
assert.ok(memoSrc.includes('MEMO_MAX_IMAGE_BYTES = 15 * 1024 * 1024'), 'Gioi han moi anh toi da 15MB')
assert.ok(memoSrc.includes('Ảnh “${tooBig.name}” lớn hơn 15MB'), 'Anh vuot 15MB phai bao ro TEN file')
assert.ok(memoSrc.includes('Trang {i + 1}: {f.name}'), 'Form phai liet ke anh da chon kem so thu tu trang de Admin doi chieu')
assert.ok(memoSrc.includes('compressMemoImage'), 'Phai co buoc nen anh phia trinh duyet truoc khi tai')
assert.ok(memoSrc.includes('1200 / nw') && memoSrc.includes("canvas.toBlob((b) => resolve(b || null), 'image/jpeg', 0.8)"), 'Nen anh: canvas rong toi da 1200px, xuat JPEG quality 0.8')
assert.ok(memoSrc.includes('Đang tải ảnh ${i + 1}/${n}'), 'Khi dang anh phai hien tien trinh "Dang tai anh i/n"')
assert.ok(memoSrc.includes('uploadMemoPageImage(memoId, i + 1, blob)'), 'Tai tung anh theo thu tu trang bang uploadMemoPageImage')
assert.ok(memoSrc.includes('cleanupMemoFiles(paths)'), 'Anh loi giua chung -> don cac file da lo tai (cleanupMemoFiles), khong tao doc')
assert.ok(memoSrc.includes("sourceType: 'images'"), "Doc memo kieu anh phai ghi sourceType: 'images'")
assert.ok(memoSrc.includes("sourceType: 'pdf'"), "Doc memo kieu PDF phai ghi sourceType: 'pdf' (doc cu khong co truong nay -> mac dinh pdf)")
assert.ok(memoSrc.includes('coverUrl: urls[0]'), 'Memo anh: coverUrl = anh trang dau tien (pages[0])')
assert.ok(memoSrc.includes('pages: urls') && memoSrc.includes('pageCount: n'), 'Memo anh: doc luu pages[] theo thu tu + pageCount = so anh')
assert.ok(memoSrc.includes("pdfUrl: '',"), 'Memo anh: pdfUrl rong -> nut Tai ve PDF tu an (chi hien khi co pdfUrl)')
assert.ok(storeSrc.includes('export async function uploadMemoPageImage'), 'store phai co uploadMemoPageImage')
assert.ok(storeSrc.includes('memos/${memoId}/page-${index}.jpg'), 'uploadMemoPageImage ghi vao memos/{id}/page-{index}.jpg')
assert.ok(storeSrc.includes('export async function cleanupMemoFiles'), 'store phai co cleanupMemoFiles (don file khi dang anh loi)')
assert.ok(storeSrc.includes('listAll'), 'deleteMemoEverywhere phai liet ke toan bo file duoi memos/{id}/ bang listAll')
assert.ok(storeSrc.includes('`memos/${memo.id}/page-${i}.jpg`'), 'deleteMemoEverywhere: du phong dung path page-{i}.jpg tu pageCount khi listAll khong chay')
console.log('Form 2 kieu nguon; anh: <=30 file, <=15MB/file, nen 1200px JPEG 0.8, tai page-{i}.jpg theo thu tu, loi -> dung + don file; doc images co pages/coverUrl, khong pdfUrl; xoa memo don sach bang listAll + du phong')

console.log('\n✅ TAT CA ASSERT DAT (test-memo)')
