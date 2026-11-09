// ─────────────────────────────────────────────────────────────
// DoiNgu — Man hinh "Doi Ngu" (SPEC v3, man hinh 3).
// DOT LAM LAI THEO MAU D03 (Lan gui anh Bang Vang + bang chi so TVV,
// 08/11/2026): bo cach hien theo NHOM Unit/xo nhom + MOC, chuyen sang
// DANH SACH TVV XEP HANG kieu BANG VANG:
//  - Moi TVV: avatar (anh that qua avatarMap neu co — Admin chinh thay
//    cua MOI TVV, nguoi thuong chi thay cua chinh minh; chua co anh thi
//    chu cai dau mau theo phan loai AGSeg), huy hieu
//    top 3, ten + "{Unit} · {Phan loai}", THANH XEP CHONG 3 nhom gia tri
//    (Phat hanh tim / Pending hong / Chua len phi xanh duong — tinh bang
//    groupValue cua lib/cases), tong gia tri + so HS (Case Sub) ben phai.
//  - Sap xep: IP phat hanh (mac dinh) / Tong nop / FYP thang + tim kiem.
//  - Bam vao 1 TVV -> mo rong: luoi chi so tham khao (FYP nam, FYC quy,
//    FYC thang, FYC 12 thang, IP nop, IP phat hanh, TLDTPTT) + danh sach
//    HO SO PENDING cua chinh TVV do (so Policy: Admin chinh + hang cua
//    chinh TVV dang dang nhap thi hien DAY DU, con lai che 2 so cuoi;
//    kem ly do + tuoi pending).
// Logic MOC/Unit van con trong lib/team.js (buildTeam).
// DOT 09/11/2026 (Lan yeu cau): them MUC PHONG (Unit) trong cung tab —
// thanh chuyen che do [Ca nhan | Phong]; muc Phong KHOA theo quyen
// (Admin chinh / duoc cap canViewUnit / UM-BM tu nhan dien qua Daily),
// khong co quyen thi an han nut Phong.
// DOT BO SUNG 09/11/2026 (Lan phan hoi ban live): (1) Admin chinh thay
// AVATAR that cua moi TVV o Tinh Anh qua avatarMap (App xay tu
// fetchAllProfiles; ban dau chi hang cua chinh user moi co anh vi chi
// doc duoc profile cua minh). (2) The Unit BAM MO CHI TIET (accordion):
// Admin mo moi Unit; nguoi khac CHI mo Unit minh dung dau (MSDL trung
// leaderCode cua Unit) — trong chi tiet liet ke TVV theo 2 nhom
// Dang Active / Chua Active (Active = caseNet > 0 nhu toan app).
// DOT CHINH PHONG 09/11/2026 (Lan chot sau doi soat 2 file that):
// (1) dong TVV trong chi tiet Unit hien FYC thang thay FYP thang;
// (2) muc Phong CHI liet ke Unit co trong sheet Leader (leaderUnits);
// (3) the Unit BO badge/moc MOC — hien "Luot Active" = cot
// '#Active Agent (FYC) Unit' cua sheet Leader (activeFycUnit),
// chua co so thi hien "–". Nhom Active trong chi tiet GIU chuan
// Case Net nhu cu.
// ─────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react'
import { buildCases } from '../lib/cases'
import { buildTeam, rankAgents, flattenAgents, filterLeaderUnits } from '../lib/team'
import { maskSensitive } from '../lib/analyze'
import { isSuperAdmin, emailToMsdl, canViewUnitSection } from '../lib/firebaseConfig'

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

export default function DoiNgu({ snaps, loading, onGoNap, user, profile, isSuperAdmin: adminProp, onOpenLogin, avatarMap = {} }) {
  // So Policy DAY DU: Admin chinh (moi hang) + CHINH TVV do o hang cua
  // minh (Lan yeu cau 09/11/2026: xem day du so ho so trong data cua
  // minh); cac truong hop con lai che con 2 so cuoi.
  const isAdmin = typeof adminProp === 'boolean' ? adminProp : isSuperAdmin(user)
  const canSeeFull = isAdmin
  const [sortKey, setSortKey] = useState('ipNet')
  const [search, setSearch] = useState('')
  const [openRows, setOpenRows] = useState(() => new Set())
  // Che do xem: 'personal' (Bang Vang TVV — mac dinh) | 'unit' (muc
  // Phong, chi nguoi co quyen moi thay nut chuyen — xem canUnit duoi).
  const [viewMode, setViewMode] = useState('personal')
  // Thong bao khi bam vao TVV ma minh khong co quyen mo chi tiet:
  // 'login' = chua dang nhap, 'own' = da dang nhap nhung khong phai chinh minh.
  const [gateNotice, setGateNotice] = useState('')
  // Chi tiet Unit (muc Phong): ma Unit dang mo accordion + co thong bao
  // khi bam vao Unit khong phai phong minh phu trach.
  const [openUnitCode, setOpenUnitCode] = useState('')
  const [unitNotice, setUnitNotice] = useState(false)

  // ── Rules mo chi tiet TVV (Lan chot 08/11/2026) ──
  // Chua dang nhap: chi xem danh sach tong quan, khong mo duoc ai.
  // Da dang nhap (khong phai Admin): chi mo duoc CHINH MINH theo MSDL
  // (profile.msdl, hoac suy tu email <msdl>@d07.local cua tai khoan MSDL).
  // Admin chinh: mo duoc tat ca.
  const viewerMsdl = String((profile && profile.msdl) || emailToMsdl(user && user.email) || '').trim().toUpperCase()
  const isMine = (a) => !!viewerMsdl && String(a.msdl || '').trim().toUpperCase() === viewerMsdl
  const canOpenRow = (a) => isAdmin || (!!user && isMine(a))

  // Avatar that theo MSDL (avatarMap do App truyen xuong): Admin chinh
  // co map cua MOI TVV, nguoi thuong chi co cua chinh minh. Khong co
  // trong map -> render chu cai dau nhu truoc.
  const avatarOf = (msdl) => avatarMap[String(msdl || '').trim().toUpperCase()] || ''

  // ── Quyen mo CHI TIET Unit (muc Phong) ──
  // Admin chinh: mo moi Unit. Nguoi khac: CHI Unit minh dung dau —
  // MSDL trung leaderCode cua Unit (sheet Leader). Nguoi co canViewUnit
  // nhung khong dung dau Unit nao thi van xem danh sach the tong quan,
  // bam vao Unit khong phai cua minh se hien thong bao khoa.
  const isMyUnit = (u) => !!viewerMsdl && !!u.leaderCode
    && String(u.leaderCode).trim().toUpperCase() === viewerMsdl
  const canOpenUnit = (u) => isAdmin || isMyUnit(u)
  const handleUnitClick = (u) => {
    if (canOpenUnit(u)) {
      setUnitNotice(false)
      setOpenUnitCode((cur) => (cur === u.unit ? '' : u.unit))
    } else {
      setUnitNotice(true)
    }
  }

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

  // ── Quyen xem muc Phong (Unit) — Lan chot 09/11/2026 ──
  // isLeader tu snapshot Daily hien tai, 2 nguon doi chieu file that
  // 25.10 khop nhau: (1) AGLevel cua chinh TVV trong sheet Agent la
  // 'UM'/'BM'; (2) MSDL trung LeaderCode cua 1 Unit trong sheet Leader.
  const isLeader = useMemo(() => {
    if (!viewerMsdl || !view) return false
    const mine = flattenAgents(view.team).find(
      (a) => String(a.msdl || '').trim().toUpperCase() === viewerMsdl,
    )
    const lv = String((mine && mine.level) || '').trim().toUpperCase()
    if (lv === 'UM' || lv === 'BM') return true
    const unitsObj = (newest && newest.data && newest.data.units) || {}
    return Object.values(unitsObj).some(
      (u) => String((u && u.leaderCode) || '').trim().toUpperCase() === viewerMsdl,
    )
  }, [viewerMsdl, view, newest])
  const canUnit = canViewUnitSection(user, profile, isLeader)
  // Khong co quyen thi che do hieu luc luon la Ca nhan (nut Phong an han).
  const mode = viewMode === 'unit' && canUnit ? 'unit' : 'personal'

  // Danh sach Unit cho muc Phong: tai dung buildTeam (da co leaderName,
  // agentCount, fyp, activeFycUnit + bar tung TVV), cong don IP phat hanh /
  // gia tri pending theo groupValue, sap xep FYP giam dan.
  // CHI LIET KE Unit co trong sheet Leader (snapshot.data.leaderUnits —
  // Unit co truong phong chinh thuc; Lan chot 09/11/2026). Snapshot cu
  // khong co leaderUnits thi filterLeaderUnits tra nguyen danh sach.
  const unitRows = useMemo(() => {
    if (!view) return []
    const leaderUnits = (newest && newest.data && newest.data.leaderUnits) || null
    return filterLeaderUnits(view.team.units, leaderUnits)
      .map((u) => ({
        ...u,
        ipIssued: u.agents.reduce((s, a) => s + ((a.bar && a.bar.issued) || 0), 0),
        pendValue: u.agents.reduce((s, a) => s + ((a.bar && a.bar.pending) || 0), 0),
      }))
      .sort((x, y) => y.fyp - x.fyp || String(x.unit).localeCompare(String(y.unit)))
  }, [view, newest])

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
    // Hang cua chinh minh -> so Policy hien DAY DU (khong che).
    const rowFull = canSeeFull || isMine(a)
    const sk = segKey(a.agSeg)
    const bar = a.bar
    const pctOf = (v) => (bar.total > 0 ? (v / bar.total) * 100 : 0)
    return (
      <div className={`bv-row ${rank <= 3 ? ROW_BG[rank - 1] : ''}${isMine(a) ? ' bv-mine' : ''}`} key={a.msdl}>
        <button type="button" className="bv-head" onClick={() => handleRowClick(a)} aria-expanded={open}>
          <span className={`bv-avatar ${AVATAR_CLASS[sk]}`}>
            {avatarOf(a.msdl)
              ? <img className="bv-avatar-img" src={avatarOf(a.msdl)} alt="" />
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
                  <b>{maskSensitive(pc.policyNum || pc.proposalNum, rowFull)}</b>
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

  // 1 dong TVV trong CHI TIET Unit: avatar (anh that neu co trong
  // avatarMap, khong thi chu cai dau) + ten + phan loai + MSDL + FYC
  // thang (Lan chot 09/11/2026: FYC thay FYP o dong nay) + Case Net +
  // IP phat hanh; badge theo isAct (caseNet > 0 — dinh nghia Active
  // dung chung toan app, xem lib/team.js).
  const renderUnitMember = (a) => (
    <div className="tvv-row" key={a.msdl}>
      <span className={`bv-avatar unit-av ${AVATAR_CLASS[segKey(a.agSeg)]}`}>
        {avatarOf(a.msdl)
          ? <img className="bv-avatar-img" src={avatarOf(a.msdl)} alt="" />
          : initials(a.agName)}
      </span>
      <span className="tvv-main">
        <span className="tvv-name">
          <span className="nm">{a.agName || '—'}</span>
          {a.agSeg ? <span className="seg-chip">{a.agSeg}</span> : null}
        </span>
        <span className="tvv-nums">
          MSĐL {a.msdl} · FYC {fmtTr(a.fyc)} tr · Case Net {fmtInt(a.caseNet)} · IP phát hành {fmtTr(a.ipNet)} tr
        </span>
      </span>
      <span className={`act-badge ${a.isAct ? 'ok' : 'no'}`}>{a.isAct ? '✓ Active' : 'Chưa Active'}</span>
    </div>
  )

  // The Unit o muc Phong: chi so tong (nhu ban truoc) + dau the BAM MO
  // CHI TIET khi co quyen mo (canOpenUnit): mo duoc thi co chu
  // "Xem chi tiet", khong mo duoc thi khoa 🔒 o goc phai va bam vao se
  // hien thong bao. Chi tiet: dong tong (% Active, FYP) + 2 nhom
  // Dang Active / Chua Active (agents da sap FYP giam dan o buildTeam).
  const renderUnitCard = (u) => {
    const openable = canOpenUnit(u)
    const open = openable && openUnitCode === u.unit
    const actList = u.agents.filter((a) => a.isAct)
    const inactList = u.agents.filter((a) => !a.isAct)
    const actPct = u.agentCount > 0 ? Math.round((u.actCount / u.agentCount) * 100) : 0
    return (
      <div className={`card unit-card${isMyUnit(u) ? ' unit-mine' : ''}`} key={u.unit || '—'}>
        <button type="button" className="unit-head" onClick={() => handleUnitClick(u)} aria-expanded={open}>
          <span className="unit-main">
            <span className="unit-name">
              🏢 Unit {u.unit || '—'}
              {isMyUnit(u) ? <span className="bv-you">Phòng của bạn</span> : null}
            </span>
            {u.leaderName ? <span className="muted" style={{ display: 'block' }}>Trưởng phòng: {u.leaderName}</span> : null}
          </span>
          <span className="unit-head-right">
            {openable
              ? <span className="unit-open-hint">{open ? 'Thu gọn ▴' : 'Xem chi tiết ▾'}</span>
              : <span className="unit-lock" title="Chỉ Trưởng phòng của Unit này mới xem được chi tiết TVV">🔒</span>}
          </span>
        </button>
        <div className="mini-stats" style={{ margin: '10px 0' }}>
          <div className="mini-stat"><div className="ms-num">{fmtInt(u.agentCount)}</div><div className="ms-label">TVV</div></div>
          <div className="mini-stat"><div className="ms-num">{fmtTr(u.fyp)}</div><div className="ms-label">FYP tháng (tr)</div></div>
          <div className="mini-stat"><div className="ms-num">{u.activeFycUnit === null || u.activeFycUnit === undefined ? '–' : fmtInt(u.activeFycUnit)}</div><div className="ms-label">Lượt Active</div></div>
        </div>
        <div className="unit-nums">
          <span>TVV đạt Act: <b>{fmtInt(u.actCount)}/{fmtInt(u.agentCount)}</b></span>
          <span>IP phát hành: <b>{fmtTr(u.ipIssued)} tr</b></span>
          <span>Đang pending: <b>{fmtTr(u.pendValue)} tr</b></span>
        </div>
        {open ? (
          <div className="unit-detail">
            {u.agentCount === 0 ? (
              <div className="muted">Unit chưa có TVV nào trong dữ liệu tháng này.</div>
            ) : (
              <>
                <div className="unit-sum">
                  Tổng: <b>{fmtInt(u.agentCount)} TVV</b> · Đang Active <b>{fmtInt(u.actCount)} ({actPct}%)</b> · FYP <b>{fmtTr(u.fyp)} tr</b>
                </div>
                <div className="unit-group-title">✅ Đang Active ({actList.length})</div>
                {actList.length === 0
                  ? <div className="muted">Chưa có TVV nào đạt Active trong tháng này.</div>
                  : actList.map(renderUnitMember)}
                <div className="unit-group-title">⬜ Chưa Active ({inactList.length})</div>
                {inactList.length === 0
                  ? <div className="muted">Tất cả TVV trong phòng đều đã Active 🎉</div>
                  : inactList.map(renderUnitMember)}
              </>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      {/* ── Thanh chuyen che do Ca nhan / Phong ──
          Nut Phong CHI hien khi co quyen (Admin chinh / duoc cap quyen
          canViewUnit / UM-BM theo Daily) — khong quyen thi an han, nhat
          quan voi cach tab Sales Report va tab Nap bi an. */}
      {canUnit ? (
        <div className="chips-row" style={{ marginBottom: 12 }}>
          <button className={`fchip ${mode === 'personal' ? 'active' : ''}`} onClick={() => setViewMode('personal')}>👤 Cá nhân</button>
          <button className={`fchip ${mode === 'unit' ? 'active' : ''}`} onClick={() => setViewMode('unit')}>🏢 Phòng</button>
        </div>
      ) : null}

      {mode === 'unit' ? (
        <>
          {/* ── Muc Phong (Unit): chi so tung Unit, sap xep FYP giam dan ── */}
          <div className="card">
            <h2>🏢 Phòng (Unit) — tháng {month}/{year}</h2>
            <div className="muted">
              Chỉ gồm các phòng có trong sheet Leader (có trưởng phòng).
              Lượt Active: số TVV Active theo FYC của phòng (theo sheet Leader); phòng hiện “–” là file chưa có số.
            </div>
          </div>
          {unitNotice ? (
            <div className="msg info" style={{ marginBottom: 12 }}>
              <span>🔒 Bạn chỉ xem được chi tiết phòng do mình phụ trách.</span>
            </div>
          ) : null}
          {unitRows.length === 0 ? (
            <div className="card empty"><div className="e-ic">📭</div>Chưa có Unit nào trong dữ liệu tháng này.</div>
          ) : unitRows.map(renderUnitCard)}
        </>
      ) : (
      <>
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
      </>
      )}
    </div>
  )
}
