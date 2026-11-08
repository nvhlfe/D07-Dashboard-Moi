// ─────────────────────────────────────────────────────────────
// App — Dashboard D07 Moi.
// Shell mobile-first: 1 cot, max-width 560px, thanh dieu huong 4 nut co dinh
// duoi day (nut >= 44px). Man hinh dung that: Hom Nay + Sales Report + Nap du lieu.
// Doi ngu: the placeholder trung thuc, lam o dot sau theo SPEC v3.
// Tai khoan: dang nhap Firebase Auth; Admin chinh (admin@d07.com) xem so ho
// so DAY DU o Sales Report, thanh vien thuong bi che con 2 so cuoi.
// Ho so ca nhan (ten hien thi + ma TVV) luu user_profiles/{uid} + cache may.
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react'
import HomNay from './components/HomNay.jsx'
import NapDuLieu from './components/NapDuLieu.jsx'
import SalesReport from './components/SalesReport.jsx'
import { loadLocalSnapshots, fetchFirestoreSnapshots, getFbConfig, fetchUserProfile, saveUserProfile } from './lib/store'
import { useAuth } from './lib/auth'
import { emailToMsdl, isMsdlAccount, isSuperAdmin, msdlToEmail } from './lib/firebaseConfig'

const fmtDateVN = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const NAV = [
  { id: 'home', label: 'Hôm nay', icon: '🏠' },
  { id: 'sales', label: 'Sales Report', icon: '📋' },
  { id: 'team', label: 'Đội ngũ', icon: '👥' },
  { id: 'nap', label: 'Nạp', icon: '📥' },
]

function Placeholder({ icon, title, desc }) {
  return (
    <div className="card empty">
      <div className="e-ic">{icon}</div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <p>{desc}</p>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [snaps, setSnaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('máy này')

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

  const reload = useCallback(async () => {
    const local = loadLocalSnapshots()
    setSnaps(local)
    setSource('máy này')
    setLoading(false)
    if (getFbConfig()) {
      const remote = await fetchFirestoreSnapshots()
      if (remote && remote.length) { setSnaps(remote); setSource('Firebase') }
    }
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
    const saved = await saveUserProfile(res.user.uid, {
      email: res.user.email || msdlToEmail(msdl),
      displayName: '',
      msdl: msdl.toUpperCase(),
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>GA D07</h1>
        <div className="sub">
          {newest
            ? <>Cập nhật đến {fmtDateVN(newest.id)} · nguồn: {source}</>
            : 'Dashboard mới — gọn & thiết thực'}
        </div>
        <div className="header-acct">
          {authLoading ? (
            <span className="muted">Đang kiểm tra đăng nhập…</span>
          ) : user ? (
            <>
              <span className="greet">👋 {greetingName}</span>
              <span className={`role-badge ${superAdmin ? 'super' : ''}`}>{superAdmin ? '⭐ Admin chính' : msdlAccount ? 'TVV' : 'Thành viên'}</span>
              <button className="btn-mini" onClick={openAccount}>Tài khoản</button>
              <button className="btn-mini" onClick={logout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <span className="muted">Chưa đăng nhập — số hồ sơ đang bị che, điều chỉnh bị khoá.</span>
              <button className="btn-mini primary" onClick={() => { setLoginErr(''); setShowLogin(true) }}>Đăng nhập</button>
            </>
          )}
        </div>
      </header>

      {tab === 'home' && (
        <HomNay snaps={snaps} loading={loading} onGoNap={() => setTab('nap')}
          user={user} profile={profile}
          onOpenLogin={() => { setLoginErr(''); setShowLogin(true) }}
          onOpenAccount={openAccount} />
      )}
      {tab === 'sales' && <SalesReport snaps={snaps} loading={loading} onGoNap={() => setTab('nap')} user={user} />}
      {tab === 'team' && (
        <Placeholder icon="👥" title="Đội ngũ — Đang xây dựng, đợt sau"
          desc="Đợt tiếp theo theo SPEC v3: danh sách Unit bấm xổ TVV, FYP từng người, Act/MOC tự tính từ Daily Sales. Hiện tại đã có Hôm nay + Sales Report + Nạp dữ liệu." />
      )}
      {tab === 'nap' && <NapDuLieu onSaved={reload} user={user} />}

      <nav className="bottom-nav">
        <div className="inner">
          {NAV.map((n) => (
            <button key={n.id} className={`nav-btn ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
              <span className="ic">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </nav>

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
                  <input autoComplete="username" value={loginForm.id} placeholder="VD: 12345678 hoặc admin@d07.com"
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
                  (tối thiểu 6 ký tự). Tạo xong, khối “Của tôi” tự hiện tên TVV, Unit và phân loại
                  của bạn — đối chiếu theo MSĐL trong file Daily Sales.
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
            <p className="muted" style={{ marginBottom: 10 }}>
              Có mã TVV, màn hình Hôm nay sẽ hiện thẻ “Của tôi”: FYP/FYC của riêng bạn, số hồ sơ nộp/phát hành/pending và hạng phát hành trong GA.
            </p>
            <button className="btn-primary" disabled={acctBusy} onClick={handleSaveAccount}>
              {acctBusy ? 'Đang lưu…' : '💾 Lưu hồ sơ'}
            </button>
            {acctMsg ? <div className={`msg ${acctMsg.startsWith('✓') ? 'success' : 'info'}`}>{acctMsg}</div> : null}
            <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowAccount(false)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  )
}
