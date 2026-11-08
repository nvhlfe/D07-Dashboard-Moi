// Test: resolveFirebaseConfig (uu tien fb_config dan tay > config nhung san)
// + isSuperAdmin. Chay bang node, stub localStorage — KHONG in gia tri config.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const { EMBEDDED_FIREBASE_CONFIG, resolveFirebaseConfig, isSuperAdmin, msdlToEmail, emailToMsdl, isMsdlAccount, resolveLoginEmail, canViewSalesReport } = await import('../src/lib/firebaseConfig.js')

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1) } console.log('ok -', msg) }

// 1) Chua co fb_config -> dung config nhung san
store.clear()
assert(resolveFirebaseConfig() === EMBEDDED_FIREBASE_CONFIG, 'khong co fb_config -> config nhung san')

// 2) Co fb_config hop le -> uu tien fb_config
const fake = { apiKey: 'FAKE-KEY-FOR-TEST', projectId: 'fake-project-for-test' }
store.set('fb_config', JSON.stringify(fake))
const r2 = resolveFirebaseConfig()
assert(r2.projectId === 'fake-project-for-test' && r2.apiKey === 'FAKE-KEY-FOR-TEST', 'co fb_config -> uu tien config dan tay')

// 3) fb_config hong (khong co apiKey) -> quay ve nhung san
store.set('fb_config', JSON.stringify({ projectId: 'missing-key' }))
assert(resolveFirebaseConfig() === EMBEDDED_FIREBASE_CONFIG, 'fb_config thieu apiKey -> config nhung san')

// 4) fb_config khong parse duoc -> quay ve nhung san, khong crash
store.set('fb_config', '{not json')
assert(resolveFirebaseConfig() === EMBEDDED_FIREBASE_CONFIG, 'fb_config loi JSON -> config nhung san')

// 5) isSuperAdmin
assert(isSuperAdmin({ email: 'admin@d07.com' }) === true, 'admin@d07.com la Admin chinh')
assert(isSuperAdmin({ email: 'Admin@D07.com' }) === true, 'email Admin chinh khong phan biet hoa thuong')
assert(isSuperAdmin({ email: 'tvv@d07.com' }) === false, 'email thuong khong phai Admin chinh')
assert(isSuperAdmin(null) === false, 'chua dang nhap -> khong phai Admin chinh')
assert(isSuperAdmin({}) === false, 'user khong email -> khong phai Admin chinh')

// 6) Tai khoan TVV bang MSDL
assert(msdlToEmail(' 12345678 ') === '12345678@d07.local', 'msdlToEmail: ma so -> email noi bo')
assert(emailToMsdl('12345678@d07.local') === '12345678', 'emailToMsdl: trich lai MSDL')
assert(emailToMsdl('admin@d07.com') === '', 'emailToMsdl: email quan tri -> rong')
assert(isMsdlAccount({ email: '87654321@d07.local' }) === true, 'isMsdlAccount: dung tai khoan MSDL')
assert(isMsdlAccount({ email: 'admin@d07.com' }) === false, 'isMsdlAccount: email thuong -> false')
assert(isMsdlAccount(null) === false, 'isMsdlAccount: chua dang nhap -> false')
assert(resolveLoginEmail('12345678') === '12345678@d07.local', 'resolveLoginEmail: nhap MSDL -> email noi bo')
assert(resolveLoginEmail('Admin@D07.com') === 'Admin@D07.com', 'resolveLoginEmail: nhap email -> giu nguyen')

// 7) Quyen xem Sales Report: Admin chinh luon duoc; TVV chi khi duoc cap quyen
assert(canViewSalesReport({ email: 'admin@d07.com' }, null) === true, 'canViewSalesReport: Admin chinh -> true')
assert(canViewSalesReport({ email: 'tvv@d07.com' }, { canSalesReport: true }) === true, 'canViewSalesReport: duoc cap quyen -> true')
assert(canViewSalesReport({ email: 'tvv@d07.com' }, { canSalesReport: false }) === false, 'canViewSalesReport: bi thu hoi -> false')
assert(canViewSalesReport({ email: 'tvv@d07.com' }, {}) === false, 'canViewSalesReport: chua cap -> false')
assert(canViewSalesReport({ email: 'tvv@d07.com' }, null) === false, 'canViewSalesReport: khong ho so -> false')
assert(canViewSalesReport(null, { canSalesReport: true }) === false, 'canViewSalesReport: chua dang nhap -> false')

console.log('✅ TAT CA ASSERT DAT (test-config)')
