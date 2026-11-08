// ─────────────────────────────────────────────────────────────
// DoiNgu — Man hinh "Doi Ngu" (SPEC v3, man hinh 3).
// DOT LAM LAI THEO MAU D03 (Lan gui anh Bang Vang + bang chi so TVV,
// 08/11/2026): bo cach hien theo NHOM Unit/xo nhom + MOC, chuyen sang
// DANH SACH TVV XEP HANG kieu BANG VANG:
//  - Moi TVV: avatar chu cai dau (mau theo phan loai AGSeg), huy hieu
//    top 3, ten + "{Unit} · {Phan loai}", THANH XEP CHONG 3 nhom gia tri
//    (Phat hanh tim / Pending hong / Chua len phi xanh duong — tinh bang
//    groupValue cua lib/cases), tong gia tri + so HS (Case Sub) ben phai.
//  - Sap xep: IP phat hanh (mac dinh) / Tong nop / FYP thang + tim kiem.
//  - Bam vao 1 TVV -> mo rong: luoi chi so tham khao (FYP nam, FYC quy,
//    FYC thang, FYC 12 thang, IP nop, IP phat hanh, TLDTPTT) + danh sach
//    HO SO PENDING cua chinh TVV do (so Policy che theo quyen nhu
//    Sales Report, kem ly do + tuoi pending).
// Logic MOC/Unit van con trong lib/team.js (buildTeam) nhung UI khong
// dung nua — Lan chot bo hien theo nhom.
// ─────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react'
import { buildCases } from '../lib/cases'
import { buildTeam, rankAgents } from '../lib/team'
import { maskSensitive } from '../lib/analyze'
import { isSuperAdmin, emailToMsdl } from '../lib/firebaseConfig'

const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN')
// Case Sub co the le thap phan (vd 6,5): nguyen thi hien nguyen, le thi
// 1 chu so thap phan voi dau phay Viet.
const fmtCaseSub = (n) => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('vi-VN')
const fmtPct = (n) => `${(Math.round((Number(n) || 0) * 10) / 10).toLocaleString('vi-VN')}%`
const fmtDateVN = (iso) => {
  if (!iso) return '—'
  const p = String(iso).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(iso)
}

const SORTS = [
  { id: 'ipNet', label: 'IP phát hành' },
  { id: 'barTotal', label: 'Tổng nộp' },
  { id: 'fyp', label: 'FYP tháng' },
]
const MEDALS = ['🥇', '🥈', '🥉']
const ROW_BG = ['bv-r1', 'bv-r2', 'bv-r3']

// Phan loai AGSeg trong file that co ca gia tri khong phai hang (SA, M12+,
// Terminated...) — chi 3 hang Diamond/Platinum/Gold moi co mau rieng.
const segKey = (agSeg) => {
  const s = String(agSeg || '').toLowerCase()
  if (s.includes('diamond')) return 'diamond'
  if (s.includes('platinum')) return 'platinum'
  if (s.includes('gold')) return 'gold'
  return 'other'
}
const AVATAR_CLASS = { diamond: 'bv-av-dia', platinum: 'bv-av-pla', gold: 'bv-av-gold', other: 'bv-av-oth' }
const SEG_TEXT_CLASS = { diamond: 'bv-seg-dia', platinum: 'bv-seg-pla', gold: 'bv-seg-gold', other: '' }

// Chu cai dau avatar: lay 2 tu cuoi cua ten (ten rieng kieu Viet), vd
// "Nguyen Thi Minh Thai" -> "MT", "Pham Hoang Thai Tai" -> "TT".
const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function DoiNgu({ snaps, loading, onGoNap, user, profile, isSuperAdmin: adminProp, onOpenLogin }) {
  // Admin chinh xem so Policy DAY DU trong phan pending; con lai che 2 so cuoi.
  const isAdmin = typeof adminProp === 'boolean' ? adminProp : isSuperAdmin(user)
  const canSeeFull = isAdmin
  const [sortKey, setSortKey] = useState('ipNet')
  const [search, setSearch] = useState('')
  const [openRows, setOpenRows] = useState(() => new Set())
  // Thong bao khi bam vao TVV ma minh khong co quyen mo chi tiet:
  // 'login' = chua dang nhap, 'own' = da dang nhap nhung khong phai chinh minh.
  const [gateNotice, setGateNotice] = useState('')

  // ── Rules mo chi tiet TVV (Lan chot 08/11/2026) ──
  // Chua dang nhap: chi xem danh sach tong quan, khong mo duoc ai.
  // Da dang nhap (khong phai Admin): chi mo duoc CHINH MINH theo MSDL
  // (profile.msdl, hoac suy tu email <msdl>@d07.local cua tai khoan MSDL).
  // Admin chinh: mo duoc tat ca.
  const viewerMsdl = String((profile && profile.msdl) || emailToMsdl(user && user.email) || '').trim().toUpperCase()
  const isMine = (a) => !!viewerMsdl && String(a.msdl || '').trim().toUpperCase() === viewerMsdl
  const canOpenRow = (a) => isAdmin || (!!user && isMine(a))

  const newest = snaps && snaps.length ? snaps[snaps.length - 1] : null

  const view = useMemo(() => {
    if (!newest) return null
    const [year, month] = newest.id.split('-').map(Number)
    const cases = buildCases(newest)
    const team = buildTeam(newest, cases)
    return { year, month, team }
  }, [newest])

  const ranked = useMemo(
    () => (view ? rankAgents(view.team, sortKey) : []),
    [view, sortKey],
  )

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }
  if (!newest || !view) {
    return (
      <div className="card empty">
        <div className="e-ic">📭</div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có dữ liệu Daily Sales</div>
        {isAdmin ? (
          <>
            <p style={{ marginBottom: 14 }}>Hãy nạp file Daily Sales đầu tiên ở tab Nạp — đội ngũ tháng sẽ hiện ngay tại đây.</p>
            <button className="btn-primary" onClick={onGoNap}>📥 Đến tab Nạp dữ liệu</button>
          </>
        ) : (
          <p>Dữ liệu sẽ hiện tại đây sau khi Admin chính nạp file Daily Sales.</p>
        )}
      </div>
    )
  }

  const { year, month } = view

  // Chi TVV co so lieu thang (co gia tri ho so hoac co FYP) moi len bang;
  // so con lai gom 1 dong ghi chu o cuoi.
  const listed = ranked
    .map((a, i) => ({ a, rank: i + 1 }))
    .filter(({ a }) => a.bar.total > 0 || a.fyp > 0)
  const hiddenCount = ranked.length - listed.length

  const totalIpNet = ranked.reduce((s, a) => s + a.ipNet, 0)
  const pendCount = ranked.reduce((s, a) => s + a.pendingCases.length, 0)
  const pendValue = ranked.reduce((s, a) => s + a.bar.pending, 0)

  const query = search.trim().toLowerCase()
  const display = query
    ? listed.filter(({ a }) => String(a.agName || '').toLowerCase().includes(query) || String(a.msdl || '').toLowerCase().includes(query))
    : listed

  const toggleRow = (msdl) => {
    setOpenRows((s) => {
      const next = new Set(s)
      if (next.has(msdl)) next.delete(msdl)
      else next.add(msdl)
      return next
    })
  }

  // Bam vao 1 hang TVV: co quyen thi mo/dong chi tiet, khong thi hien
  // thong bao gate tuong ung (chua dang nhap / khong phai chinh minh).
  const handleRowClick = (a) => {
    if (canOpenRow(a)) { setGateNotice(''); toggleRow(a.msdl); return }
    setGateNotice(user ? 'own' : 'login')
  }

  const renderRow = ({ a, rank }) => {
    const open = openRows.has(a.msdl)
    const sk = segKey(a.agSeg)
    const bar = a.bar
    const pctOf = (v) => (bar.total > 0 ? (v / bar.total) * 100 : 0)
    return (
      <div className={`bv-row ${rank <= 3 ? ROW_BG[rank - 1] : ''}${isMine(a) ? ' bv-mine' : ''}`} key={a.msdl}>
        <button type="button" className="bv-head" onClick={() => handleRowClick(a)} aria-expanded={open}>
          <span className={`bv-avatar ${AVATAR_CLASS[sk]}`}>
            {isMine(a) && profile?.avatarUrl
              ? <img className="bv-avatar-img" src={profile.avatarUrl} alt="" />
              : initials(a.agName)}
            {rank <= 3 ? <span className="bv-medal">{MEDALS[rank - 1]}</span> : null}
          </span>
          <span className="bv-main">
            <span className="bv-name">
              {rank > 3 ? <span className="bv-rank">{rank}</span> : null}
              {a.agName || '—'}
              {isMine(a) ? <span className="bv-you">Bạn</span> : null}
            </span>
            <span className="bv-sub">
              {a.unit || '—'}
              {a.agSeg ? <> · <span className={SEG_TEXT_CLASS[sk]}>{a.agSeg}</span></> : null}
            </span>
            {bar.total > 0 ? (
              <>
                <span className="bv-bar">
                  {bar.issued > 0 ? <span className="bv-seg-issued" style={{ width: `${pctOf(bar.issued)}%` }} /> : null}
                  {bar.pending > 0 ? <span className="bv-seg-pending" style={{ width: `${pctOf(bar.pending)}%` }} /> : null}
                  {bar.pipeline > 0 ? <span className="bv-seg-pipeline" style={{ width: `${pctOf(bar.pipeline)}%` }} /> : null}
                </span>
                <span className="bv-nums">
                  {bar.issued > 0 ? <span className="bv-num-issued">Phát hành <b>{fmtTr(bar.issued)}</b></span> : null}
                  {bar.pending > 0 ? <span className="bv-num-pending">Pending <b>{fmtTr(bar.pending)}</b></span> : null}
                  {bar.pipeline > 0 ? <span className="bv-num-pipeline">Chưa lên phí <b>{fmtTr(bar.pipeline)}</b></span> : null}
                </span>
              </>
            ) : null}
          </span>
          <span className="bv-total">
            <span className="bv-total-num">{fmtTr(bar.total)}</span>
            <span className="bv-total-sub">{fmtCaseSub(a.caseSub)} HS</span>
          </span>
        </button>

        {open ? (
          <div className="bv-expand">
            <div className="bv-ref-grid">
              <div className="bv-ref"><span>FYP năm</span><b>{fmtTr(a.fypYtd)} tr</b></div>
              <div className="bv-ref"><span>FYC quý</span><b>{fmtTr(a.fycQtd)} tr</b></div>
              <div className="bv-ref"><span>FYC tháng</span><b>{fmtTr(a.fyc)} tr</b></div>
              <div className="bv-ref"><span>FYC 12 tháng</span><b>{fmtTr(a.fycL12m)} tr</b></div>
              <div className="bv-ref"><span>IP nộp</span><b>{fmtTr(a.ipSub)} tr</b></div>
              <div className="bv-ref"><span>IP phát hành</span><b>{fmtTr(a.ipNet)} tr</b></div>
              <div className="bv-ref"><span>TLDTPTT</span><b>{a.tldtptt === null ? '—' : fmtPct(a.tldtptt)}</b></div>
              <div className="bv-ref"><span>MSĐL · Unit</span><b>{a.msdl} · {a.unit || '—'}</b></div>
            </div>

            <div className="bv-pend-title">⏳ Hồ sơ pending ({a.pendingCases.length})</div>
            {a.pendingCases.length === 0 ? (
              <div className="muted">Không có hồ sơ pending 🎉</div>
            ) : a.pendingCases.map((pc) => (
              <div className="bv-pend" key={pc.proposalNum}>
                <div className="bv-pend-main">
                  <b>{maskSensitive(pc.policyNum || pc.proposalNum, canSeeFull)}</b>
                  {pc.policyNum ? null : <span className="muted"> (HSYC)</span>}
                  <span className="pill pill-ps">Pending</span>
                  <span className="bv-pend-val">{fmtTr(pc.value)} tr</span>
                </div>
                <div className="case-meta">
                  {pc.product ? `${pc.product} · ` : ''}Nộp {fmtDateVN(pc.proposalDate)}
                  {pc.ageDays !== null && pc.ageDays !== undefined ? (
                    <> · chờ {pc.ageDays} ngày{pc.ageBucket ? <span className={`age-chip ${pc.ageDays > 7 ? 'hot' : ''}`}>{pc.ageBucket} ngày</span> : null}</>
                  ) : null}
                </div>
                {pc.pendingReasons.length > 0 ? (
                  <div style={{ marginTop: 5 }}>
                    {pc.pendingReasons.map((r) => <span className="reason-chip" key={r}>{r}</span>)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      {/* ── Tong quan doi ngu thang ── */}
      <div className="card">
        <h2>🌟 Tinh Anh — tháng {month}/{year}</h2>
        <div className="mini-stats" style={{ marginBottom: 0 }}>
          <div className="mini-stat"><div className="ms-num">{fmtInt(listed.length)}</div><div className="ms-label">TVV có số liệu tháng</div></div>
          <div className="mini-stat"><div className="ms-num">{fmtTr(totalIpNet)}</div><div className="ms-label">Tổng IP phát hành (tr)</div></div>
          <div className="mini-stat"><div className="ms-num">{fmtInt(pendCount)}</div><div className="ms-label">Hồ sơ pending · {fmtTr(pendValue)} tr</div></div>
        </div>
      </div>

      {/* ── Tim kiem + sap xep ── */}
      <div className="search-row">
        <div className="field">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔎 Tìm TVV theo tên hoặc MSĐL…" />
        </div>
      </div>
      <div className="chips-row">
        {SORTS.map((s) => (
          <button key={s.id} className={`fchip ${sortKey === s.id ? 'active' : ''}`} onClick={() => setSortKey(s.id)}>{s.label}</button>
        ))}
      </div>

      {/* ── Thong bao gate khi bam TVV khong co quyen mo chi tiet ── */}
      {gateNotice ? (
        <div className="msg info" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {gateNotice === 'login' ? (
            <>
              <span>🔒 Đăng nhập để xem chi tiết của chính bạn.</span>
              {onOpenLogin ? <button type="button" className="btn-mini primary" onClick={onOpenLogin}>Đăng nhập</button> : null}
            </>
          ) : (
            <span>Bạn chỉ xem được chi tiết của chính mình (theo MSĐL).</span>
          )}
        </div>
      ) : null}

      {/* ── Bang Vang TVV ── */}
      <div className="card bv-card">
        <h2>🏆 Bảng Vàng — tháng {month}/{year}</h2>
        {query ? <div className="muted" style={{ marginBottom: 4 }}>Kết quả tìm “{search.trim()}”: {display.length} TVV</div> : null}
        {display.length === 0 ? (
          <div className="muted" style={{ padding: '10px 0' }}>
            {query ? 'Không thấy TVV nào khớp.' : 'Chưa có TVV nào có số liệu trong tháng này.'}
          </div>
        ) : display.map(renderRow)}
        {!query && hiddenCount > 0 ? (
          <div className="muted" style={{ paddingTop: 10 }}>… và {fmtInt(hiddenCount)} TVV chưa có số liệu tháng này</div>
        ) : null}
      </div>
      <p className="muted" style={{ margin: '0 2px' }}>
        Thanh màu trên mỗi TVV: tím = giá trị đã phát hành · hồng = đang pending · xanh dương = chưa lên phí
        (tính theo giá trị trưng bày của từng hồ sơ). Chi tiết từng TVV (chỉ số tham khảo + hồ sơ pending)
        chỉ Admin chính hoặc chính TVV đó — khi đã đăng nhập — mới mở xem được.
      </p>
    </div>
  )
}
