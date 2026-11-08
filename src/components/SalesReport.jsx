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
// ─────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react'
import { analyzeSoSanLuong, maskSensitive, prevYearMonth } from '../lib/analyze'
import { buildCases, groupValue, summarizeCases, STATUS_LABELS } from '../lib/cases'
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

export default function SalesReport({ snaps, loading, onGoNap, user }) {
  // Admin chinh (admin@d07.com) xem so ho so DAY DU; con lai che con 2 so cuoi.
  const canSeeFull = isSuperAdmin(user)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expanded, setExpanded] = useState(null)

  const months = useMemo(
    () => [...new Set((snaps || []).map((s) => s.id.slice(0, 7)))].sort(),
    [snaps],
  )
  const effMonth = selectedMonth && months.includes(selectedMonth)
    ? selectedMonth
    : (months.length ? months[months.length - 1] : null)

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
    return { year, month, snap, analysis, cases, summary, unitList, gaBar }
  }, [snaps, effMonth])

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }
  if (!view) {
    return (
      <div className="card empty">
        <div className="e-ic">📭</div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có dữ liệu Daily Sales</div>
        <p style={{ marginBottom: 14 }}>Hãy nạp file Daily Sales đầu tiên ở tab Nạp — nhật ký hồ sơ sẽ hiện ngay tại đây.</p>
        <button className="btn-primary" onClick={onGoNap}>📥 Đến tab Nạp dữ liệu</button>
      </div>
    )
  }

  const { year, month, snap, analysis, cases, summary, unitList, gaBar } = view
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
      <div className="lock-note">Chi tiết chỉ để xem. Số liệu tự cập nhật khi có bản Daily Sales mới ở tab Nạp dữ liệu.</div>
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
          <span><span className="dot" style={{ background: '#22c55e' }} />Phát hành {fmtTr(gaBar.issued)} tr</span>
          <span><span className="dot" style={{ background: '#f59e0b' }} />Pending {fmtTr(gaBar.pending)} tr</span>
          <span><span className="dot" style={{ background: '#38bdf8' }} />Chưa lên phí {fmtTr(gaBar.pipeline)} tr</span>
        </div>
        <div style={{ fontSize: 13.5, marginTop: 6 }}>
          Tỷ lệ phát hành theo giá trị: <b>{issueRate !== null ? fmtPct1(issueRate) : '—'}</b>
          {gaBar.other > 0 ? <span className="muted"> · Khác {fmtTr(gaBar.other)} tr (không tính vào thanh)</span> : null}
        </div>

        <div className="muted" style={{ marginTop: 6 }}>Dữ liệu đến {fmtDateVN(snap.id)} · nhật ký từng hồ sơ, không nhập tay tổng số theo TVV</div>
        {months.length > 1 && (
          <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
            <label>Tháng xem</label>
            <select value={effMonth} onChange={(e) => { setSelectedMonth(e.target.value); setExpanded(null) }}>
              {months.map((m) => <option key={m} value={m}>{`Tháng ${m.split('-')[1]}/${m.split('-')[0]}`}</option>)}
            </select>
          </div>
        )}
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
      <div className="chips-row">
        {STATUS_FILTERS.map((f) => (
          <button key={f.code} className={`fchip sm ${statusFilter === f.code ? 'active' : ''}`} onClick={() => setStatusFilter(f.code)}>{f.label}</button>
        ))}
      </div>

      {/* ── Danh sach ho so thong nhat ── */}
      <div className="muted" style={{ marginBottom: 8 }}>
        {filteredAll.length} hồ sơ · bấm vào thẻ để xem hành trình hồ sơ
        {isPendingView ? ' · đang sắp xếp chờ lâu nhất trước' : ' · nhóm theo ngày nộp'}
      </div>
      {filteredAll.length === 0 && <div className="card empty"><div className="e-ic">🔍</div>Không có hồ sơ nào khớp bộ lọc.</div>}
      {isPendingView
        ? pendingFlat.map(renderCard)
        : dayGroups.map((g) => (
          <div key={g.key || 'nodate'}>
            <div className="day-head">
              📅 {g.key ? fmtDateVN(g.key) : 'Không rõ ngày nộp'} — {g.items.length} hồ sơ · {fmtTr(g.total)} tr
            </div>
            {g.items.map(renderCard)}
          </div>
        ))}
    </div>
  )
}
