// Test lib/memoLib.js (logic thuan thu vien Memo) + kiem tra luong
// dang PDF -> TU TACH TUNG TRANG thanh anh, nut Sua, panel tom tat
// khong bia (assert tinh tren source; node khong co canvas nen
// KHONG render PDF o day — render that kiem chung rieng bang
// pdfjs + @napi-rs/canvas tren PDF memo that).
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

// ── Dang PDF -> TU TACH TUNG TRANG thanh anh (cach cu, Lan chot
// quay ve 09/11/2026) + nut Sua + panel tom tat khong con bia ──
// Dang: chi nhan PDF goc (uploadMemoPdf); ngay sau khi tao doc,
// pdfjs IMPORT TINH (lib/pdfCover) render MOI trang thanh JPEG
// 1000px/0.82, tai tung trang page-{i}.jpg, ghi pages[] + coverUrl
// (= trang 1) qua setMemoPages. Tran 50 trang; loi tach trang KHONG
// chan dang. Memo cu chua co pages[]: Admin mo chi tiet -> tu tach
// lai 1 lan/phien (thay co che tu tao bia cu). Kieu dang bang NHIEU
// ANH (sourceType 'images') da GO.
console.log('\n=== dang PDF + tu tach trang anh (pdfjs tinh) ===')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
assert.ok(pkg.dependencies && pkg.dependencies['pdfjs-dist'], 'package.json CO dependency pdfjs-dist (dung cho tach trang/bia)')
const memoSrc = readFileSync(new URL('../src/components/MemoThuVien.jsx', import.meta.url), 'utf8')
assert.ok(!memoSrc.includes('pdfSplit'), 'MemoThuVien khong con tham chieu pdfSplit')
assert.ok(memoSrc.includes('uploadMemoPdf'), 'MemoThuVien dang bang uploadMemoPdf (chi tai PDF goc)')
assert.ok(memoSrc.includes('memo-pdf-frame'), 'Chi tiet van giu khung iframe PDF (du phong khi chua/khong tach duoc trang)')

// pdfCover: module rieng, import tinh, worker qua ?url, du 2 ham render
const coverSrc = readFileSync(new URL('../src/lib/pdfCover.js', import.meta.url), 'utf8')
assert.ok(coverSrc.includes("from 'pdfjs-dist'"), 'pdfCover import tinh pdfjs-dist')
assert.ok(coverSrc.includes('pdf.worker.min.mjs?url'), 'pdfCover cau hinh worker qua ?url (chuan Vite)')
assert.ok(coverSrc.includes('getDocument'), 'pdfCover dung getDocument de render')
assert.ok(coverSrc.includes('renderPdfFirstPageToJpegBlob'), 'pdfCover van export renderPdfFirstPageToJpegBlob (giu nguyen)')
assert.ok(coverSrc.includes('export async function renderPdfAllPagesToJpegBlobs'), 'pdfCover export renderPdfAllPagesToJpegBlobs (render MOI trang)')
assert.ok(coverSrc.includes('export const MEMO_MAX_SPLIT_PAGES = 50'), 'Tran tach trang = 50 trang')
assert.ok(coverSrc.includes('const PAGE_WIDTH = 1000') && coverSrc.includes('const PAGE_QUALITY = 0.82'), 'Trang anh: rong 1000px, JPEG quality 0.82')
assert.ok(coverSrc.includes('tooManyPages: true'), 'PDF hon tran -> tra tooManyPages, bo qua tach trang')
assert.ok(memoSrc.includes("from '../lib/pdfCover'"), 'MemoThuVien import tinh pdfCover')
assert.ok(!memoSrc.includes("import('../lib/pdfCover')") && !memoSrc.includes("import('../lib/pdfSplit"), 'MemoThuVien KHONG dynamic-import pdfCover (tranh loi chunk 404 cu)')
console.log('pdfCover import tinh + worker ?url; render all pages 1000px/0.82, tran 50 trang')

// GO kieu dang bang NHIEU ANH (dot truoc bi loi tren may Lan)
assert.ok(!memoSrc.includes('🖼 Nhiều ảnh'), 'Form dang KHONG con kieu "Nhieu anh"')
assert.ok(!memoSrc.includes('compressMemoImage'), 'Da go compressMemoImage (nen anh thu cong)')
assert.ok(!memoSrc.includes('MEMO_MAX_IMAGES'), 'Da go gioi han anh dang thu cong')
assert.ok(!memoSrc.includes('handlePickImages'), 'Da go handlePickImages (input multiple)')
assert.ok(!memoSrc.includes("sourceType: 'images'"), "Khong con tao doc sourceType 'images'")
assert.ok(memoSrc.includes("sourceType: 'pdf'"), "Doc moi ghi sourceType: 'pdf'")
assert.ok(memoSrc.includes('＋ Đăng memo'), 'Nut mo form giu nhan "＋ Đăng memo"')
console.log('Form chi con 1 kieu nguon: file PDF; da go han luong anh thu cong')

// Luong dang PDF: upload PDF -> tao doc -> tach moi trang -> ghi pages.
const iUpload = memoSrc.indexOf('uploadMemoPdf(memoId, pdfFile)')
const iDoc = memoSrc.indexOf('createMemoDoc({', iUpload)
const iSplit = memoSrc.indexOf('splitAndUploadPages(memoId, pdfFile, setBusy)', iDoc)
assert.ok(iUpload > -1 && iDoc > iUpload, 'Dang: upload PDF truoc, tao doc sau')
assert.ok(iSplit > iDoc, 'Dang: tach trang SAU khi tao doc thanh cong')
assert.ok(memoSrc.includes('renderPdfAllPagesToJpegBlobs(source, {'), 'splitAndUploadPages render moi trang bang renderPdfAllPagesToJpegBlobs')
assert.ok(memoSrc.includes('Đang tách trang ${i}/${n}'), 'Tien trinh tach: "Dang tach trang i/n"')
assert.ok(memoSrc.includes('Đang tải trang ${i + 1}/${blobs.length}'), 'Tien trinh tai: "Dang tai trang i/n"')
assert.ok(memoSrc.includes('uploadMemoPageImage(memoId, i + 1, blobs[i])'), 'Tai tung trang theo thu tu bang uploadMemoPageImage')
assert.ok(memoSrc.includes('setMemoPages(memoId, { pages: urls, pagePaths: paths, pageCount: urls.length, coverUrl: urls[0] })'), 'Ghi pages[]/pagePaths/pageCount/coverUrl (= trang 1) qua setMemoPages')
assert.ok(memoSrc.includes('cleanupMemoFiles(paths)'), 'Tach/tai loi giua chung -> don cac trang da lo tai (cleanupMemoFiles)')
console.log('Luong dang: upload PDF -> tao doc -> tach moi trang -> tai page-{i}.jpg -> setMemoPages (coverUrl = trang 1)')

// Loi tach trang / tran trang KHONG chan viec dang
assert.ok(memoSrc.includes('nhưng chưa tách được trang ảnh — mở memo bằng tài khoản Admin, hệ thống sẽ tự tách lại'), 'Tach loi: van bao dang thanh cong + noi ro Admin mo memo se tu tach lai')
assert.ok(memoSrc.includes('hơn ${MEMO_MAX_SPLIT_PAGES} trang'), 'PDF hon 50 trang: bao ro chua tach anh, van dang xong')
console.log('Loi/tran tach trang khong chan dang — thong bao ro trong ket qua dang')

// Chi tiet: uu tien xem ANH TUNG TRANG (pages[]) truoc iframe PDF
const iPagesView = memoSrc.indexOf('selected.pages.map((url, i)')
const iIframe = memoSrc.indexOf('memo-pdf-frame')
assert.ok(iPagesView > -1 && iIframe > iPagesView, 'Chi tiet: nhanh pages[] (anh tung trang) dung truoc nhanh iframe PDF')
assert.ok(memoSrc.includes('m.coverUrl || (Array.isArray(m.pages) && m.pages[0])'), 'The thu vien lay bia = coverUrl || pages[0] (bia CHI con o thu vien)')
console.log('Chi tiet uu tien pages[]; thu vien giu bia coverUrl/pages[0]')

// TU TACH TRANG cho memo cu chua co pages (thay co che tu tao bia cu)
assert.ok(memoSrc.includes('splitTriedRef'), 'Chi tiet chi thu tach trang 1 lan/memo/phien (splitTriedRef)')
assert.ok(memoSrc.includes('fetchMemoPdfBlob(selected.id)'), 'Tu tach: lay PDF goc qua fetchMemoPdfBlob (Storage SDK, tranh CORS)')
assert.ok(memoSrc.includes('splitAndUploadPages(selected.id, pdfBlob'), 'Tu tach: dung chung splitAndUploadPages nhu luong dang')
assert.ok(memoSrc.includes('hasPages'), 'Tu tach chi chay khi memo CHUA co pages[] (memo co coverUrl nhung chua co pages van duoc tach)')
assert.ok(!memoSrc.includes('coverTriedRef'), 'Da GO co che tu tao bia cu (coverTriedRef)')
assert.ok(!memoSrc.includes('uploadMemoCover('), 'Component khong con goi uploadMemoCover')
assert.ok(!memoSrc.includes('setMemoCoverUrl('), 'Component khong con goi setMemoCoverUrl')
assert.ok(!memoSrc.includes('renderPdfFirstPageToJpegBlob'), 'Component khong con render rieng trang 1 de lam bia (bia = trang 1 cua luong tach trang)')
console.log('Chi tiet: Admin mo memo chua co pages -> tu tach trang 1 lan/phien; da go co che bia cu')

// Panel tom tat KHONG con anh bia (trung voi trang 1 o cot noi dung)
const cssSrc = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
assert.ok(!memoSrc.includes('memo-detail-cover'), 'Panel tom tat khong con render anh bia (memo-detail-cover)')
assert.ok(!cssSrc.includes('.memo-detail-cover'), 'CSS khong con class .memo-detail-cover (thua)')
assert.ok(!cssSrc.includes('.memo-img-list'), 'CSS khong con class .memo-img-list cua form anh cu (thua)')
console.log('Panel tom tat: da bo anh bia — bia chi con o the thu vien')

// Nut SUA memo (chi Admin) + nut Xoa trong chi tiet
assert.ok(memoSrc.includes('✏️ Sửa') && memoSrc.includes('onClick={openEdit}'), 'Chi tiet co nut "✏️ Sửa" mo form sua')
assert.ok(memoSrc.includes('🗑 Xoá'), 'Chi tiet co nut Xoa canh nut Sua (dung chung handleDelete)')
assert.ok(memoSrc.includes('updateMemoDoc(selected.id, fields)'), 'Luu sua qua updateMemoDoc')
for (const field of ['title:', 'note:', 'summary:', 'warnings:', 'audience:', 'pinned:']) {
  assert.ok(memoSrc.includes(field), `Form sua phai gom truong ${field}`)
}
assert.ok(memoSrc.includes('editFormFrom(selected)'), 'Form sua khoi tao tu doc memo dang xem (khong co truong file)')
console.log('Nut Sua (gate Admin qua isSuperAdmin nhu cac nut quan tri) sua 6 truong chu: title/note/audience/pinned/summary/warnings — khong doi file')

// store: du cac ham tach trang + sua + xoa sach
const storeSrc = readFileSync(new URL('../src/lib/store.js', import.meta.url), 'utf8')
assert.ok(storeSrc.includes('export async function setMemoPages'), 'store co setMemoPages')
assert.ok(storeSrc.includes('pagePaths: Array.isArray(pagePaths) ? pagePaths : []'), 'setMemoPages ghi ca pagePaths')
assert.ok(storeSrc.includes('export async function updateMemoDoc'), 'store co updateMemoDoc')
assert.ok(storeSrc.includes('updateDoc') && storeSrc.includes('updateDoc(doc(fs, \'memos\', memoId), fields)'), 'updateMemoDoc dung updateDoc dung doc memos/{id} (giu nguyen file/trang anh)')
assert.ok(storeSrc.includes('export async function uploadMemoPageImage'), 'store co uploadMemoPageImage')
assert.ok(storeSrc.includes('memos/${memoId}/page-${index}.jpg'), 'uploadMemoPageImage ghi vao memos/{id}/page-{index}.jpg')
assert.ok(storeSrc.includes('export async function cleanupMemoFiles'), 'store co cleanupMemoFiles (don file khi tach trang loi)')
assert.ok(storeSrc.includes('export async function fetchMemoPdfBlob'), 'store co fetchMemoPdfBlob')
assert.ok(storeSrc.includes('getBlob'), 'fetchMemoPdfBlob dung getBlob cua Storage SDK')
assert.ok(storeSrc.includes('listAll'), 'deleteMemoEverywhere liet ke toan bo file duoi memos/{id}/ bang listAll')
assert.ok(storeSrc.includes('`memos/${memo.id}/page-${i}.jpg`'), 'deleteMemoEverywhere: du phong dung path page-{i}.jpg tu pageCount khi listAll khong chay')
assert.ok(storeSrc.includes('memos/${memo.id}/cover.jpg'), 'deleteMemoEverywhere xoa ca memos/{id}/cover.jpg')
console.log('store: setMemoPages/updateMemoDoc/uploadMemoPageImage/cleanupMemoFiles/fetchMemoPdfBlob + xoa memo don sach bang listAll + du phong')

console.log('\n✅ TAT CA ASSERT DAT (test-memo)')
