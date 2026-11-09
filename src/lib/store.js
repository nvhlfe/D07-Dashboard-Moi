// ─────────────────────────────────────────────────────────────
// store.js — Luu tru cho Dashboard D07 Moi.
//  - localStorage: snapshots gan nhat (d07moi_snapshots), lich su nap
//    (d07moi_history), muc tieu thang (d07moi_target_{yyyy-m}),
//    cau hinh Firebase cua nguoi dung (fb_config — cung key voi ban cu).
//  - Firestore (neu da cau hinh fb_config): collection daily_sales_tvv/{yyyy-mm-dd},
//    cung shape voi saveDailySalesDoc cua ban cu.
// App LUON chay duoc chi bang localStorage (offline/demo) khi chua co Firebase.
// ─────────────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, collection, setDoc, getDoc, getDocs, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { resolveFirebaseConfig } from './firebaseConfig'

export const SNAP_KEY = 'd07moi_snapshots'
export const HIST_KEY = 'd07moi_history'
export const FB_KEY = 'fb_config'
export const ADJ_KEY = 'd07moi_adjustments'
export const AUDIT_KEY = 'd07moi_audit'
export const USER_NAME_KEY = 'd07moi_user_name'
export const targetKey = (year, month) => `d07moi_target_${year}-${month}`
const MAX_SNAPSHOTS = 40

// ── Snapshots local ──────────────────────────────────────────
export function loadLocalSnapshots() {
  try {
    const raw = localStorage.getItem(SNAP_KEY)
    if (!raw) return []
    const obj = JSON.parse(raw)
    return Object.values(obj)
      .filter((s) => s && s.date && s.data)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((s) => ({ id: s.date, data: s.data, savedAt: s.savedAt || null }))
  } catch { return [] }
}

// mergeSnapshots nam o module thuan rieng (snapMerge.js) de test bang node
// duoc; re-export tai day cho cac noi dang import tu store.
export { mergeSnapshots } from './snapMerge.js'

export function saveLocalSnapshot(date, fileName, data) {
  let obj = {}
  try { obj = JSON.parse(localStorage.getItem(SNAP_KEY) || '{}') } catch { obj = {} }
  obj[date] = { date, fileName: fileName || '', savedAt: new Date().toISOString(), data }
  // Giu toi da MAX_SNAPSHOTS snapshot moi nhat (theo ngay du lieu)
  const dates = Object.keys(obj).sort()
  while (dates.length > MAX_SNAPSHOTS) { const d = dates.shift(); delete obj[d] }
  // localStorage co gioi han ~5MB: neu tran, bo bot snapshot cu nhat cho den khi ghi duoc
  for (;;) {
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(obj)); return { ok: true, kept: Object.keys(obj).length } }
    catch (e) {
      const ks = Object.keys(obj).sort()
      if (ks.length <= 1) return { ok: false, kept: 0, error: 'localStorage đầy — snapshot chỉ lưu trên Firebase (nếu đã kết nối).' }
      delete obj[ks[0]]
    }
  }
}

// ── Lich su nap ──────────────────────────────────────────────
export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]') } catch { return [] }
}
export function addHistory(entry) {
  const list = loadHistory()
  list.unshift(entry)
  try { localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 60))) } catch { /* bo qua neu tran */ }
  return list
}

// ── Muc tieu thang (trieu VND) ───────────────────────────────
export function getTarget(year, month) {
  try {
    const v = localStorage.getItem(targetKey(year, month))
    const n = v === null ? null : Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch { return null }
}
export function setTarget(year, month, value) {
  try {
    if (value === null || value === undefined || value === '' || !(Number(value) > 0)) localStorage.removeItem(targetKey(year, month))
    else localStorage.setItem(targetKey(year, month), String(Number(value)))
  } catch { /* bo qua */ }
}

// ── Firebase config ───────────────────────────────────────────
// Mac dinh dung cau hinh D07 NHUNG SAN (lib/firebaseConfig.js) de app chay
// tren moi thiet bi khong can dan config. Nguoi dung van co the dan config
// khac (luu o fb_config nhu ban cu) — config dan tay duoc UU TIEN hon.
export function getFbOverride() {
  try {
    const raw = localStorage.getItem(FB_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw)
    return cfg && cfg.apiKey ? cfg : null
  } catch { return null }
}
export function getFbConfig() {
  return resolveFirebaseConfig()
}
export function setFbConfig(cfg) {
  try { localStorage.setItem(FB_KEY, JSON.stringify(cfg)) } catch { /* bo qua */ }
  _fb = null // buoc init lai voi config moi
}
export function clearFbConfig() {
  try { localStorage.removeItem(FB_KEY) } catch { /* bo qua */ }
  _fb = null
}
/** Parse block firebaseConfig dan vao (cung cach cua ban cu). Tra ve object hoac null. */
export function parseFirebaseConfigPaste(text) {
  try {
    const match = String(text || '').match(/\{[\s\S]*\}/)
    if (!match) return null
    const cleaned = match[0]
      .replace(/\/\/.*$/gm, '')
      .replace(/(\w+):/g, '"$1":')
      .replace(/'/g, '"')
    const parsed = JSON.parse(cleaned)
    return parsed && parsed.apiKey ? parsed : null
  } catch { return null }
}

// ── Firebase singleton — 1 app instance dung chung cho Firestore va Auth ──
let _fb = null
export function getFirebaseApp() {
  const cfg = getFbConfig()
  if (!cfg) return null
  if (_fb && _fb.projectId === cfg.projectId) return _fb.app
  try {
    const existing = getApps().find((a) => a.options && a.options.projectId === cfg.projectId)
    const app = existing || initializeApp(cfg)
    _fb = { projectId: cfg.projectId, app, fs: getFirestore(app) }
    return _fb.app
  } catch (e) {
    console.error('[store] Firebase init failed:', e)
    return null
  }
}
export function getFirebaseFs() {
  const app = getFirebaseApp()
  return app ? _fb.fs : null
}

/**
 * Luu doc daily_sales_tvv/{ymd} — cung shape saveDailySalesDoc ban cu.
 * Tra { ok } de UI bao dung trang thai dong bo (khong throw nua).
 * Luu y: Rules chi cho user DA DANG NHAP ghi — chua dang nhap se ok:false.
 */
export async function saveDailyToFirestore(ymd, payload, updatedBy = null) {
  const fs = getFirebaseFs()
  if (!fs) return { ok: false, reason: 'no-config' }
  try {
    const updatedAt = new Date().toISOString()
    await setDoc(doc(fs, 'daily_sales_tvv', ymd), { ...payload, updatedAt, updatedBy })
    return { ok: true, updatedAt }
  } catch (e) {
    console.warn('[store] saveDailyToFirestore:', e)
    return { ok: false, reason: e?.code || 'remote-error' }
  }
}

/**
 * Doc cac doc daily_sales_tvv can cho man Hinh Hom Nay:
 * moi nhat tong the, moi nhat cua thang truoc (cho tru CF lien thang).
 * Tra ve [{id, data}] sap xep tang dan theo ngay, hoac null neu khong dung duoc Firebase.
 */
export async function fetchFirestoreSnapshots() {
  const fs = getFirebaseFs()
  if (!fs) return null
  try {
    const snap = await getDocs(collection(fs, 'daily_sales_tvv'))
    const ids = []
    snap.forEach((d) => ids.push(d.id))
    ids.sort()
    if (!ids.length) return []
    const wanted = new Set()
    const newest = ids[ids.length - 1]
    wanted.add(newest)
    // snapshot truoc do (cho delta) — uu tien cung thang
    if (ids.length > 1) wanted.add(ids[ids.length - 2])
    // doc moi nhat cua thang truoc thang cua doc moi nhat (cho CF lien thang)
    const [y, m] = newest.split('-').map(Number)
    const pm = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
    const p = (n) => String(n).padStart(2, '0')
    const prevMonthIds = ids.filter((id) => id.startsWith(`${pm.y}-${p(pm.m)}-`))
    if (prevMonthIds.length) wanted.add(prevMonthIds[prevMonthIds.length - 1])
    const out = []
    for (const id of [...wanted].sort()) {
      const d = await getDoc(doc(fs, 'daily_sales_tvv', id))
      if (d.exists()) out.push({ id, data: d.data(), savedAt: d.data().updatedAt || null })
    }
    return out
  } catch (e) {
    console.error('[store] fetchFirestoreSnapshots:', e)
    return null
  }
}

// ── Lop DIEU CHINH ho so (Sales Report) ──────────────────────
// adjustments: { [proposalNum]: { status, ipNet, note, updatedAt, updatedBy } }
// audit: [{ ts, proposalNum, changes, by }] — moi nhat truoc, toi da 200 muc.
// Luu local la chinh; Firestore (case_adjustments + audit_log) chi best-effort
// khi da co fb_config — loi thi bo qua, khong chan UI.
export function loadAdjustments() {
  try {
    const obj = JSON.parse(localStorage.getItem(ADJ_KEY) || '{}')
    return obj && typeof obj === 'object' ? obj : {}
  } catch { return {} }
}
export function loadAudit() {
  try {
    const arr = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
export function getUserName() {
  try { return localStorage.getItem(USER_NAME_KEY) || '' } catch { return '' }
}
export function setUserName(name) {
  try {
    if (name) localStorage.setItem(USER_NAME_KEY, String(name))
    else localStorage.removeItem(USER_NAME_KEY)
  } catch { /* bo qua */ }
}
/**
 * Ghi 1 dieu chinh xuong local (adjustments + audit) va tra { adjustments, audit }.
 * adj: { status, ipNet, note } (truong nao khong doi thi de null/undefined).
 * changes: mo ta thay doi dang { field: { from, to } } de ghi audit.
 */
export function saveAdjustmentLocal(proposalNum, adj, changes, by) {
  const ts = new Date().toISOString()
  const adjustments = loadAdjustments()
  adjustments[proposalNum] = { ...adj, updatedAt: ts, updatedBy: by }
  try { localStorage.setItem(ADJ_KEY, JSON.stringify(adjustments)) } catch { /* tran quota: van tra state trong RAM */ }
  const audit = loadAudit()
  audit.unshift({ ts, proposalNum, changes, by })
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(audit.slice(0, 200))) } catch { /* bo qua */ }
  return { adjustments, audit: audit.slice(0, 200) }
}
// ── Ho so ca nhan (ca nhan hoa tung TVV) ─────────────────────
// Firestore user_profiles/{uid} {email, displayName, msdl, updatedAt} +
// cache localStorage 'd07moi_profile' theo uid (luon ghi cache truoc).
// Rules cho user_profiles can Lan publish ban firestore.rules moi —
// chua publish thi ghi may se loi: UI bao "da luu tren may nay".
export const PROFILE_KEY = 'd07moi_profile'
export function loadCachedProfile(uid) {
  if (!uid) return null
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
    return all && all[uid] ? all[uid] : null
  } catch { return null }
}
export function cacheProfile(uid, profile) {
  if (!uid || !profile) return
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
    all[uid] = profile
    localStorage.setItem(PROFILE_KEY, JSON.stringify(all))
  } catch { /* bo qua */ }
}
/** Doc profile: Firestore truoc, loi/khong co thi dung cache tren may. */
export async function fetchUserProfile(uid) {
  if (!uid) return null
  const fs = getFirebaseFs()
  if (fs) {
    try {
      const d = await getDoc(doc(fs, 'user_profiles', uid))
      if (d.exists()) {
        const p = d.data()
        cacheProfile(uid, p)
        return p
      }
    } catch (e) {
      console.warn('[store] fetchUserProfile (cloud):', e)
    }
  }
  return loadCachedProfile(uid)
}
/**
 * Luu profile: LUON ghi cache tren may; ghi Firestore best-effort.
 * Tra { ok: true, cloud: boolean, profile } — cloud=false khi Rules chua
 * cho ghi user_profiles hoac loi mang, UI se bao ro cho nguoi dung.
 * status ('pending'|'approved'|'blocked' — duyet tai khoan): chi ghi khi
 * duoc truyen vao; khong truyen thi GIU status da co trong cache (user sua
 * ten khong duoc ghi de mat trang thai duyet).
 */
export async function saveUserProfile(uid, profile) {
  const prev = loadCachedProfile(uid)
  const clean = {
    email: profile?.email || '',
    displayName: profile?.displayName || '',
    msdl: profile?.msdl ? String(profile.msdl).trim() : '',
    status: profile?.status || prev?.status || '',
    canSalesReport: profile?.canSalesReport !== undefined ? profile.canSalesReport === true : prev?.canSalesReport === true,
    canViewUnit: profile?.canViewUnit !== undefined ? profile.canViewUnit === true : prev?.canViewUnit === true,
    // Avatar (URL tren Storage + moc doi): chi doi khi duoc truyen vao,
    // khong truyen thi GIU ban da co trong cache — sua ten/MSDL o form
    // Tai khoan khong duoc ghi de mat anh dai dien.
    avatarUrl: profile?.avatarUrl !== undefined ? (profile.avatarUrl || '') : (prev?.avatarUrl || ''),
    avatarUpdatedAt: profile?.avatarUpdatedAt !== undefined ? (profile.avatarUpdatedAt || '') : (prev?.avatarUpdatedAt || ''),
    updatedAt: new Date().toISOString(),
  }
  cacheProfile(uid, clean)
  const fs = getFirebaseFs()
  let cloud = false
  if (fs && uid) {
    try {
      // Giu quyen Sales Report + avatar da co tren may: cache may nay co
      // the chua co cac truong nay trong khi ban may da co — doc ban may
      // hien tai truoc khi ghi de, tranh lam mat quyen Admin da cap /
      // anh dai dien da tai len tu thiet bi khac.
      try {
        const cur = await getDoc(doc(fs, 'user_profiles', uid))
        if (cur.exists()) {
          const cd = cur.data() || {}
          let restored = false
          if (cd.canSalesReport === true && !clean.canSalesReport) { clean.canSalesReport = true; restored = true }
          if (cd.canViewUnit === true && !clean.canViewUnit) { clean.canViewUnit = true; restored = true }
          if (cd.avatarUrl && !clean.avatarUrl) {
            clean.avatarUrl = cd.avatarUrl
            clean.avatarUpdatedAt = cd.avatarUpdatedAt || clean.avatarUpdatedAt
            restored = true
          }
          if (restored) cacheProfile(uid, clean)
        }
      } catch { /* bo qua — ghi tiep bang ban local */ }
      await setDoc(doc(fs, 'user_profiles', uid), clean)
      cloud = true
    } catch (e) {
      console.warn('[store] saveUserProfile (cloud):', e)
    }
  }
  return { ok: true, cloud, profile: clean }
}

/**
 * Doc TOAN BO user_profiles (cho panel Duyet tai khoan cua Admin chinh).
 * Tra { ok: true, list } — list sap xep: pending truoc, roi approved, blocked;
 * trong nhom thi theo email. Loi (chua dang nhap Admin / Rules chua publish
 * ban cho Admin doc tat ca) -> { ok: false, error }.
 */
export async function fetchAllProfiles() {
  const fs = getFirebaseFs()
  if (!fs) return { ok: false, error: 'no-config' }
  try {
    const snap = await getDocs(collection(fs, 'user_profiles'))
    const list = []
    snap.forEach((d) => {
      const p = d.data() || {}
      list.push({
        uid: d.id,
        email: p.email || '',
        displayName: p.displayName || '',
        msdl: p.msdl || '',
        status: p.status || '',
        canSalesReport: p.canSalesReport === true,
        canViewUnit: p.canViewUnit === true,
        updatedAt: p.updatedAt || '',
      })
    })
    const rank = (s) => (s === 'pending' ? 0 : s === 'blocked' ? 2 : 1)
    list.sort((a, b) => rank(a.status) - rank(b.status) || String(a.email || a.msdl).localeCompare(String(b.email || b.msdl)))
    return { ok: true, list }
  } catch (e) {
    console.warn('[store] fetchAllProfiles:', e)
    return { ok: false, error: e?.code || 'remote-error' }
  }
}

/**
 * Admin chinh dat trang thai duyet cho 1 tai khoan: ghi merge
 * user_profiles/{uid} { status, statusUpdatedAt } — khong dong cac truong khac.
 * Tra true neu ghi may thanh cong, false neu loi.
 */
export async function adminSetProfileStatus(uid, status) {
  const fs = getFirebaseFs()
  if (!fs || !uid) return false
  try {
    await setDoc(doc(fs, 'user_profiles', uid), { status, statusUpdatedAt: new Date().toISOString() }, { merge: true })
    return true
  } catch (e) {
    console.warn('[store] adminSetProfileStatus:', e)
    return false
  }
}

/**
 * Admin chinh cap / thu hoi quyen xem Sales Report cho 1 tai khoan:
 * ghi merge user_profiles/{uid} { canSalesReport } — khong dong truong khac.
 * Tra true neu ghi may thanh cong, false neu loi.
 */
export async function adminSetSalesReport(uid, allowed) {
  const fs = getFirebaseFs()
  if (!fs || !uid) return false
  try {
    await setDoc(doc(fs, 'user_profiles', uid), { canSalesReport: !!allowed, salesReportUpdatedAt: new Date().toISOString() }, { merge: true })
    return true
  } catch (e) {
    console.warn('[store] adminSetSalesReport:', e)
    return false
  }
}

/**
 * Admin chinh cap / thu hoi quyen xem muc Phong (Unit) trong tab Tinh
 * Anh cho 1 tai khoan: ghi merge user_profiles/{uid} { canViewUnit } —
 * khong dong truong khac. Tra true neu ghi may thanh cong.
 */
export async function adminSetUnitView(uid, allowed) {
  const fs = getFirebaseFs()
  if (!fs || !uid) return false
  try {
    await setDoc(doc(fs, 'user_profiles', uid), { canViewUnit: !!allowed, unitViewUpdatedAt: new Date().toISOString() }, { merge: true })
    return true
  } catch (e) {
    console.warn('[store] adminSetUnitView:', e)
    return false
  }
}

// ── Thu vien Memo · Thi dua · Tai lieu ───────────────────────
// Firestore collection `memos` (metadata + URL) + Firebase Storage
// `memos/{memoId}/original.pdf`. Xem memo = DOC PDF TRUC TIEP trong
// khung nhung + nut Tai ve (doi tu phuong an tach anh sang truc tiep
// theo yeu cau cua Lan 08/11/2026 — bo han phu thuoc chunk pdfSplit).
// Dieu kien chay that: Lan bat Storage tren Firebase Console + publish
// firestore.rules & storage.rules. Chua publish -> cac ham duoi day tra
// loi TIENG VIET, app khong crash (UI hien ghi chu huong dan).
export function getFirebaseStorage() {
  const app = getFirebaseApp()
  if (!app) return null
  try { return getStorage(app) } catch (e) {
    console.error('[store] getStorage failed:', e)
    return null
  }
}

const MEMO_ERR_HINT = 'Có thể kho lưu trữ (Storage) / Rules chưa được bật ở Firebase Console — Admin chính cần bật Storage và publish firestore.rules + storage.rules rồi thử lại.'
function memoErrMsg(e, fallback) {
  const code = e?.code || ''
  if (code.includes('permission-denied') || code.includes('unauthorized')) {
    return `Chưa có quyền với thư viện memo. ${MEMO_ERR_HINT}`
  }
  if (code.includes('storage/object-not-found') || code.includes('not-found')) {
    return 'Không tìm thấy file trên kho lưu trữ — file có thể đã bị xoá ở nơi khác.'
  }
  return `${fallback} ${MEMO_ERR_HINT}`
}

/** Doc danh sach memo (moi nhat truoc theo createdAt). Loi -> { memos: [], error }. */
export async function fetchMemos() {
  const fs = getFirebaseFs()
  if (!fs) return { memos: [], error: 'no-config' }
  try {
    const snap = await getDocs(query(collection(fs, 'memos'), orderBy('createdAt', 'desc')))
    const memos = []
    snap.forEach((d) => memos.push({ id: d.id, ...(d.data() || {}) }))
    return { memos, error: '' }
  } catch (e) {
    console.warn('[store] fetchMemos:', e)
    return { memos: [], error: memoErrMsg(e, 'Chưa đọc được thư viện memo.') }
  }
}

/**
 * Tai PDF goc len Storage (xem truc tiep, khong tach anh nua).
 * Tra { ok, pdfUrl, pdfPath, pages: [], pagePaths: [] } hoac { ok: false, error }.
 * (pages/pagePaths giu rong de cung khuon du lieu voi memo kieu cu.)
 */
export async function uploadMemoPdf(memoId, pdfFile) {
  const st = getFirebaseStorage()
  if (!st) return { ok: false, error: `Chưa kết nối được kho lưu trữ (Storage). ${MEMO_ERR_HINT}` }
  try {
    const pdfPath = `memos/${memoId}/original.pdf`
    const pdfRef = storageRef(st, pdfPath)
    await uploadBytes(pdfRef, pdfFile, { contentType: 'application/pdf' })
    const pdfUrl = await getDownloadURL(pdfRef)
    return { ok: true, pdfUrl, pdfPath, pages: [], pagePaths: [] }
  } catch (e) {
    console.warn('[store] uploadMemoPdf:', e)
    return { ok: false, error: memoErrMsg(e, 'Tải file memo lên không thành công.') }
  }
}

/** Tao doc Firestore memos/{id} (id do UI tu sinh) — tra { ok, id } hoac { ok: false, error }. */
export async function createMemoDoc(data) {
  const fs = getFirebaseFs()
  if (!fs) return { ok: false, error: `Chưa kết nối được Firebase. ${MEMO_ERR_HINT}` }
  try {
    const { id, ...body } = data || {}
    if (id) {
      await setDoc(doc(fs, 'memos', id), body)
      return { ok: true, id }
    }
    const ref = await addDoc(collection(fs, 'memos'), body)
    return { ok: true, id: ref.id }
  } catch (e) {
    console.warn('[store] createMemoDoc:', e)
    return { ok: false, error: memoErrMsg(e, 'Lưu thông tin memo không thành công.') }
  }
}

/**
 * Xoa memo o ca 3 noi: doc Firestore + PDF goc + tung anh trang tren Storage.
 * Loi tung phan van tiep tuc cac phan con lai; tra { ok, errors: [msg] } —
 * ok = true chi khi xoa sach (doc Firestore la phan bat buoc).
 */
export async function deleteMemoEverywhere(memo) {
  const errors = []
  const fs = getFirebaseFs()
  let docOk = false
  if (fs && memo?.id) {
    try { await deleteDoc(doc(fs, 'memos', memo.id)); docOk = true } catch (e) {
      console.warn('[store] deleteMemo doc:', e)
      errors.push(memoErrMsg(e, 'Xoá thông tin memo không thành công.'))
    }
  } else {
    errors.push('Chưa kết nối được Firebase để xoá memo.')
  }
  const st = getFirebaseStorage()
  if (st) {
    const paths = [memo?.pdfPath, ...(Array.isArray(memo?.pagePaths) ? memo.pagePaths : [])].filter(Boolean)
    for (const p of paths) {
      try { await deleteObject(storageRef(st, p)) } catch (e) {
        if (!String(e?.code || '').includes('object-not-found')) {
          console.warn('[store] deleteMemo file:', p, e)
          errors.push(`Chưa xoá được file ${p} trên kho lưu trữ.`)
        }
      }
    }
  }
  return { ok: docOk && errors.length === 0, docOk, errors }
}

// ── Avatar TVV ───────────────────────────────────────────────
// Anh dai dien cua tung TVV: nen phia client (canvas cat vuong giua,
// toi da 256x256, JPEG ~0.85) roi tai len Storage `avatars/{uid}/avatar.jpg`;
// URL luu vao user_profiles (truong avatarUrl — saveUserProfile da giu
// truong nay nhu status/canSalesReport). Dieu kien chay that: Lan publish
// storage.rules ban co match /avatars (chi chinh user ghi file cua minh).
// Chua publish -> tra loi TIENG VIET, app khong crash.
function avatarErrMsg(e) {
  const code = e?.code || ''
  if (code.includes('permission-denied') || code.includes('unauthorized')) {
    return `Chưa có quyền tải ảnh lên kho lưu trữ. ${MEMO_ERR_HINT}`
  }
  return `Đổi ảnh không thành công. ${MEMO_ERR_HINT}`
}

/**
 * Tai avatar moi cua user: Blob JPEG 256x256 DA duoc cat/canh san o khung
 * chinh anh (CaNhan AvatarEditor — keo/zoom roi moi bam Luu) -> Storage
 * avatars/{uid}/avatar.jpg -> ghi avatarUrl vao user_profiles cua CHINH
 * user (giu nguyen status / canSalesReport / cac truong khac qua
 * saveUserProfile).
 * Tra { ok, avatarUrl, profile, cloud } hoac { ok: false, error }.
 */
export async function uploadAvatar(uid, blob) {
  if (!uid) return { ok: false, error: 'Bạn chưa đăng nhập.' }
  if (!blob) return { ok: false, error: 'Chưa chọn ảnh.' }
  if (blob.type && !String(blob.type).startsWith('image/')) {
    return { ok: false, error: 'File đã chọn không phải ảnh — vui lòng chọn file ảnh (JPG/PNG…).' }
  }
  const st = getFirebaseStorage()
  if (!st) return { ok: false, error: `Chưa kết nối được kho lưu trữ (Storage). ${MEMO_ERR_HINT}` }
  try {
    const path = `avatars/${uid}/avatar.jpg`
    const r = storageRef(st, path)
    await uploadBytes(r, blob, { contentType: 'image/jpeg' })
    const avatarUrl = await getDownloadURL(r)
    // Giu nguyen cac truong profile khac: uu tien cache may, cache trong
    // (may moi dang nhap) thi doc ban may truoc khi ghi.
    let prev = loadCachedProfile(uid)
    if (!prev) prev = (await fetchUserProfile(uid)) || {}
    const saved = await saveUserProfile(uid, {
      ...prev,
      email: prev.email || '',
      avatarUrl,
      avatarUpdatedAt: new Date().toISOString(),
    })
    return { ok: true, avatarUrl, profile: saved.profile, cloud: saved.cloud }
  } catch (e) {
    console.warn('[store] uploadAvatar:', e)
    return { ok: false, error: avatarErrMsg(e) }
  }
}

/** Best-effort ghi Firestore: case_adjustments/{proposalNum} + audit_log. Khong bao gio throw. */
export async function saveAdjustmentRemote(proposalNum, adj, changes, by) {
  const fs = getFirebaseFs()
  if (!fs) return { ok: false, reason: 'no-config' }
  const ts = new Date().toISOString()
  try {
    await setDoc(doc(fs, 'case_adjustments', proposalNum), { ...adj, proposalNum, updatedAt: ts, updatedBy: by })
    await addDoc(collection(fs, 'audit_log'), { ts, proposalNum, changes, by, source: 'dashboard-d07-moi' })
    return { ok: true }
  } catch (e) {
    console.warn('[store] saveAdjustmentRemote best-effort failed:', e)
    return { ok: false, reason: 'remote-error' }
  }
}
