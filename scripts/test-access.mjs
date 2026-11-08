// Test RULES HIEN THI + DOI TEN (Lan chot 08/11/2026) bang cach doc
// file tinh — node khong render duoc JSX nen assert tren noi dung file.
// Chay: node scripts/test-access.mjs
import { readFileSync } from 'node:fs'
import assert from 'node:assert'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const app = read('../src/App.jsx')
const doiNgu = read('../src/components/DoiNgu.jsx')
const memo = read('../src/components/MemoThuVien.jsx')
const html = read('../index.html')
const fsRules = read('../firestore.rules')

// ── Doi ten hien thi ──
console.log('=== doi ten hien thi ===')
assert.ok(app.includes('Trang Chủ'), "App.jsx: nhan tab home phai la 'Trang Chủ'")
assert.ok(app.includes('Tinh Anh'), "App.jsx: nhan tab team phai la 'Tinh Anh'")
assert.ok(app.includes('Prudential Quận 7'), "App.jsx: header phai la 'Prudential Quận 7'")
assert.ok(app.includes('Cùng Học Hỏi – Cùng Phát Triển – Cùng Thành Công'), 'App.jsx: phai co slogan')
assert.ok(html.includes('<title>Prudential Quận 7</title>'), 'index.html: <title> phai la Prudential Quận 7')
assert.ok(!html.includes('Dashboard D07 Mới'), 'index.html: khong con ten cu trong title')
console.log('Trang Chủ / Tinh Anh / Prudential Quận 7 / slogan / title — dung')

// ── Thanh dieu huong loc theo quyen ──
console.log('\n=== tab bar loc theo quyen ===')
assert.ok(app.includes('visibleNav'), 'App.jsx: phai co visibleNav (danh sach tab dang hien)')
assert.ok(app.includes('canViewSalesReport'), 'App.jsx: phai dung canViewSalesReport de loc tab Sales Report')
assert.ok(app.includes('isSuperAdmin'), 'App.jsx: phai dung isSuperAdmin de loc tab Nap')
assert.ok(/n\.id === 'nap'\) return superAdmin/.test(app), 'App.jsx: tab Nap chi hien khi superAdmin')
assert.ok(/n\.id === 'sales'\) return canSR/.test(app), 'App.jsx: tab Sales Report chi hien khi canSR')
assert.ok(app.includes('gridTemplateColumns'), 'App.jsx: so cot tab bar phai theo so tab dang hien')
assert.ok(app.includes("setTab('home')"), 'App.jsx: mat quyen o tab bi an thi tu ve Trang Chu')
console.log('Nap chi Admin thay; Sales Report chi Admin + duoc cap quyen thay; mat quyen -> ve Trang Chu')

// ── DoiNgu: chi mo chi tiet cua chinh minh ──
console.log('\n=== DoiNgu gate chi tiet TVV ===')
assert.ok(doiNgu.includes('Bạn chỉ xem được chi tiết của chính mình (theo MSĐL).'), 'DoiNgu: phai co thong bao chi xem cua chinh minh')
assert.ok(doiNgu.includes('Đăng nhập để xem chi tiết của chính bạn'), 'DoiNgu: phai co thong bao moi dang nhap')
assert.ok(doiNgu.includes('>Bạn<') || doiNgu.includes('Bạn</span>'), "DoiNgu: hang cua chinh minh phai co nhan 'Bạn'")
assert.ok(doiNgu.includes('viewerMsdl'), 'DoiNgu: phai tinh viewerMsdl de doi chieu hang cua minh')
assert.ok(doiNgu.includes('emailToMsdl'), 'DoiNgu: phai suy MSDL tu email tai khoan MSDL')
assert.ok(doiNgu.includes('onOpenLogin'), 'DoiNgu: phai nhan onOpenLogin de mo form dang nhap')
console.log('Chua dang nhap -> moi dang nhap; da dang nhap -> chi mo cua chinh minh (MSDL), nhan Bạn')

// ── Memo: ai cung xem, dang nhap moi tai ──
console.log('\n=== Memo gate tai ve ===')
assert.ok(memo.includes('Đăng nhập để tải về'), "MemoThuVien: chua dang nhap phai hien nut 'Đăng nhập để tải về'")
assert.ok(memo.includes('onOpenLogin'), 'MemoThuVien: phai nhan onOpenLogin')
assert.ok(memo.includes('⬇ Tải về'), 'MemoThuVien: da dang nhap van co nut Tai ve nhu cu')
console.log('Xem public; tai ve can dang nhap')

// ── Rules: memos doc cong khai ──
console.log('\n=== firestore.rules memos ===')
const memoBlock = fsRules.slice(fsRules.indexOf('match /memos/'))
assert.ok(memoBlock.includes('allow read: if true;'), 'firestore.rules: memos phai cho doc cong khai (allow read: if true)')
assert.ok(memoBlock.includes("request.auth.token.email == 'admin@d07.com'"), 'firestore.rules: memos ghi/xoa van chi Admin chinh')
console.log('memos: read public, write chi Admin chinh')

console.log('\n✅ TAT CA ASSERT DAT (test-access)')
