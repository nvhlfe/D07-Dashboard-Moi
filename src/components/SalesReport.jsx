// ─────────────────────────────────────────────────────────────
// SalesReport — Man hinh "Sales Report" (SPEC v3, man hinh 2):
// NHAT KY TUNG HO SO, khong phai nhap tay tong so theo TVV.
// CAU TRUC (dot lam lai theo mau D03, Lan chot 08/11/2026):
//  - The tom tat thang: phat hanh rong (tru CF lien thang) + THANH XEP
//    CHONG TOAN GA theo gia tri trung bay (groupValue) 3 nhom
//    Phat hanh / Pending / Chua len phi + ty le phat hanh theo gia tri.
//  - Danh sach ho so THONG NHAT (bo 3 subview Theo ngay / Tat ca /
//    Pending): co tim kiem + loc Unit + loc trang thai.
//      + Loc Pending (PS): danh sach phang, cho lau nhat len truoc.
//      + Con lai: NHOM THEO NGAY NOP (moi nhat truoc), header nhom dinh
//        kem so ho so + tong gia tri cua ngay.
//  - The ho so: vien trai theo mau trang thai, che so (2 so cuoi), bam
//    vao xem hanh trinh Nop -> Len phi -> Pending -> Phat hanh (CHI XEM).
//  - Da GO: xuat Excel + panel "Thay doi so voi ban truoc" (diffCases
//    van nam trong lib/cases.js nhung UI khong dung nua).
// CAP NHAT DU LIEU (Lan chot 08/11/2026 — thay co che chinh tay): day FILE
// MOI (Daily day du hoac Proposal rieng) o tab Nap du lieu, nhu Sales Report
// ban cu. Chi tiet ho so chi de xem, khong con form chinh tay.
// Nguon so: snapshot Daily moi nhat cua thang dang chon (cung cach tai
// cua HomNay: App truyen snaps tu Firestore neu co, khong thi localStorage).
// DOT CAI TIEN 10/11/2026 (Lan duyet de xuat 1-5): them CHE DO XEM THEO
// TVV (the TVV: huy hieu hang PE hien tai, Active, dem ho so theo trang
// thai, IP phat hanh theo dong) + dai tom tat Active dau trang + chip
// loc Active. Che do Theo ho so giu NGUYEN lam mac dinh.
// DOT CHUYEN PE 10/11/2026 (Lan yeu cau — Sales Report qua nhieu thong
// tin): phan PHAN TICH PE (khoi Duong toi hang PE + danh sach Sap len
// hang PE + so theo hang o dai tom tat + chip loc theo hang) da CHUYEN
// SANG tab TINH ANH (DoiNgu.jsx, van dung chung lib/pe.js). O day chi
// con PHAN LOAI theo TVV: huy hieu hang hien tai nho tren the TVV +
// loc theo trang thai Active.
// DOT KHOI PHUC LOC PE 10/11/2026 (Lan yeu cau tiep): KHOI PHUC rieng
// CHIP LOC THEO NHOM PE (hang HIEN TAI) o che do Theo TVV — chi la bo
// loc phan loai TVV, phan PHAN TICH PE van o Tinh Anh, khong quay lai.
// ─────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react'
import { analyzeSoSanLuong, maskSensitive, prevYearMonth } from '../lib/analyze'
import { buildCases, groupValue, summarizeCases, STATUS_LABELS } from '../lib/cases'
import { issuedOf } from '../lib/team'
import { segToTier, tierById } from '../lib/pe'
import { isSuperAdmin } from '../lib/firebaseConfig'

const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN')
const fmtPct1 = (n) => `${(Math.round((Number(n) || 0) * 10) / 10).toLocaleString('vi-VN')}%`
const fmtDateVN = (iso) => {
  if (!iso) return '—'
  const p = String(iso).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(iso)
}
const PILL_CLASS = { IF: 'pill-if', PS: 'pill-ps', PIPELINE: 'pill-pipe', OTHER: 'pill-other' }
const CARD_CLASS = { IF: 'st-if', PS: 'st-ps', PIPELINE: 'st-pipe', OTHER: 'st-other' }
const STATUS_FILTERS = [
  { code: 'ALL', label: 'Tất cả' },
  { code: 'IF', label: 'Phát hành' },
  { code: 'PS', label: 'Pending' },
  { code: 'PIPELINE', label: 'Chưa lên phí' },
  { code: 'OTHER', label: 'Khác' },
]

// ── Che do THEO TVV: chip loc phan loai — theo NHOM PE (hang HIEN
// TAI theo agSeg, khoi phuc theo yeu cau cua Lan 10/11/2026) + theo
// trang thai Active. Day chi la BO LOC danh sach TVV; phan tich PE
// tam tinh/sap len hang van o tab Tinh Anh (DoiNgu). ──
const PE_FILTERS = [
  { code: 'ALL', label: 'Tất cả' },
  { code: 'diamond', label: '💎 Kim Cương' },
  { code: 'platinum', label: 'Bạch Kim' },
  { code: 'gold', label: 'Vàng' },
  { code: 'none', label: 'Chưa xếp hạng' },
  { code: 'active', label: '✓ Đã Active' },
  { code: 'inactive', label: 'Chưa Active' },
]
// Avatar + huy hieu theo hang PE hien tai: tai su dung vong avatar cua
// Bang Vang (.bv-avatar + ring theo phan loai o DoiNgu).
const TIER_AV_CLASS = { diamond: 'bv-av-dia', platinum: 'bv-av-pla', gold: 'bv-av-gold' }
const TIER_BADGE_CLASS = { diamond: 'pe-badge-dia', platinum: 'pe-badge-pla', gold: 'pe-badge-gold' }

// Chu cai dau avatar: 2 tu cuoi cua ten (nhu DoiNgu).
const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Gia tri tien tren THE ho so: ipNet chi co nghia voi ho so da phat hanh (IF).
// PS (pending, da len phi) gia tri nam o ipSub; PIPELINE (chua len phi) nam o
// ape neu co, khong thi ipSub; nhom Khac lay ipSub neu co, khong thi ipNet.
// Khop logic hien thi o renderDetail — kem nhan ro rang de so khong mo ho.
const cardValue = (c) => {
  const ipSub = Number(c.ipSub) || 0
  const ipNet = Number(c.ipNet) || 0
  const ape = Number(c.ape) || 0
  switch (c.effectiveStatus) {
    case 'IF': return { value: Number(c.effectiveIpNet) || 0, label: 'IP Net' }
    case 'PS': return { value: ipSub, label: 'IP Sub' }
    case 'PIPELINE': return ape > 0 ? { value: ape, label: 'APE' } : { value: ipSub, label: 'IP Sub' }
    default: return ipSub > 0 ? { value: ipSub, label: 'IP Sub' } : { value: ipNet, label: 'IP Net' }
  }
}

function StatusPill({ code }) {
  return <span className={`pill ${PILL_CLASS[code] || 'pill-other'}`}>{STATUS_LABELS[code] || code}</span>
}

// So HIEU CHINH tren the: ho so PHAT HANH (IF) va PENDING (PS) hien so
// POLICY (so hop dong); cac nhom con lai (chua len phi chua co so hop dong)
// hien so HSYC (proposalNum). So con lai thanh so phu.
const primaryNum = (c) => {
  const st = c.effectiveStatus || c.baseStatus
  return (st === 'IF' || st === 'PS') && c.policyNum
    ? { value: c.policyNum, label: 'Số HĐ', secondary: c.proposalNum, secondaryLabel: 'HSYC' }
    : { value: c.proposalNum, label: 'HSYC', secondary: c.policyNum || '', secondaryLabel: 'Số HĐ' }
}

export default function SalesReport({ snaps, loading, remoteSettled = true, onNeedMonth, onGoNap, user }) {
  // Admin chinh (admin@prud07.top) xem so ho so DAY DU; con lai che con 2 so cuoi.
  const canSeeFull = isSuperAdmin(user)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expanded, setExpanded] = useState(null)
  // Che do xem: 'cases' (theo ho so — mac dinh, giu nguyen) / 'agents'
  // (theo TVV + phan hang PE tam tinh).
  const [viewMode, setViewMode] = useState('cases')
  const [peFilter, setPeFilter] = useState('ALL')
  const [expandedAgent, setExpandedAgent] = useState(null)
  // Tai LAZY theo thang: { ym, phase: 'loading' | 'empty' } cho thang
  // nguoi dung chon ma snaps chua co — App tai doc moi nhat cua thang do
  // (+ thang truoc cho CF) theo yeu cau, khong tai san cac thang khac.
  const [lazyMonth, setLazyMonth] = useState(null)

  const months = useMemo(
    () => [...new Set((snaps || []).map((s) => s.id.slice(0, 7)))].sort(),
    [snaps],
  )
  // Danh sach thang CHON DUOC: thang da co trong snaps + 12 thang lien
  // tuc tinh den thang moi nhat (de chon thang cu hon thi tai lazy).
  const pickerMonths = useMemo(() => {
    const set = new Set(months)
    if (months.length) {
      let [y, m] = months[months.length - 1].split('-').map(Number)
      for (let i = 0; i < 11; i++) {
        m -= 1; if (m === 0) { m = 12; y -= 1 }
        set.add(`${y}-${String(m).padStart(2, '0')}`)
      }
    }
    return [...set].sort()
  }, [months])
  const effMonth = selectedMonth && pickerMonths.includes(selectedMonth)
    ? selectedMonth
    : (months.length ? months[months.length - 1] : null)

  const handleSelectMonth = (ym) => {
    setSelectedMonth(ym)
    setExpanded(null)
    if (!onNeedMonth || months.includes(ym)) { setLazyMonth(null); return }
    setLazyMonth({ ym, phase: 'loading' })
    Promise.resolve(onNeedMonth(ym)).then((ok) => {
      setLazyMonth((cur) => (cur && cur.ym === ym ? (ok ? null : { ym, phase: 'empty' }) : cur))
    }).catch(() => {
      setLazyMonth((cur) => (cur && cur.ym === ym ? { ym, phase: 'empty' } : cur))
    })
  }

  const view = useMemo(() => {
    if (!effMonth) return null
    const [year, month] = effMonth.split('-').map(Number)
    const monthSnaps = (snaps || []).filter((s) => s.id.startsWith(`${effMonth}-`))
    const snap = monthSnaps.length ? monthSnaps[monthSnaps.length - 1] : null
    if (!snap) return null
    const pm = prevYearMonth(year, month)
    const p2 = (n) => String(n).padStart(2, '0')
    const prevDocs = (snaps || []).filter((s) => s.id.startsWith(`${pm.year}-${p2(pm.month)}-`))
    const analysis = analyzeSoSanLuong(monthSnaps, prevDocs, { year, month })
    const cases = buildCases(snap)
    const summary = summarizeCases(cases)
    const unitList = [...new Set(cases.map((c) => c.unit).filter(Boolean))].sort()
    // Tong gia tri trung bay (groupValue) toan GA theo nhom trang thai —
    // cho thanh xep chong o the tom tat. OTHER khong vao thanh, chi ghi chu.
    const gaBar = { issued: 0, pending: 0, pipeline: 0, other: 0 }
    for (const c of cases) {
      if (c.effectiveStatus === 'IF') gaBar.issued += groupValue(c)
      else if (c.effectiveStatus === 'PS') gaBar.pending += groupValue(c)
      else if (c.effectiveStatus === 'PIPELINE') gaBar.pipeline += groupValue(c)
      // OTHER: groupValue = 0 (khong vao thanh) — gia tri "Khac" ghi chu lay
      // theo gia tri the ho so (ipSub, khong thi ipNet) de con so co y nghia.
      else gaBar.other += Number(c.ipSub) > 0 ? Number(c.ipSub) : (Number(c.ipNet) || 0)
    }

    // ── Che do THEO TVV: phan loai TVV (huy hieu hang PE HIEN TAI
    // theo agSeg + trang thai Active); phan tich PE tam tinh nam o
    // Tinh Anh (DoiNgu) tu dot chuyen PE 10/11/2026. ──
    const agentsObj = snap.data?.agents || {}
    // Dem ho so theo MSDL tu buildCases — CUNG cach dem cua team.js cho
    // Bang Vang (nop = ho so co o Proposal; ph/pend/pipe theo trang
    // thai hieu luc; gia tri pending theo groupValue nhu the ho so).
    const byMsdl = new Map()
    for (const c of cases) {
      const k = String(c.msdl || '')
      if (!k) continue
      let g = byMsdl.get(k)
      if (!g) { g = { nop: 0, ph: 0, pend: 0, pipe: 0, pendApe: 0, agName: '', unit: '' }; byMsdl.set(k, g) }
      if (!g.agName && c.agName) g.agName = c.agName
      if (!g.unit && c.unit) g.unit = c.unit
      if (c.inProposal) g.nop += 1
      if (c.effectiveStatus === 'IF') g.ph += 1
      else if (c.effectiveStatus === 'PS') { g.pend += 1; g.pendApe += groupValue(c) }
      else if (c.effectiveStatus === 'PIPELINE') g.pipe += 1
    }
    // IP phat hanh THEO DONG (issuedRow — cung dinh nghia homeKpi /
    // Bang Vang): tong ipNet cac dong Proposal trang thai IF theo MSDL.
    const propRows = snap.data?.proposalRows
    const hasPropRows = Array.isArray(propRows)
    const issuedByMsdl = new Map()
    if (hasPropRows) {
      for (const p of propRows) {
        if (p.statusGroup !== 'IF') continue
        const k = String(p.msdl || '')
        if (k) issuedByMsdl.set(k, (issuedByMsdl.get(k) || 0) + (Number(p.ipNet) || 0))
      }
    }
    const rowMap = new Map()
    for (const a of Object.values(agentsObj)) {
      const k = String(a.msdl || '')
      if (!k) continue
      rowMap.set(k, {
        msdl: k, agName: a.agName || '', unit: a.unit || '', agSeg: a.agSeg || '',
        fyc: Number(a.fyc) || 0, fycL12m: Number(a.fycL12m) || 0,
        caseNet: Number(a.caseNet) || 0, ipNet: Number(a.ipNet) || 0,
      })
    }
    // TVV chi xuat hien trong ho so (khong co dong o sheet Agent van
    // liet ke, so PE tam tinh tinh tu fycL12m = 0).
    for (const [k, g] of byMsdl) {
      if (!rowMap.has(k)) {
        rowMap.set(k, { msdl: k, agName: g.agName, unit: g.unit, agSeg: '', fyc: 0, fycL12m: 0, caseNet: 0, ipNet: 0 })
      }
    }
    const agentRows = [...rowMap.values()].map((r) => {
      const counts = byMsdl.get(r.msdl) || { nop: 0, ph: 0, pend: 0, pipe: 0, pendApe: 0 }
      const issued = issuedOf({ issuedRow: hasPropRows ? (issuedByMsdl.get(r.msdl) || 0) : null, ipNet: r.ipNet })
      return {
        ...r, counts, issued,
        active: r.caseNet > 0,
        tier: segToTier(r.agSeg),
      }
    }).sort((x, y) => (y.issued - x.issued) || String(x.agName || '').localeCompare(String(y.agName || ''), 'vi'))
    // Dai tom tat dau trang: so TVV da Active (Case Net > 0) tren tong
    // TVV co o sheet Agent cua thang (so theo hang PE da chuyen sang
    // Tinh Anh cung dot chuyen PE).
    const strip = {
      total: Object.keys(agentsObj).length,
      active: Object.values(agentsObj).filter((a) => (Number(a.caseNet) || 0) > 0).length,
    }
    return {
      year, month, snap, analysis, cases, summary, unitList, gaBar,
      agentRows, strip,
    }
  }, [snaps, effMonth])

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }
  if (!view) {
    // Thang dang chon chua co trong snaps va dang tai lazy theo yeu cau.
    if (lazyMonth && lazyMonth.ym === effMonth && lazyMonth.phase === 'loading') {
      return (
        <div className="card empty">
          <div className="e-ic">⏳</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Đang tải dữ liệu tháng {effMonth ? `${effMonth.split('-')[1]}/${effMonth.split('-')[0]}` : ''}…</div>
          <p>Hệ thống chỉ tải đúng tháng bạn chọn — chờ một lát nhé.</p>
        </div>
      )
    }
    if (lazyMonth && lazyMonth.ym === effMonth && lazyMonth.phase === 'empty') {
      return (
        <div className="card empty">
          <div className="e-ic">📭</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Tháng {effMonth ? `${effMonth.split('-')[1]}/${effMonth.split('-')[0]}` : ''} chưa có dữ liệu</div>
          <p style={{ marginBottom: 14 }}>Chưa có bản Daily Sales nào của tháng này trên hệ thống. Chọn tháng khác bên dưới, hoặc nạp file Daily Sales của tháng này ở tab Nạp.</p>
          <div className="field" style={{ marginBottom: 0, textAlign: 'left' }}>
            <label>Tháng xem</label>
            <select value={effMonth} onChange={(e) => handleSelectMonth(e.target.value)}>
              {pickerMonths.map((m) => <option key={m} value={m}>{`Tháng ${m.split('-')[1]}/${m.split('-')[0]}`}{months.includes(m) ? '' : ' (tải khi chọn)'}</option>)}
            </select>
          </div>
        </div>
      )
    }
    // Luot tai may dau tien chua xong ma da ket luan rong -> dang tai.
    if (!remoteSettled && !snaps?.length) {
      return (
        <div className="card empty">
          <div className="e-ic">⏳</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Đang tải dữ liệu…</div>
          <p>Lần đầu trên thiết bị này có thể mất vài giây — dữ liệu đang được tải về, bạn không cần nạp lại file.</p>
        </div>
      )
    }
    return (
      <div className="card empty">
        <div className="e-ic">📭</div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có dữ liệu Daily Sales</div>
        <p style={{ marginBottom: 14 }}>Hãy nạp file Daily Sales đầu tiên ở tab Nạp — nhật ký hồ sơ sẽ hiện ngay tại đây.</p>
        <button className="btn-primary" onClick={onGoNap}>📥 Đến tab Nạp dữ liệu</button>
      </div>
    )
  }

  const { year, month, snap, analysis, cases, summary, unitList, gaBar, agentRows, strip } = view
  const t = analysis.totals

  const openCase = (c) => {
    setExpanded(expanded === c.proposalNum ? null : c.proposalNum)
  }

  const filteredAll = cases.filter((c) => {
    if (statusFilter !== 'ALL' && c.effectiveStatus !== statusFilter) return false
    if (unitFilter !== 'ALL' && c.unit !== unitFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${c.agName} ${c.msdl} ${c.proposalNum} ${c.policyNum || ''} ${c.unit}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  // ── Che do THEO TVV: loc dung chung o tim kiem + Unit, them chip
  // phan loai: trang thai Active + NHOM PE theo hang HIEN TAI
  // (r.tier = segToTier(agSeg); 'none' = chua xep hang PE) ──
  const agentFiltered = agentRows.filter((r) => {
    if (unitFilter !== 'ALL' && r.unit !== unitFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${r.agName} ${r.msdl} ${r.unit}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (peFilter === 'active') return r.active
    if (peFilter === 'inactive') return !r.active
    if (peFilter === 'diamond' || peFilter === 'platinum' || peFilter === 'gold') return r.tier === peFilter
    if (peFilter === 'none') return !r.tier
    return true
  })
  // Bam 1 so o dai tom tat -> sang che do Theo TVV kem bo loc tuong ung.
  const applyStripFilter = (f) => { setViewMode('agents'); setPeFilter(f) }
  // Ho so theo MSDL de xo trong the TVV (giu nguyen thu tu buildCases).
  const casesMap = new Map()
  for (const c of cases) {
    const k = String(c.msdl || '')
    if (!casesMap.has(k)) casesMap.set(k, [])
    casesMap.get(k).push(c)
  }

  // ── To chuc DANH SACH THONG NHAT ──
  // Loc Pending (PS): danh sach PHANG, sap tuoi pending giam dan (cho lau
  // nhat truoc). Cac loc con lai: NHOM THEO NGAY NOP giam dan; nhom khong
  // co ngay nop xep cuoi. Trong nhom giu nguyen thu tu cua filteredAll
  // (buildCases da sap ngay nop moi truoc, cung ngay theo so HSYC).
  const isPendingView = statusFilter === 'PS'
  const pendingFlat = isPendingView
    ? [...filteredAll].sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1)
      || String(a.proposalDate || '').localeCompare(String(b.proposalDate || '')))
    : []
  const dayGroups = []
  if (!isPendingView) {
    const byDay = new Map()
    for (const c of filteredAll) {
      const key = c.proposalDate || ''
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key).push(c)
    }
    const keys = [...byDay.keys()].filter((k) => k).sort((a, b) => String(b).localeCompare(String(a)))
    if (byDay.has('')) keys.push('')
    for (const key of keys) {
      const items = byDay.get(key)
      dayGroups.push({ key, items, total: items.reduce((s, c) => s + groupValue(c), 0) })
    }
  }

  // Thanh xep chong toan GA: 3 nhom vao thanh; ty le phat hanh theo gia tri
  const gaTotal = gaBar.issued + gaBar.pending + gaBar.pipeline
  const gaPct = (v) => (gaTotal > 0 ? (v / gaTotal) * 100 : 0)
  const issueRate = gaTotal > 0 ? (gaBar.issued / gaTotal) * 100 : null

  const renderDetail = (c) => {
    const pn = primaryNum(c)
    return (
    <div className="detail-box">
      <div style={{ fontSize: 13.5, marginBottom: 6 }}>
        {pn.label}{canSeeFull ? ' đầy đủ' : ''}: <b>{maskSensitive(pn.value, canSeeFull)}</b>
        {pn.secondary ? <> · {pn.secondaryLabel}: <b>{maskSensitive(pn.secondary, canSeeFull)}</b></> : null}
      </div>
      {c.product ? <div className="case-meta" style={{ marginBottom: 6 }}>Sản phẩm: {c.product}</div> : null}
      <ul className="journey">
        <li>
          <span className="j-ic">📥</span>
          <span>Nộp — {fmtDateVN(c.proposalDate)}</span>
        </li>
        {c.effectiveStatus === 'PIPELINE' ? (
          <li className="now"><span className="j-ic">💸</span><span>Chưa lên phí{c.ape ? ` — APE ${fmtTr(c.ape)} tr` : ''}</span></li>
        ) : (
          <li><span className="j-ic">💵</span><span>Đã lên phí — IP Sub {fmtTr(c.ipSub)} tr</span></li>
        )}
        {c.effectiveStatus === 'PS' && (
          <li className="now">
            <span className="j-ic">⏳</span>
            <span>Pending{c.ageDays !== null && c.ageDays !== undefined ? ` — đã chờ ${c.ageDays} ngày` : ''}{c.ageBucket ? ` (nhóm ${c.ageBucket} ngày)` : ''}</span>
          </li>
        )}
        {c.effectiveStatus === 'IF' ? (
          <li className="now"><span className="j-ic">✅</span><span>Phát hành — {c.firstIssuedDate ? fmtDateVN(c.firstIssuedDate) : 'chưa rõ ngày'} · IP Net {fmtTr(c.effectiveIpNet)} tr</span></li>
        ) : c.effectiveStatus === 'OTHER' ? (
          <li className="off"><span className="j-ic">🚫</span><span>Trạng thái khác{c.status ? `: ${c.status}` : ''} (không tính phát hành)</span></li>
        ) : (
          <li className="off"><span className="j-ic">⬜</span><span>Chưa phát hành</span></li>
        )}
      </ul>
      {c.pendingReasons.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text2)', marginBottom: 5 }}>Lý do pending (yêu cầu còn thiếu):</div>
          {c.pendingReasons.map((r) => <span className="reason-chip" key={r}>{r}</span>)}
        </div>
      )}
    </div>
    )
  }

  const renderCard = (c) => {
    const v = cardValue(c)
    const pn = primaryNum(c)
    return (
    <div className={`case-card ${CARD_CLASS[c.effectiveStatus] || 'st-other'}`} key={c.proposalNum}>
      <div className="case-head" onClick={() => openCase(c)}>
        <div className="case-main">
          <div className="case-num">
            {maskSensitive(pn.value, canSeeFull)}
          </div>
          {pn.secondary ? <div className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{pn.secondaryLabel} {maskSensitive(pn.secondary, canSeeFull)}</div> : null}
          <div className="case-who">{c.agName || '—'}{c.unit ? ` · ${c.unit}` : ''}</div>
          <div className="case-meta">
            Nộp {fmtDateVN(c.proposalDate)}
            {c.effectiveStatus === 'PS' && c.ageDays !== null && c.ageDays !== undefined
              ? <> · chờ {c.ageDays} ngày{c.ageBucket ? <span className={`age-chip ${c.ageBucket === '>14' ? 'hot' : ''}`}>{c.ageBucket} ngày</span> : null}</>
              : null}
            {c.effectiveStatus === 'IF' && c.firstIssuedDate ? <> · PH {fmtDateVN(c.firstIssuedDate)}</> : null}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="case-ip">{fmtTr(v.value)} tr <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{v.label}</span></div>
          <StatusPill code={c.effectiveStatus} />
        </div>
      </div>
      {expanded === c.proposalNum ? renderDetail(c) : null}
    </div>
    )
  }

  // ── The TVV (che do Theo TVV): thong tin tong hop + huy hieu hang
  // PE HIEN TAI nho (nhan phan loai — phan tich Duong toi hang PE nam
  // o Tinh Anh); bam dau the xo danh sach ho so cua chinh TVV do
  // (tai su dung renderCard/renderDetail nhu che do Theo ho so). ──
  const renderAgentCard = (r) => {
    const isOpen = expandedAgent === r.msdl
    const cur = tierById(r.tier)
    const ownCases = casesMap.get(r.msdl) || []
    return (
    <div className="sr-agent-card" key={r.msdl}>
      <button type="button" className="sr-agent-head" onClick={() => setExpandedAgent(isOpen ? null : r.msdl)} aria-expanded={isOpen}>
        <span className={`bv-avatar ${TIER_AV_CLASS[r.tier] || 'bv-av-oth'}`}>{initials(r.agName)}</span>
        <span className="sr-agent-main">
          <span className="bv-name">{r.agName || '—'}{r.unit ? <span className="bv-sub"> · {r.unit}</span> : null}</span>
          <span className="sr-agent-sub">
            {cur
              ? <span className={`pe-badge ${TIER_BADGE_CLASS[r.tier]}`}>{cur.icon ? `${cur.icon} ` : ''}{cur.label}</span>
              : <span className="pe-badge pe-badge-none">Chưa xếp hạng</span>}
            {r.active
              ? <span className="sr-active-yes">✓ Đã Active</span>
              : <span className="sr-active-no">Chưa Active</span>}
          </span>
        </span>
        <span className="sr-agent-issued">
          <span className="sr-agent-issued-num">{fmtTr(r.issued)} tr</span>
          <span className="sr-agent-issued-label">IP phát hành</span>
        </span>
      </button>
      <div className="sr-agent-counts">
        Nộp <b>{fmtInt(r.counts.nop)}</b> · Phát hành <b>{fmtInt(r.counts.ph)}</b> · Pending <b>{fmtInt(r.counts.pend)}</b> · Chưa lên phí <b>{fmtInt(r.counts.pipe)}</b>
        {r.counts.pend > 0 ? <> · Pending <b>{fmtTr(r.counts.pendApe)} tr</b> (APE)</> : null}
      </div>

      {isOpen ? (
        <div className="sr-agent-cases">
          {ownCases.length === 0
            ? <div className="muted">TVV này chưa có hồ sơ nào trong tháng.</div>
            : ownCases.map(renderCard)}
        </div>
      ) : null}
    </div>
    )
  }

  return (
    <div>
      {/* ── Tom tat thang ── */}
      <div className="card">
        <h2>📋 Sales Report — tháng {month}/{year}</h2>
        <div style={{ fontSize: 14 }}>
          Phát hành ròng: <b>{fmtInt(t.netN)} HĐ · {fmtTr(t.netIp)} tr</b>
          <span className="muted"> (gộp {fmtInt(t.issN)} HĐ − CF liên tháng {fmtInt(t.cfN)})</span>
        </div>
        <div style={{ fontSize: 14, marginTop: 4 }}>
          Tổng hồ sơ đang theo dõi: <b>{fmtInt(summary.total)}</b>
          {' · '}Phát hành <b>{fmtInt(summary.byStatus.IF.n)}</b>
          {' · '}Pending <b>{fmtInt(summary.byStatus.PS.n)}</b>
          {' · '}Chưa lên phí <b>{fmtInt(summary.byStatus.PIPELINE.n)}</b>
        </div>

        {/* ── Thanh xep chong TOAN GA theo gia tri trung bay ── */}
        <div className="stack-bar" style={{ marginBottom: 6 }}>
          {gaBar.issued > 0 ? <div className="seg-issued" style={{ width: `${gaPct(gaBar.issued)}%` }} /> : null}
          {gaBar.pending > 0 ? <div className="seg-pending" style={{ width: `${gaPct(gaBar.pending)}%` }} /> : null}
          {gaBar.pipeline > 0 ? <div className="seg-pipe" style={{ width: `${gaPct(gaBar.pipeline)}%` }} /> : null}
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: '#7c3aed' }} />Phát hành {fmtTr(gaBar.issued)} tr</span>
          <span><span className="dot" style={{ background: '#ec4899' }} />Pending {fmtTr(gaBar.pending)} tr</span>
          <span><span className="dot" style={{ background: '#06b6d4' }} />Chưa lên phí {fmtTr(gaBar.pipeline)} tr</span>
        </div>
        <div style={{ fontSize: 13.5, marginTop: 6 }}>
          Tỷ lệ phát hành theo giá trị: <b>{issueRate !== null ? fmtPct1(issueRate) : '—'}</b>
          {gaBar.other > 0 ? <span className="muted"> · Khác {fmtTr(gaBar.other)} tr (không tính vào thanh)</span> : null}
        </div>

        <div className="muted" style={{ marginTop: 6 }}>Dữ liệu đến {fmtDateVN(snap.id)}</div>
        {pickerMonths.length > 1 && (
          <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
            <label>Tháng xem</label>
            <select value={effMonth} onChange={(e) => handleSelectMonth(e.target.value)}>
              {pickerMonths.map((m) => <option key={m} value={m}>{`Tháng ${m.split('-')[1]}/${m.split('-')[0]}`}{months.includes(m) ? '' : ' (tải khi chọn)'}</option>)}
            </select>
          </div>
        )}

        {/* ── Dai tom tat Active — bam so se sang che do Theo TVV
            kem bo loc Da Active (so theo hang PE da chuyen sang
            Tinh Anh cung dot chuyen PE 10/11/2026) ── */}
        <div className="sr-strip">
          <button type="button" className="sr-strip-item" onClick={() => applyStripFilter('active')}>
            ✓ Đã Active tháng này: <b>{fmtInt(strip.active)}/{fmtInt(strip.total)}</b>
          </button>
        </div>
      </div>

      {/* ── Chuyen che do xem: Theo ho so (mac dinh) / Theo TVV ── */}
      <div className="chips-row" style={{ marginBottom: 10 }}>
        <button className={`fchip ${viewMode === 'cases' ? 'active' : ''}`} onClick={() => setViewMode('cases')}>📄 Theo hồ sơ</button>
        <button className={`fchip ${viewMode === 'agents' ? 'active' : ''}`} onClick={() => setViewMode('agents')}>🧑‍💼 Theo TVV</button>
      </div>

      {/* ── Bo loc danh sach ── */}
      <div className="search-row">
        <div className="field">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔎 Tìm theo tên TVV, mã số, số hồ sơ…" />
        </div>
      </div>
      <div className="field">
        <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
          <option value="ALL">Tất cả Unit</option>
          {unitList.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {viewMode === 'cases' ? (
        <div className="chips-row">
          {STATUS_FILTERS.map((f) => (
            <button key={f.code} className={`fchip sm ${statusFilter === f.code ? 'active' : ''}`} onClick={() => setStatusFilter(f.code)}>{f.label}</button>
          ))}
        </div>
      ) : (
        <div className="chips-row">
          {PE_FILTERS.map((f) => (
            <button key={f.code} className={`fchip sm ${peFilter === f.code ? 'active' : ''}`} onClick={() => setPeFilter(f.code)}>{f.label}</button>
          ))}
        </div>
      )}

      {viewMode === 'cases' ? (
        <>
          {/* ── Danh sach ho so thong nhat ── */}
          <div className="muted" style={{ marginBottom: 8 }}>
            {filteredAll.length} hồ sơ
            {isPendingView ? ' · đang sắp xếp chờ lâu nhất trước' : ''}
          </div>
          {filteredAll.length === 0 && <div className="card empty"><div className="e-ic">🔍</div>Không có hồ sơ nào khớp bộ lọc.</div>}
          {isPendingView
            ? (<div className="sr-flat-grid">{pendingFlat.map(renderCard)}</div>)
            : dayGroups.map((g) => (
              <div className="day-group" key={g.key || 'nodate'}>
                <div className="day-head">
                  📅 {g.key ? fmtDateVN(g.key) : 'Không rõ ngày nộp'} — {g.items.length} hồ sơ · {fmtTr(g.total)} tr
                </div>
                {g.items.map(renderCard)}
              </div>
            ))}
        </>
      ) : (
        <>
          {/* ── Danh sach TVV ── */}
          <div className="muted" style={{ marginBottom: 8 }}>
            {agentFiltered.length} TVV · sắp theo IP phát hành giảm dần
          </div>
          {agentFiltered.length === 0 && <div className="card empty"><div className="e-ic">🔍</div>Không có TVV nào khớp bộ lọc.</div>}
          <div className="sr-agent-grid">
            {agentFiltered.map(renderAgentCard)}
          </div>
        </>
      )}
    </div>
  )
}
