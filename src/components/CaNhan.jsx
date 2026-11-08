// ─────────────────────────────────────────────────────────────
// CaNhan — Trang ca nhan cua TVV (tab "👤 Của tôi").
// Chi hien khi dang nhap bang tai khoan MSDL (TVV) va khong phai Admin
// chinh; App TU NHAY sang tab nay ngay sau khi TVV dang nhap thanh cong
// (da duoc duyet). Trang chi xem du lieu cua CHINH user dang dang nhap
// (doi chieu viewerMsdl nhu DoiNgu) — khong co cach xem cua nguoi khac.
// Noi dung: the dau (avatar doi duoc + ten/Unit/phan loai/MSDL) · thanh
// xep chong gia tri ho so cua minh (groupValue nhu Tinh Anh/Trang Chu)
// · luoi chi so ca nhan tu sheet Agent · danh sach ho so cua chinh minh
// chia 3 nhom Phat hanh / Pending / Chua len phi (so Policy hien DAY DU
// vi day la trang cua chinh chu).
// Nguon: snapshot Daily moi nhat, dung chung buildCases + buildTeam voi
// cac man khac (App truyen snaps xuong nhu DoiNgu).
// ─────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from 'react'
import { buildCases, groupValue } from '../lib/cases'
import { buildTeam, flattenAgents } from '../lib/team'
import { uploadAvatar } from '../lib/store'
import { emailToMsdl } from '../lib/firebaseConfig'

const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN')
const fmtCase = (n) => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('vi-VN')
const fmtPct = (n) => `${(Math.round((Number(n) || 0) * 10) / 10).toLocaleString('vi-VN')}%`
const fmtDateVN = (iso) => {
  if (!iso) return '—'
  const p = String(iso).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(iso)
}

// Chu cai dau avatar du phong (giong DoiNgu): 2 tu cuoi cua ten.
const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
const segKey = (agSeg) => {
  const s = String(agSeg || '').toLowerCase()
  if (s.includes('diamond')) return 'diamond'
  if (s.includes('platinum')) return 'platinum'
  if (s.includes('gold')) return 'gold'
  return 'other'
}
const AVATAR_CLASS = { diamond: 'bv-av-dia', platinum: 'bv-av-pla', gold: 'bv-av-gold', other: 'bv-av-oth' }

// Gia tri + nhan tien tren the ho so cua CHINH MINH — khop groupValue:
// IF = IP Net (phat hanh rong); PS/Pipeline = APE neu co, khong thi IP Sub.
const caseValue = (c) => {
  if (c.effectiveStatus === 'IF') return { value: groupValue(c), label: 'IP Net' }
  const ape = Number(c.ape) || 0
  return ape > 0 ? { value: ape, label: 'APE' } : { value: Number(c.ipSub) || 0, label: 'IP Sub' }
}
const PILL_CLASS = { IF: 'pill-if', PS: 'pill-ps', PIPELINE: 'pill-pipe' }
const CARD_CLASS = { IF: 'st-if', PS: 'st-ps', PIPELINE: 'st-pipe' }
const PILL_LABEL = { IF: 'Phát hành', PS: 'Pending', PIPELINE: 'Chưa lên phí' }

export default function CaNhan({ snaps, loading, user, profile, onProfileUpdate }) {
  const viewerMsdl = String((profile && profile.msdl) || emailToMsdl(user && user.email) || '').trim().toUpperCase()
  const avatarUrl = profile?.avatarUrl || ''
  const [avBusy, setAvBusy] = useState(false)
  const [avMsg, setAvMsg] = useState('')
  const fileRef = useRef(null)

  const newest = snaps && snaps.length ? snaps[snaps.length - 1] : null

  const view = useMemo(() => {
    if (!newest || !viewerMsdl) return null
    const [year, month] = newest.id.split('-').map(Number)
    const cases = buildCases(newest)
    const team = buildTeam(newest, cases)
    const agents = flattenAgents(team)
    const myView = agents.find((a) => String(a.msdl || '').trim().toUpperCase() === viewerMsdl) || null
    const agentsObj = newest.data?.agents || {}
    const rawAgent = agentsObj[viewerMsdl]
      || Object.values(agentsObj).find((a) => String(a.msdl || '').trim().toUpperCase() === viewerMsdl)
      || null
    const myCases = cases.filter((c) => String(c.msdl || '').trim().toUpperCase() === viewerMsdl)
    // Phat hanh + Chua len phi: moi nhat truoc (theo ngay nop, khong co
    // ngay xep cuoi). Pending: cho lau nhat truoc (can xu ly truoc).
    const byDateDesc = (x, y) => String(y.proposalDate || '').localeCompare(String(x.proposalDate || ''))
    const issued = myCases.filter((c) => c.effectiveStatus === 'IF').slice().sort(byDateDesc)
    const pending = myCases.filter((c) => c.effectiveStatus === 'PS').slice()
      .sort((x, y) => (y.ageDays ?? -1) - (x.ageDays ?? -1) || byDateDesc(x, y))
    const pipeline = myCases.filter((c) => c.effectiveStatus === 'PIPELINE').slice().sort(byDateDesc)
    return { year, month, myView, rawAgent, issued, pending, pipeline }
  }, [newest, viewerMsdl])

  const handleAvatarFile = async (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f || !user) return
    setAvBusy(true)
    setAvMsg('')
    const res = await uploadAvatar(user.uid, f)
    setAvBusy(false)
    if (res.ok) {
      if (onProfileUpdate && res.profile) onProfileUpdate(res.profile)
      setAvMsg(res.cloud ? '✓ Đã đổi ảnh đại diện.' : '✓ Đã đổi ảnh trên máy này; bản mây sẽ cập nhật khi Rules sẵn sàng.')
    } else {
      setAvMsg(res.error || 'Đổi ảnh không thành công.')
    }
  }

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }

  const displayName = view?.myView?.agName || view?.rawAgent?.agName || profile?.displayName || (viewerMsdl ? `TVV ${viewerMsdl}` : 'TVV')
  const unit = view?.myView?.unit || view?.rawAgent?.unit || ''
  const agSeg = view?.myView?.agSeg || view?.rawAgent?.agSeg || ''
  const sk = segKey(agSeg)

  const renderCase = (c) => {
    const v = caseValue(c)
    const st = c.effectiveStatus
    return (
      <div className={`case-card ${CARD_CLASS[st] || ''}`} key={c.proposalNum}>
        <div className="case-head" style={{ cursor: 'default' }}>
          <div className="case-main">
            <div className="case-num">{c.policyNum || c.proposalNum}</div>
            <div className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>
              {c.policyNum ? 'Số HĐ' : 'HSYC'}{c.policyNum && c.proposalNum ? ` · HSYC ${c.proposalNum}` : ''}
            </div>
            <div className="case-meta">
              {c.poName ? <>KH {c.poName} · </> : null}
              {c.product ? <>{c.product} · </> : null}
              Nộp {fmtDateVN(c.proposalDate)}
              {st === 'IF' && c.firstIssuedDate ? <> · PH {fmtDateVN(c.firstIssuedDate)}</> : null}
              {st === 'PS' && c.ageDays !== null && c.ageDays !== undefined
                ? <> · chờ {c.ageDays} ngày{c.ageBucket ? <span className={`age-chip ${c.ageDays > 7 ? 'hot' : ''}`}>{c.ageBucket} ngày</span> : null}</>
                : null}
            </div>
            {st === 'PS' && (c.pendingReasons || []).length > 0 ? (
              <div style={{ marginTop: 5 }}>
                {c.pendingReasons.map((r) => <span className="reason-chip" key={r}>{r}</span>)}
              </div>
            ) : null}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="case-ip">{fmtTr(v.value)} tr <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{v.label}</span></div>
            <span className={`pill ${PILL_CLASS[st] || 'pill-other'}`}>{PILL_LABEL[st] || st}</span>
          </div>
        </div>
      </div>
    )
  }

  const renderGroup = (title, list) => (
    <div className="card">
      <h2>{title} ({list.length})</h2>
      {list.length === 0
        ? <div className="muted">Chưa có hồ sơ</div>
        : list.map(renderCase)}
    </div>
  )

  // Luoi chi so: lay tu agent tho (sheet Agent sau parse) — day du ca
  // FYC nam (fycYtd) + Case Net ma agentView cua team.js khong mang theo;
  // thieu agent tho thi lui ve agentView (2 chi so do hien '—').
  const met = view ? (view.rawAgent || view.myView) : null
  const metVal = (k) => (met && met[k] !== undefined && met[k] !== null ? met[k] : null)
  const metTr = (k) => (metVal(k) === null ? '—' : `${fmtTr(metVal(k))} tr`)

  const bar = view?.myView?.bar || { issued: 0, pending: 0, pipeline: 0, total: 0 }
  const barPct = (v) => (bar.total > 0 ? (v / bar.total) * 100 : 0)

  return (
    <div>
      {/* ── The dau: avatar + danh tinh ── */}
      <div className="card">
        <div className="me-head">
          {avatarUrl ? (
            <img className="me-avatar" src={avatarUrl} alt={displayName} />
          ) : (
            <div className={`me-avatar me-avatar-fallback ${AVATAR_CLASS[sk]}`}>{initials(displayName)}</div>
          )}
          <div className="me-head-info">
            <div className="me-name">{displayName}</div>
            <div className="me-sub">
              {unit ? <>Unit {unit}</> : null}
              {unit && agSeg ? ' · ' : null}
              {agSeg ? <>Phân loại: {agSeg}</> : null}
            </div>
            <div className="me-sub">MSĐL {viewerMsdl || '—'}</div>
            <div style={{ marginTop: 9 }}>
              <button type="button" className="btn-mini" disabled={avBusy} onClick={() => fileRef.current && fileRef.current.click()}>
                {avBusy ? 'Đang tải ảnh…' : '📷 Đổi ảnh'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
            </div>
          </div>
        </div>
        {avMsg ? <div className={`msg ${avMsg.startsWith('✓') ? 'success' : 'error'}`}>{avMsg}</div> : null}
        <p className="muted" style={{ marginTop: 10 }}>
          Ảnh đại diện được nén nhỏ và lưu trên hệ thống — hiện ở đây, ở khối “Của tôi” trên Trang Chủ và ở hàng của bạn bên tab Tinh Anh.
        </p>
      </div>

      {!newest || !view ? (
        <div className="card empty">
          <div className="e-ic">📭</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có dữ liệu Daily Sales</div>
          <p>Số liệu cá nhân sẽ hiện tại đây sau khi có bản Daily Sales mới nhất.</p>
        </div>
      ) : !met ? (
        <div className="card empty">
          <div className="e-ic">🔎</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có dữ liệu Daily cho MSĐL {viewerMsdl}</div>
          <p>
            Bản Daily tháng {view.month}/{view.year} hiện chưa có mã số đại lý của bạn trong sheet Agent.
            Dữ liệu sẽ tự hiện ở đây sau khi có bản Daily mới nhất chứa MSĐL của bạn —
            nếu chắc chắn đã có số mà vẫn chưa thấy, hãy báo Admin chính kiểm tra lại MSĐL.
          </p>
        </div>
      ) : (
        <>
          {/* ── Thanh xep chong + tong gia tri ho so cua minh ── */}
          <div className="card">
            <h2>🧱 Hồ sơ của tôi — tháng {view.month}/{view.year}</h2>
            <div className="stack-bar">
              {bar.issued > 0 ? <div className="seg-issued" style={{ width: `${barPct(bar.issued)}%` }} /> : null}
              {bar.pending > 0 ? <div className="seg-pending" style={{ width: `${barPct(bar.pending)}%` }} /> : null}
              {bar.pipeline > 0 ? <div className="seg-pipe" style={{ width: `${barPct(bar.pipeline)}%` }} /> : null}
            </div>
            <div className="legend">
              <span><span className="dot" style={{ background: '#7c3aed' }} />Phát hành {fmtTr(bar.issued)} tr</span>
              <span><span className="dot" style={{ background: '#ec4899' }} />Pending {fmtTr(bar.pending)} tr</span>
              <span><span className="dot" style={{ background: '#06b6d4' }} />Chưa lên phí {fmtTr(bar.pipeline)} tr</span>
            </div>
            <div className="mini-stats" style={{ marginTop: 12, marginBottom: 0 }}>
              <div className="mini-stat"><div className="ms-num">{fmtTr(bar.total)} tr</div><div className="ms-label">Tổng giá trị hồ sơ</div></div>
              <div className="mini-stat"><div className="ms-num">{fmtInt(view.issued.length + view.pending.length + view.pipeline.length)}</div><div className="ms-label">Hồ sơ đang theo dõi</div></div>
              <div className="mini-stat"><div className="ms-num">{fmtInt(view.pending.length)}</div><div className="ms-label">Đang pending</div></div>
            </div>
          </div>

          {/* ── Chi so ca nhan tu sheet Agent ── */}
          <div className="card">
            <h2>📊 Chỉ số cá nhân — tháng {view.month}/{view.year}</h2>
            <div className="bv-ref-grid" style={{ marginBottom: 0 }}>
              <div className="bv-ref"><span>FYP tháng</span><b>{metTr('fyp')}</b></div>
              <div className="bv-ref"><span>FYC tháng</span><b>{metTr('fyc')}</b></div>
              <div className="bv-ref"><span>FYP năm</span><b>{metTr('fypYtd')}</b></div>
              <div className="bv-ref"><span>FYC quý</span><b>{metTr('fycQtd')}</b></div>
              <div className="bv-ref"><span>FYC năm</span><b>{metTr('fycYtd')}</b></div>
              <div className="bv-ref"><span>FYC 12 tháng</span><b>{metTr('fycL12m')}</b></div>
              <div className="bv-ref"><span>TLDTPTT</span><b>{metVal('tldtptt') === null ? '—' : fmtPct(metVal('tldtptt'))}</b></div>
              <div className="bv-ref"><span>Case Sub</span><b>{metVal('caseSub') === null ? '—' : fmtCase(metVal('caseSub'))}</b></div>
              <div className="bv-ref"><span>Case Net</span><b>{metVal('caseNet') === null ? '—' : fmtCase(metVal('caseNet'))}</b></div>
              <div className="bv-ref"><span>IP phát hành</span><b>{metTr('ipNet')}</b></div>
            </div>
          </div>

          {/* ── Ho so cua chinh minh theo 3 nhom ── */}
          {renderGroup('✅ Phát hành', view.issued)}
          {renderGroup('⏳ Pending', view.pending)}
          {renderGroup('🌱 Chưa lên phí', view.pipeline)}
        </>
      )}
    </div>
  )
}
