// Test dot LOGO D07 + AVATAR + TRANG CA NHAN TVV (Lan yeu cau 08/11/2026)
// bang cach doc file tinh — node khong render duoc JSX nen assert tren
// noi dung file, cung pattern test-access/test-memo.
// Chay: node scripts/test-me.mjs
import { readFileSync, existsSync, statSync } from 'node:fs'
import assert from 'node:assert'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const app = read('../src/App.jsx')
const caNhan = read('../src/components/CaNhan.jsx')
const store = read('../src/lib/store.js')
const storageRules = read('../storage.rules')
const html = read('../index.html')

// ── Phan 1: Logo D07 thay logo "P" — nhung base64 trong src/lib/logoData.js
// (cong cu push GitHub chi nhan file text nen khong dung public/*.png duoc)
console.log('=== logo D07 ===')
const logoData = read('../src/lib/logoData.js')
assert.ok(app.includes('LOGO_D07'), 'App.jsx: header phai dung LOGO_D07 nhung san')
assert.ok(app.includes('className="logo-img"'), 'App.jsx: img logo phai co class logo-img')
assert.ok(!app.includes('logo-mark'), 'App.jsx: khong con khoi logo-mark chu P')
assert.ok(!html.includes('/logo-d07.png'), 'index.html: khong con tro file logo ngoai (favicon gan bang JS)')
assert.ok(logoData.includes('data:image/png;base64'), 'logoData.js: phai chua data URI PNG base64')
const logoDataSize = statSync(new URL('../src/lib/logoData.js', import.meta.url)).size
assert.ok(logoDataSize > 0 && logoDataSize < 90 * 1024, `logoData.js phai < 90KB (hien ${logoDataSize} bytes)`)
console.log(`Logo: App dung LOGO_D07 nhung trong logoData.js, file ${logoDataSize} bytes (<90KB)`)

// ── Phan 2: Avatar TVV ──
console.log('\n=== avatar TVV ===')
assert.ok(store.includes('uploadAvatar'), 'store.js: phai co ham uploadAvatar')
assert.ok(store.includes('avatars/'), 'store.js: avatar phai tai len Storage path avatars/')
assert.ok(store.includes('avatarUrl'), 'store.js: phai ghi truong avatarUrl vao user_profiles')
assert.ok(storageRules.includes('/avatars/'), 'storage.rules: phai co match avatars')
assert.ok(storageRules.includes('request.auth.uid == userId'), 'storage.rules: chi chinh user moi ghi avatar cua minh')
console.log('uploadAvatar nen canvas -> avatars/{uid}.jpg; rules: doc public, ghi chi chinh chu')

// ── Phan 3: Trang ca nhan TVV (tab me) ──
console.log('\n=== trang ca nhan TVV ===')
assert.ok(app.includes("id: 'me'"), "App.jsx: NAV phai co tab 'me'")
assert.ok(app.includes('Của tôi'), "App.jsx: nhan tab me phai la 'Của tôi'")
assert.ok(app.includes('isMsdlAccount'), 'App.jsx: dieu kien tab me phai dua tren isMsdlAccount')
assert.ok(/n\.id === 'me'\) return showMeTab/.test(app), 'App.jsx: tab me chi hien khi showMeTab (MSDL, khong phai Admin chinh)')
assert.ok(app.includes('jumpedUidRef'), 'App.jsx: phai co ref ghi uid da tu nhay trang (chi nhay 1 lan / lan dang nhap)')
assert.ok(app.includes("setTab('me')"), "App.jsx: TVV dang nhap xong (da duyet) phai tu nhay sang tab 'me'")
assert.ok(app.includes('CaNhan'), 'App.jsx: phai render component CaNhan')
assert.ok(caNhan.includes('✅ Phát hành'), 'CaNhan: phai co nhom ho so Phat hanh')
assert.ok(caNhan.includes('⏳ Pending'), 'CaNhan: phai co nhom ho so Pending')
assert.ok(caNhan.includes('🌱 Chưa lên phí'), 'CaNhan: phai co nhom ho so Chua len phi')
assert.ok(caNhan.includes('Đổi ảnh'), "CaNhan: phai co nut 'Đổi ảnh' (avatar)")
assert.ok(caNhan.includes('uploadAvatar'), 'CaNhan: doi anh phai goi uploadAvatar cua store')
assert.ok(caNhan.includes('groupValue'), 'CaNhan: gia tri ho so phai tinh bang groupValue nhu cac man khac')
assert.ok(caNhan.includes('viewerMsdl'), 'CaNhan: phai doi chieu viewerMsdl cua chinh user dang dang nhap')
console.log('Tab me chi cho TVV MSDL (khong Admin chinh); tu nhay 1 lan khi dang nhap; 3 nhom ho so + Doi anh')

console.log('\n✅ TAT CA ASSERT DAT (test-me)')
