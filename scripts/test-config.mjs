// Test: resolveFirebaseConfig (uu tien fb_config dan tay > config nhung san)
// + isSuperAdmin. Chay bang node, stub localStorage — KHONG in gia tri config.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const { EMBEDDED_FIREBASE_CONFIG, resolveFirebaseConfig, isSuperAdmin } = await import('../src/lib/firebaseConfig.js')

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

console.log('✅ TAT CA ASSERT DAT (test-config)')
