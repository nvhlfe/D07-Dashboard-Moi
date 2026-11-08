// ─────────────────────────────────────────────────────────────
// auth.js — Dang nhap Firebase Auth cho Dashboard D07 Moi.
// Dung CHUNG 1 Firebase app instance voi store.js (getFirebaseApp) —
// khong init lai app thu hai. Loi dang nhap dich sang tieng Viet than thien.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirebaseApp } from './store'

let _auth = null
export function getFirebaseAuth() {
  const app = getFirebaseApp()
  if (!app) return null
  if (_auth && _auth.app === app) return _auth
  try {
    _auth = getAuth(app)
    return _auth
  } catch (e) {
    console.error('[auth] getAuth failed:', e)
    return null
  }
}

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Email hoặc mật khẩu chưa đúng.',
  'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
  'auth/wrong-password': 'Mật khẩu chưa đúng.',
  'auth/invalid-email': 'Email chưa đúng định dạng.',
  'auth/missing-password': 'Chưa nhập mật khẩu.',
  'auth/user-disabled': 'Tài khoản đã bị khoá — liên hệ Admin chính.',
  'auth/too-many-requests': 'Thử đăng nhập quá nhiều lần — vui lòng chờ ít phút rồi thử lại.',
  'auth/network-request-failed': 'Lỗi mạng — kiểm tra kết nối rồi thử lại.',
  'auth/operation-not-allowed': 'Cách đăng nhập này chưa được bật trên Firebase.',
}
export function mapAuthError(e) {
  return AUTH_ERRORS[e?.code] || 'Đăng nhập thất bại — vui lòng thử lại.'
}

/** Hook: { user, authLoading, login(email, password), logout }. */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) { setAuthLoading(false); return undefined }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, email: u.email || '', displayName: u.displayName || '' } : null)
      setAuthLoading(false)
    }, () => setAuthLoading(false))
    return unsub
  }, [])

  const login = useCallback(async (email, password) => {
    const auth = getFirebaseAuth()
    if (!auth) return { ok: false, error: 'Chưa kết nối được Firebase — thử tải lại trang.' }
    try {
      await signInWithEmailAndPassword(auth, String(email || '').trim(), password || '')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: mapAuthError(e) }
    }
  }, [])

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (!auth) return
    try { await signOut(auth) } catch { /* bo qua */ }
  }, [])

  return { user, authLoading, login, logout }
}
