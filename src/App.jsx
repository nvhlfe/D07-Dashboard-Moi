// ─────────────────────────────────────────────────────────────
// App — Dashboard D07 Moi.
// Shell mobile-first: 1 cot, max-width 560px, thanh dieu huong 4 nut co dinh
// duoi day (nut >= 44px). 4 man hinh dung that theo SPEC v3: Hom Nay +
// Sales Report + Doi Ngu + Nap du lieu.
// Tai khoan: dang nhap Firebase Auth; Admin chinh (admin@prud07.top) xem so ho
// so DAY DU o Sales Report, thanh vien thuong bi che con 2 so cuoi.
// Ho so ca nhan (ten hien thi + ma TVV) luu user_profiles/{uid} + cache may.
// Thu vien 📌 Memo · Thi dua · Tai lieu (Firestore `memos` + Firebase
// Storage) mo tu nut "📌 Memo" tren header, thay vung noi dung tab khi mo.
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HomNay from './components/HomNay.jsx'
import NapDuLieu from './components/NapDuLieu.jsx'
import SalesReport from './components/SalesReport.jsx'
import DoiNgu from './components/DoiNgu.jsx'
import MemoThuVien from './components/MemoThuVien.jsx'
import CaNhan from './components/CaNhan.jsx'
import { loadLocalSnapshots, fetchFirestoreSnapshots, fetchMonthSnapshots, persistSnapshots, mergeSnapshots, getFbConfig, fetchUserProfile, saveUserProfile, fetchAllProfiles, adminSetProfileStatus, adminSetSalesReport, adminSetUnitView } from './lib/store'
import { useAuth } from './lib/auth'
import { emailToMsdl, isMsdlAccount, isSuperAdmin, msdlToEmail, canViewSalesReport } from './lib/firebaseConfig'
import { LOGO_D07 } from './lib/logoData'

const fmtDateVN = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Trang thai duyet HIEU LUC cua 1 ho so user_profiles: co status thi dung
// status; khong co thi tai khoan MSDL mac dinh 'pending' (cho duyet), tai
// khoan email cu mac dinh 'approved' (khong khoa nham nguoi dung cu).
const effProfileStatus = (p) => {
  if (!p) return 'approved'
  if (p.status) return p.status
  return emailToMsdl(p.email) ? 'pending' : 'approved'
}

const NAV = [
  { id: 'home', label: 'Trang Chủ', icon: '🏠' },
  { id: 'sales', label: 'Sales Report', icon: '📋' },
  { id: 'team', label: 'Tinh Anh', icon: '👥' },
  { id: 'me', label: 'Của tôi', icon: '👤' },
  { id: 'memo', label: 'Memo', icon: '📌' },
  { id: 'nap', label: 'Nạp', icon: '📥' },
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [snaps, setSnaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('máy này')
  // Luot tai may DAU TIEN da ket thuc chua (thanh cong hay loi deu tinh):
  // cac man dung co nay de phan biet "dang tai du lieu…" voi "chua co du
  // lieu" — tranh hien man 📭 trong luc dang tai lan dau tren thiet bi moi.
  const [remoteSettled, setRemoteSettled] = useState(false)
  const snapsRef = useRef([])
  useEffect(() => { snapsRef.current = snaps }, [snaps])

  const { user, authLoading, login, register, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ id: '', password: '' })
  const [regForm, setRegForm] = useState({ msdl: '', password: '', password2: '' })
  const [loginErr, setLoginErr] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [acctForm, setAcctForm] = useState({ displayName: '', msdl: '' })
  const [acctMsg, setAcctMsg] = useState('')
  const [acctBusy, setAcctBusy] = useState(false)
  // Panel Duyet tai khoan (chi Admin chinh): danh sach user_profiles + thong bao
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminList, setAdminList] = useState([])
  const [adminErr, setAdminErr] = useState('')
  const [adminMsg, setAdminMsg] = useState('')
  const [adminBusyUid, setAdminBusyUid] = useState('')
  const pendingCount = adminList.filter((p) => effProfileStatus(p) === 'pending').length

  const loadAdminList = useCallback(async () => {
    const res = await fetchAllProfiles()
    if (res.ok) { setAdminList(res.list); setAdminErr('') }
    else { setAdminList([]); setAdminErr(res.error || 'remote-error') }
  }, [])

  // Admin chinh: tai san danh sach de hien badge so tai khoan dang cho duyet
  useEffect(() => {
    if (user && isSuperAdmin(user)) loadAdminList()
  }, [user, loadAdminList])

  const handleAdminStatus = async (uid, status) => {
    setAdminBusyUid(uid)
    const ok = await adminSetProfileStatus(uid, status)
    setAdminBusyUid('')
    if (ok) {
      setAdminMsg(status === 'approved' ? '✓ Đã duyệt tài khoản.' : status === 'blocked' ? '⛔ Đã khoá tài khoản.' : '↩️ Đã thu hồi — tài khoản quay về chờ duyệt.')
      await loadAdminList()
    } else {
      setAdminMsg('Không ghi được lên mây — kiểm tra mạng / Rules rồi thử lại.')
    }
  }

  // Admin chinh: cap / thu hoi quyen xem Sales Report cho 1 tai khoan
  const handleAdminSalesReport = async (uid, allowed) => {
    setAdminBusyUid(uid)
    const ok = await adminSetSalesReport(uid, allowed)
    setAdminBusyUid('')
    if (ok) {
      setAdminMsg(allowed ? '✓ Đã cấp quyền xem Sales Report.' : '✓ Đã thu hồi quyền xem Sales Report.')
      await loadAdminList()
    } else {
      setAdminMsg('Không ghi được lên mây — kiểm tra mạng / Rules rồi thử lại.')
    }
  }

  // Admin chinh: cap / thu hoi quyen xem muc Phong (Unit) trong tab
  // Tinh Anh cho 1 tai khoan (UM/BM thi tu co quyen theo du lieu Daily,
  // khong can cap tay — nut nay danh cho cac truong hop con lai).
  const handleAdminUnitView = async (uid, allowed) => {
    setAdminBusyUid(uid)
    const ok = await adminSetUnitView(uid, allowed)
    setAdminBusyUid('')
    if (ok) {
      setAdminMsg(allowed ? '✓ Đã cấp quyền xem mục Phòng (Unit).' : '✓ Đã thu hồi quyền xem mục Phòng (Unit).')
      await loadAdminList()
    } else {
      setAdminMsg('Không ghi được lên mây — kiểm tra mạng / Rules rồi thử lại.')
    }
  }

  const reload = useCallback(async () => {
    const local = loadLocalSnapshots()
    setSnaps(local)
    setSource('máy này')
    setLoading(false)
    if (!getFbConfig()) { setRemoteSettled(true); return }
    const remote = await fetchFirestoreSnapshots()
    // Du thanh cong hay loi (remote null) thi luot tai dau da ket thuc:
    // tu luc nay cac man duoc phep ket luan "chua co du lieu" neu rong.
    setRemoteSettled(true)
    if (remote) {
      // GOP ban tren may + ban tren may (khong thay the): ban vua nap o
      // may nay chua dong bo duoc van duoc dung, ban cu tren may khong
      // de duoc ban moi cung ngay. Remote gio chi gom TAP DOC CAN nen
      // merge theo ngay la du de khong mat doc cache nao ca.
      const merged = mergeSnapshots(local, remote)
      if (merged.length) {
        setSnaps(merged)
        // LUU LAI ban da gop vao cache may (theo dung luong): lan mo sau
        // thay du lieu NGAY tu cache, khong phai cho tai lai tu may chu.
        persistSnapshots(merged)
        const newestEntry = merged[merged.length - 1]
        setSource(newestEntry._from === 'remote' ? 'Firebase' : 'máy này')
      }
    }
  }, [])

  // LAZY theo thang (Sales Report): nguoi dung chon thang chua co trong
  // snaps -> tai doc moi nhat cua thang do (+ thang truoc cho CF) roi gop
  // vao state + cache. Tra ve true neu thang do co du lieu.
  const monthReqRef = useRef(new Set())
  const ensureMonth = useCallback(async (ym) => {
    if (!/^\d{4}-\d{2}$/.test(String(ym || ''))) return false
    if ((snapsRef.current || []).some((s) => s.id && s.id.startsWith(`${ym}-`))) return true
    if (monthReqRef.current.has(ym)) return false
    monthReqRef.current.add(ym)
    const fetched = await fetchMonthSnapshots(ym)
    if (!fetched || !fetched.length) return false
    let has = false
    setSnaps((cur) => {
      const merged = mergeSnapshots(cur, fetched)
      persistSnapshots(merged)
      has = merged.some((s) => s.id.startsWith(`${ym}-`))
      return merged
    })
    return has
  }, [])

  useEffect(() => { reload() }, [reload])

  // Khi dang nhap doi: tai lai du lieu (Rules chi cho user dang nhap doc may)
  // + tai ho so ca nhan (Firestore truoc, fallback cache tren may).
  useEffect(() => {
    if (authLoading) return undefined
    reload()
    if (!user) { setProfile(null); return undefined }
    let cancelled = false
    fetchUserProfile(user.uid).then((p) => {
      if (cancelled) return
      // Tai khoan TVV dang nhap bang MSDL: ma TVV chinh la ten dang nhap,
      // ke ca khi ho so may chua kip dong bo.
      const own = emailToMsdl(user.email)
      const merged = own ? { ...(p || {}), msdl: own, email: user.email } : p
      setProfile(merged)
      setAcctForm({ displayName: merged?.displayName || '', msdl: merged?.msdl || '' })
    })
    return () => { cancelled = true }
  }, [user, authLoading, reload])

  const handleLogin = async () => {
    setLoginErr('')
    setLoginBusy(true)
    const res = await login(loginForm.id, loginForm.password)
    setLoginBusy(false)
    if (res.ok) {
      setShowLogin(false)
      setLoginForm({ id: '', password: '' })
    } else {
      setLoginErr(res.error)
    }
  }

  const handleRegister = async () => {
    setLoginErr('')
    const msdl = regForm.msdl.trim()
    if (!msdl) { setLoginErr('Chưa nhập MSĐL.'); return }
    if ((regForm.password || '').length < 6) { setLoginErr('Mật khẩu phải có tối thiểu 6 ký tự.'); return }
    if (regForm.password !== regForm.password2) { setLoginErr('Mật khẩu nhập lại chưa khớp.'); return }
    setLoginBusy(true)
    const res = await register(msdl, regForm.password)
    if (!res.ok) {
      setLoginBusy(false)
      setLoginErr(res.error)
      return
    }
    // Gan ngay MSDL vao ho so: khoi "Cua toi" tu doi chieu theo ma nay
    // trong sheet Agent cua Daily Sales (ten TVV, Unit, AGsegment...).
    // Tai khoan TVV tu dang ky o trang thai CHO DUYET — Admin chinh duyet
    // xong moi vao duoc app (cong gate o duoi).
    const saved = await saveUserProfile(res.user.uid, {
      email: res.user.email || msdlToEmail(msdl),
      displayName: '',
      msdl: msdl.toUpperCase(),
      status: 'pending',
    })
    setLoginBusy(false)
    setProfile(saved.profile)
    setShowLogin(false)
    setRegForm({ msdl: '', password: '', password2: '' })
    setAuthMode('login')
  }

  const openAccount = () => {
    setAcctMsg('')
    setAcctForm({ displayName: profile?.displayName || '', msdl: profile?.msdl || '' })
    setShowAccount(true)
  }

  const handleSaveAccount = async () => {
    if (!user) return
    setAcctBusy(true)
    const own = emailToMsdl(user.email)
    const res = await saveUserProfile(user.uid, {
      email: user.email,
      displayName: acctForm.displayName.trim(),
      msdl: own || acctForm.msdl.trim(),
    })
    setAcctBusy(false)
    setProfile(res.profile)
    setAcctMsg(res.cloud
      ? '✓ Đã lưu hồ sơ lên mây — đăng nhập máy nào cũng thấy.'
      : 'Đã lưu trên máy này; bản mây chờ cập nhật Rules')
  }

  const newest = snaps.length ? snaps[snaps.length - 1] : null
  const greetingName = profile?.displayName || user?.displayName
    || (isMsdlAccount(user) ? `TVV ${emailToMsdl(user.email)}` : (user?.email ? user.email.split('@')[0] : ''))
  const superAdmin = isSuperAdmin(user)
  const msdlAccount = isMsdlAccount(user)
  // Sales Report: chi Admin chinh hoac tai khoan duoc cap quyen moi xem duoc
  const canSR = canViewSalesReport(user, profile)

  // Tab "Cua toi" (trang ca nhan TVV): chi hien khi dang nhap bang tai
  // khoan MSDL (TVV) va KHONG phai Admin chinh. Tai khoan email thuong /
  // Admin chinh khong co trang ca nhan nay.
  const showMeTab = !!user && msdlAccount && !superAdmin

  // ── avatarMap { MSDL -> avatarUrl } truyen xuong Tinh Anh (DoiNgu) ──
  // Admin chinh: lay tu danh sach user_profiles (fetchAllProfiles — state
  // adminList da tai san cho panel Duyet TK) nen thay avatar cua MOI TVV.
  // Nguoi dung thuong: chi co avatar cua CHINH MINH (profile cua nguoi
  // khac khong doc duoc theo Rules — giu nguyen gioi han nay).
  const avatarMap = useMemo(() => {
    const map = {}
    const put = (msdl, url) => {
      const k = String(msdl || '').trim().toUpperCase()
      if (k && url) map[k] = url
    }
    if (superAdmin) for (const p of adminList) put(p.msdl, p.avatarUrl)
    put(profile?.msdl, profile?.avatarUrl)
    return map
  }, [superAdmin, adminList, profile])

  // ── Rules hien thi tab (Lan chot 08/11/2026) ──
  // Tab Nap: CHI Admin chinh thay. Tab Sales Report: chi Admin chinh +
  // tai khoan duoc cap quyen (canViewSalesReport) thay — con lai AN HAN
  // khoi thanh dieu huong (khong con hien kem khoa nhu truoc).
  const visibleNav = NAV.filter((n) => {
    if (n.id === 'nap') return superAdmin
    if (n.id === 'sales') return canSR
    if (n.id === 'me') return showMeTab
    return true
  })
  // Dang o tab bi an (vd vua bi thu hoi quyen / dang xuat) -> ve Trang Chu.
  useEffect(() => {
    if (tab === 'nap' && !superAdmin) setTab('home')
    else if (tab === 'sales' && !canSR && (!user || profile)) setTab('home')
    else if (tab === 'me' && !showMeTab) setTab('home')
  }, [tab, superAdmin, canSR, user, profile, showMeTab])

  // ── Cong duyet tai khoan ──
  // Super admin luon qua. Nguoi thuong: status lay tu profile; tai khoan
  // MSDL khong co status = pending, tai khoan email cu = approved.
  const effectiveStatus = !user || superAdmin
    ? 'approved'
    : (profile?.status || (msdlAccount ? 'pending' : 'approved'))
  // Tai khoan MSDL ma profile chua tai xong: cho kiem tra, khong nhap nhay du lieu
  const gateChecking = !!user && !superAdmin && msdlAccount && profile === null

  // ── Tu nhay trang ca nhan khi TVV dang nhap ──
  // Trang thai dang nhap chuyen chua -> da dang nhap (uid moi xuat hien)
  // va user la TVV MSDL DA DUOC DUYET thi nhay sang tab 'me' DUNG 1 LAN
  // cho lan dang nhap do (ref ghi uid da nhay — profile tai lai hay
  // rerender deu khong nhay lai). Dang xuat thi xoa ref de lan dang nhap
  // sau nhay lai. Admin chinh + tai khoan email thuong giu o Trang Chu.
  const jumpedUidRef = useRef('')
  useEffect(() => {
    if (!user) { jumpedUidRef.current = ''; return }
    if (jumpedUidRef.current === user.uid) return
    if (profile === null) return // chua biet trang thai duyet — cho profile tai xong
    if (showMeTab && effectiveStatus === 'approved') {
      jumpedUidRef.current = user.uid
      setTab('me')
    }
  }, [user, profile, showMeTab, effectiveStatus])

  // 1 dong trong panel Admin: thong tin + nut hanh dong theo trang thai
  const renderAdminRow = (p) => {
    const st = effProfileStatus(p)
    const busy = adminBusyUid === p.uid
    return (
      <div className="audit-row" key={p.uid}>
        <div>
          <b>{p.displayName || emailToMsdl(p.email) || p.email || p.uid}</b>
          {p.msdl ? <span className="muted"> · MSĐL {p.msdl}</span> : null}
          {p.email ? <div className="a-ts">{p.email}</div> : null}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {st === 'pending' && (
            <>
              <button className="btn-mini primary" disabled={busy} onClick={() => handleAdminStatus(p.uid, 'approved')}>✓ Duyệt</button>
              <button className="btn-mini" disabled={busy} onClick={() => handleAdminStatus(p.uid, 'blocked')}>Khoá</button>
            </>
          )}
          {st === 'approved' && (
            <>
              <button className={`btn-mini ${p.canSalesReport ? 'primary' : ''}`} disabled={busy} onClick={() => handleAdminSalesReport(p.uid, !p.canSalesReport)}>
                📊 Sales Report: {p.canSalesReport ? 'Đang bật' : 'Đang tắt'}
              </button>
              <button className={`btn-mini ${p.canViewUnit ? 'primary' : ''}`} disabled={busy} onClick={() => handleAdminUnitView(p.uid, !p.canViewUnit)}>
                🏢 Phòng (Unit): {p.canViewUnit ? 'Đang bật' : 'Đang tắt'}
              </button>
              <button className="btn-mini" disabled={busy} onClick={() => handleAdminStatus(p.uid, 'pending')}>Thu hồi</button>
              <button className="btn-mini" disabled={busy} onClick={() => handleAdminStatus(p.uid, 'blocked')}>Khoá</button>
            </>
          )}
          {st === 'blocked' && (
            <button className="btn-mini primary" disabled={busy} onClick={() => handleAdminStatus(p.uid, 'approved')}>Duyệt lại</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-row">
          <img src={LOGO_D07} alt="Prudential Quận 7" className="logo-img" />
          <div className="brand-text">
            <h1>Prudential Quận 7</h1>
            <div className="app-slogan">Cùng Học Hỏi – Cùng Phát Triển – Cùng Thành Công</div>
            <div className="sub">
              {newest
                ? <>Cập nhật đến {fmtDateVN(newest.id)} · nguồn: {source}</>
                : 'Dashboard mới — gọn & thiết thực'}
            </div>
          </div>
        </div>
        <div className="header-acct">
          {authLoading ? (
            <span className="muted">Đang kiểm tra đăng nhập…</span>
          ) : user ? (
            <>
              <span className="greet">👋 {greetingName}</span>
              <span className={`role-badge ${superAdmin ? 'super' : ''}`}>{superAdmin ? '⭐ Admin chính' : msdlAccount ? 'TVV' : 'Thành viên'}</span>
              {superAdmin && (
                <button className="btn-mini" onClick={() => { setAdminMsg(''); loadAdminList(); setShowAdmin(true) }}>
                  🛂 Duyệt TK{adminList.length > 0 ? ` (${adminList.length} tài khoản` : ''}{pendingCount > 0 ? `${adminList.length > 0 ? ' · ' : ' ('}⏳ ${pendingCount} chờ duyệt` : ''}{adminList.length > 0 || pendingCount > 0 ? ')' : ''}
                </button>
              )}
              <button className="btn-mini" onClick={openAccount}>Tài khoản</button>
              <button className="btn-mini" onClick={logout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <span className="muted">Chưa đăng nhập — số hồ sơ đang bị che, dữ liệu chỉ có trên máy này.</span>
              <button className="btn-mini primary" onClick={() => { setLoginErr(''); setShowLogin(true) }}>Đăng nhập</button>
            </>
          )}
        </div>
      </header>

      {gateChecking ? (
        <div className="card empty"><div className="e-ic">⏳</div>Đang kiểm tra quyền tài khoản…</div>
      ) : user && effectiveStatus === 'pending' ? (
        <div className="card empty">
          <div className="e-ic">⏳</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Tài khoản đang chờ Admin chính duyệt</div>
          <p style={{ marginBottom: 14 }}>
            Tài khoản TVV mới tạo phải được Admin chính duyệt mới vào được dashboard.
            Vui lòng báo Admin chính để được duyệt, hoặc quay lại sau ít phút.
          </p>
          <button className="btn-primary" onClick={logout}>Đăng xuất</button>
        </div>
      ) : user && effectiveStatus === 'blocked' ? (
        <div className="card empty">
          <div className="e-ic">⛔</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Tài khoản đã bị khoá — liên hệ Admin chính</div>
          <p style={{ marginBottom: 14 }}>Tài khoản của bạn hiện không vào được dashboard. Vui lòng liên hệ Admin chính của Prudential Quận 7 để được mở lại.</p>
          <button className="btn-primary" onClick={logout}>Đăng xuất</button>
        </div>
      ) : (
        <>
          <>
            {tab === 'home' && (
              <HomNay snaps={snaps} loading={loading} remoteSettled={remoteSettled} onGoNap={() => setTab('nap')}
                user={user} profile={profile}
                onOpenLogin={() => { setLoginErr(''); setShowLogin(true) }}
                onOpenAccount={openAccount} />
            )}
            {tab === 'sales' && (canSR ? (
              <SalesReport snaps={snaps} loading={loading} remoteSettled={remoteSettled} onNeedMonth={ensureMonth} onGoNap={() => setTab('nap')} user={user} />
            ) : (
              <div className="card empty">
                <div className="e-ic">🔒</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Sales Report — mục có cấp quyền</div>
                <p style={{ marginBottom: 14 }}>
                  Mục này chỉ dành cho Admin chính hoặc tài khoản được Admin chính cấp quyền xem.
                  {user
                    ? ' Tài khoản của bạn chưa được cấp quyền — vui lòng liên hệ Admin chính để được bật.'
                    : ' Vui lòng đăng nhập bằng tài khoản đã được cấp quyền.'}
                </p>
                {!user && (
                  <button className="btn-primary" onClick={() => { setLoginErr(''); setShowLogin(true) }}>Đăng nhập</button>
                )}
              </div>
            ))}
            {tab === 'team' && (
              <DoiNgu snaps={snaps} loading={loading} remoteSettled={remoteSettled} onGoNap={() => setTab('nap')} user={user}
                profile={profile} isSuperAdmin={superAdmin} avatarMap={avatarMap}
                onOpenLogin={() => { setLoginErr(''); setShowLogin(true) }} />
            )}
            {tab === 'me' && showMeTab && (
              <CaNhan snaps={snaps} loading={loading} remoteSettled={remoteSettled} user={user} profile={profile}
                onProfileUpdate={setProfile} />
            )}
            {tab === 'memo' && (
              <MemoThuVien user={user} isSuperAdmin={superAdmin}
                onOpenLogin={() => { setLoginErr(''); setShowLogin(true) }} />
            )}
            {tab === 'nap' && <NapDuLieu onSaved={reload} user={user} snaps={snaps} />}
          </>

          <nav className="bottom-nav">
            <div className="inner" style={{ gridTemplateColumns: `repeat(${visibleNav.length}, 1fr)` }}>
              {visibleNav.map((n) => (
                <button key={n.id} className={`nav-btn ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
                  <span className="ic">{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </>
      )}

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            {authMode === 'login' ? (
              <>
                <div className="modal-title">🔐 Đăng nhập</div>
                <p className="muted" style={{ marginBottom: 12 }}>
                  TVV đăng nhập bằng <b>MSĐL</b> của mình; tài khoản quản trị dùng email.
                  Đăng nhập để đồng bộ dữ liệu lên mây (xem trên nhiều thiết bị) và xem khối “Của tôi”.
                </p>
                <div className="field">
                  <label>MSĐL hoặc Email</label>
                  <input autoComplete="username" value={loginForm.id} placeholder="VD: 12345678 hoặc admin@prud07.top"
                    onChange={(e) => setLoginForm((f) => ({ ...f, id: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Mật khẩu</label>
                  <input type="password" autoComplete="current-password" value={loginForm.password} placeholder="••••••••"
                    onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !loginBusy) handleLogin() }} />
                </div>
                {loginErr ? <div className="msg error">{loginErr}</div> : null}
                <button className="btn-primary" disabled={loginBusy} onClick={handleLogin} style={{ marginTop: 8 }}>
                  {loginBusy ? 'Đang đăng nhập…' : 'Đăng nhập'}
                </button>
                <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }}
                  onClick={() => { setLoginErr(''); setAuthMode('register') }}>
                  Chưa có tài khoản? TVV tạo tài khoản bằng MSĐL →
                </button>
              </>
            ) : (
              <>
                <div className="modal-title">🙋 Tạo tài khoản TVV</div>
                <p className="muted" style={{ marginBottom: 12 }}>
                  Tên đăng nhập chính là <b>MSĐL</b> (mã số đại lý) của bạn, mật khẩu tự chọn
                  (tối thiểu 6 ký tự). Tài khoản mới tạo sẽ ở trạng thái <b>chờ Admin chính duyệt</b> —
                  được duyệt xong mới vào được dashboard. Khối “Của tôi” tự hiện tên TVV, Unit và
                  phân loại của bạn — đối chiếu theo MSĐL trong file Daily Sales.
                </p>
                <div className="field">
                  <label>MSĐL (mã số đại lý)</label>
                  <input autoComplete="username" value={regForm.msdl} placeholder="VD: 12345678" inputMode="numeric"
                    onChange={(e) => setRegForm((f) => ({ ...f, msdl: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Mật khẩu tự tạo</label>
                  <input type="password" autoComplete="new-password" value={regForm.password} placeholder="Tối thiểu 6 ký tự"
                    onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Nhập lại mật khẩu</label>
                  <input type="password" autoComplete="new-password" value={regForm.password2} placeholder="Nhập lại mật khẩu"
                    onChange={(e) => setRegForm((f) => ({ ...f, password2: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !loginBusy) handleRegister() }} />
                </div>
                {loginErr ? <div className="msg error">{loginErr}</div> : null}
                <button className="btn-primary" disabled={loginBusy} onClick={handleRegister} style={{ marginTop: 8 }}>
                  {loginBusy ? 'Đang tạo…' : 'Tạo tài khoản'}
                </button>
                <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }}
                  onClick={() => { setLoginErr(''); setAuthMode('login') }}>
                  ← Đã có tài khoản, quay lại đăng nhập
                </button>
              </>
            )}
            <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowLogin(false)}>Để sau</button>
          </div>
        </div>
      )}

      {showAccount && user && (
        <div className="modal-overlay" onClick={() => setShowAccount(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">👤 Tài khoản của tôi</div>
            <p className="muted" style={{ marginBottom: 12 }}>
              {msdlAccount ? `MSĐL ${emailToMsdl(user.email)}` : user.email} · {superAdmin ? 'Admin chính — xem đầy đủ số hồ sơ' : 'Số hồ sơ chỉ hiện 2 số cuối'}
            </p>
            <div className="field">
              <label>Tên hiển thị</label>
              <input value={acctForm.displayName} placeholder="VD: Lan"
                onChange={(e) => setAcctForm((f) => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div className="field">
              <label>Mã TVV của tôi (mã số đại lý trong file Daily Sales)</label>
              <input value={acctForm.msdl} placeholder="VD: 12345678" inputMode="numeric" disabled={msdlAccount}
                onChange={(e) => setAcctForm((f) => ({ ...f, msdl: e.target.value }))} />
              {msdlAccount ? <p className="muted" style={{ marginTop: 4 }}>MSĐL chính là tên đăng nhập của bạn nên không đổi tại đây.</p> : null}
            </div>
            <button className="btn-primary" disabled={acctBusy} onClick={handleSaveAccount}>
              {acctBusy ? 'Đang lưu…' : '💾 Lưu hồ sơ'}
            </button>
            {acctMsg ? <div className={`msg ${acctMsg.startsWith('✓') ? 'success' : 'info'}`}>{acctMsg}</div> : null}
            <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowAccount(false)}>Đóng</button>
          </div>
        </div>
      )}

      {showAdmin && superAdmin && (
        <div className="modal-overlay" onClick={() => setShowAdmin(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">🛂 Duyệt tài khoản TVV</div>
            <p className="muted" style={{ marginBottom: 4 }}>
              Với tài khoản <b>đã duyệt</b>: bấm <b>📊 Sales Report</b> để bật/tắt quyền xem tab Sales Report,
              bấm <b>🏢 Phòng (Unit)</b> để bật/tắt quyền xem mục Phòng trong tab Tinh Anh.
              (UM/BM tự có quyền xem Phòng theo dữ liệu Daily, không cần bật tay.)
            </p>
            {adminErr ? (
              <div className="msg error">
                Chưa đọc được danh sách — Admin cần publish bản firestore.rules mới trên Firebase Console (file firestore.rules trong repo).
              </div>
            ) : (
              <>
                {adminMsg ? <div className={`msg ${adminMsg.startsWith('✓') || adminMsg.startsWith('⛔') || adminMsg.startsWith('↩') ? 'success' : 'error'}`}>{adminMsg}</div> : null}
                <div style={{ fontSize: 13, fontWeight: 800, margin: '10px 0 6px' }}>⏳ Chờ duyệt ({adminList.filter((p) => effProfileStatus(p) === 'pending').length})</div>
                {adminList.filter((p) => effProfileStatus(p) === 'pending').length === 0 && <div className="muted">Không có tài khoản nào đang chờ.</div>}
                {adminList.filter((p) => effProfileStatus(p) === 'pending').map(renderAdminRow)}
                <div style={{ fontSize: 13, fontWeight: 800, margin: '14px 0 6px' }}>✅ Đã duyệt ({adminList.filter((p) => effProfileStatus(p) === 'approved').length})</div>
                {adminList.filter((p) => effProfileStatus(p) === 'approved').length === 0 && <div className="muted">Chưa có tài khoản nào được duyệt.</div>}
                {adminList.filter((p) => effProfileStatus(p) === 'approved').map(renderAdminRow)}
                <div style={{ fontSize: 13, fontWeight: 800, margin: '14px 0 6px' }}>⛔ Đã khoá ({adminList.filter((p) => effProfileStatus(p) === 'blocked').length})</div>
                {adminList.filter((p) => effProfileStatus(p) === 'blocked').length === 0 && <div className="muted">Không có tài khoản nào bị khoá.</div>}
                {adminList.filter((p) => effProfileStatus(p) === 'blocked').map(renderAdminRow)}
              </>
            )}
            <button className="btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setShowAdmin(false)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  )
}
