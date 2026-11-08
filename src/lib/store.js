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
import { getFirestore, doc, collection, setDoc, getDoc, getDocs, addDoc } from 'firebase/firestore'

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
      .map((s) => ({ id: s.date, data: s.data }))
  } catch { return [] }
}

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

// ── Firebase config (nguoi dung dan, luu o fb_config nhu ban cu) ──
export function getFbConfig() {
  try {
    const raw = localStorage.getItem(FB_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw)
    return cfg && cfg.apiKey ? cfg : null
  } catch { return null }
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

// ── Firebase singleton (chi init khi da co config) ───────────
let _fb = null
export function getFirebaseFs() {
  const cfg = getFbConfig()
  if (!cfg) return null
  if (_fb && _fb.projectId === cfg.projectId) return _fb.fs
  try {
    const apps = getApps()
    const app = apps.length ? apps[0] : initializeApp(cfg)
    _fb = { projectId: cfg.projectId, fs: getFirestore(app) }
    return _fb.fs
  } catch (e) {
    console.error('[store] Firebase init failed:', e)
    return null
  }
}

/** Luu doc daily_sales_tvv/{ymd} — cung shape saveDailySalesDoc ban cu. */
export async function saveDailyToFirestore(ymd, payload) {
  const fs = getFirebaseFs()
  if (!fs) return { ok: false, reason: 'no-config' }
  const updatedAt = new Date().toISOString()
  await setDoc(doc(fs, 'daily_sales_tvv', ymd), { ...payload, updatedAt, updatedBy: null })
  return { ok: true, updatedAt }
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
      if (d.exists()) out.push({ id, data: d.data() })
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
