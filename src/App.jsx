// ─────────────────────────────────────────────────────────────
// App — Dashboard D07 Moi (MVP).
// Shell mobile-first: 1 cot, max-width 560px, thanh dieu huong 4 nut co dinh
// duoi day (nut >= 44px). Man hinh dung that: Hom Nay + Sales Report + Nap du lieu.
// Doi ngu: the placeholder trung thuc, lam o dot sau theo SPEC v3.
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react'
import HomNay from './components/HomNay.jsx'
import NapDuLieu from './components/NapDuLieu.jsx'
import SalesReport from './components/SalesReport.jsx'
import { loadLocalSnapshots, fetchFirestoreSnapshots, getFbConfig } from './lib/store'

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

  const newest = snaps.length ? snaps[snaps.length - 1] : null

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>GA D07</h1>
        <div className="sub">
          {newest
            ? <>Cập nhật đến {fmtDateVN(newest.id)} · nguồn: {source}</>
            : 'Dashboard mới — gọn & thiết thực'}
        </div>
      </header>

      {tab === 'home' && <HomNay snaps={snaps} loading={loading} onGoNap={() => setTab('nap')} />}
      {tab === 'sales' && <SalesReport snaps={snaps} loading={loading} onGoNap={() => setTab('nap')} />}
      {tab === 'team' && (
        <Placeholder icon="👥" title="Đội ngũ — Đang xây dựng, đợt sau"
          desc="Đợt tiếp theo theo SPEC v3: danh sách Unit bấm xổ TVV, FYP từng người, Act/MOC tự tính từ Daily Sales. Hiện tại đã có Hôm nay + Sales Report + Nạp dữ liệu." />
      )}
      {tab === 'nap' && <NapDuLieu onSaved={reload} />}

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
    </div>
  )
}
