// ─────────────────────────────────────────────────────────────
// SalesReport — Man hinh "Sales Report" (SPEC v3, man hinh 2):
// NHAT KY TUNG HO SO theo ngay, khong phai nhap tay tong so theo TVV.
//  - Theo ngay: chon ngay -> nop / phat hanh / nop-dang-pending cua ngay do.
//  - Tat ca ho so: tim kiem + loc Unit/trang thai, the ho so che so (2 so cuoi),
//    bam vao xem hanh trinh Nop -> Len phi -> Pending -> Phat hanh + dieu chinh.
//  - Pending: sap xep ho so cho lau nhat truoc, kem ly do + nhom tuoi.
//  - Dieu chinh: lop rieng (localStorage + audit, best-effort Firestore),
//    khong bi lan nap Daily sau ghi de; khi he thong cap nhat khop thi
//    dieu chinh thanh "stale" va ngung ghi de (logic o lib/cases.js).
// Nguon so: snapshot Daily moi nhat cua thang dang chon (cung cach tai
// cua HomNay: App truyen snaps tu Firestore neu co, khong thi localStorage).
// ─────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { analyzeSoSanLuong, maskSensitive, prevYearMonth } from '../lib/analyze'
import { buildCases, journalForDay, summarizeCases, STATUS_LABELS } from '../lib/cases'
import {
  loadAdjustments, loadAudit, getUserName,
  saveAdjustmentLocal, saveAdjustmentRemote,
} from '../lib/store'
import { isSuperAdmin } from '../lib/firebaseConfig'

const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN')
const fmtDateVN = (iso) => {
  if (!iso) return '—'
  const p = String(iso).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(iso)
}
const PILL_CLASS = { IF: 'pill-if', PS: 'pill-ps', PIPELINE: 'pill-pipe', OTHER: 'pill-other' }
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

export default function SalesReport({ snaps, loading, onGoNap, user }) {
  // Admin chinh (admin@d07.com) xem so ho so DAY DU; con lai che con 2 so cuoi.
  const canSeeFull = isSuperAdmin(user)
  const [subview, setSubview] = useState('day')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [day, setDay] = useState('')
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ status: 'PS', ipNet: '', note: '' })
  const [saveMsg, setSaveMsg] = useState('')
  const [adjustments, setAdjustments] = useState(() => loadAdjustments())
  const [audit, setAudit] = useState(() => loadAudit())

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
    const cases = buildCases(snap, adjustments)
    const summary = summarizeCases(cases)
    const unitList = [...new Set(cases.map((c) => c.unit).filter(Boolean))].sort()
    return { year, month, snap, analysis, cases, summary, unitList }
  }, [snaps, effMonth, adjustments])

  const caseByNum = useMemo(() => {
    const m = new Map()
    ;(view?.cases || []).forEach((c) => m.set(c.proposalNum, c))
    return m
  }, [view])

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

  const { year, month, snap, analysis, cases, summary, unitList } = view
  const t = analysis.totals
  const effDay = day && day.startsWith(effMonth) ? day : snap.id
  const journal = journalForDay(cases, effDay)

  const openCase = (c) => {
    if (expanded === c.proposalNum) { setExpanded(null); return }
    setExpanded(c.proposalNum)
    setSaveMsg('')
    setForm({
      status: c.effectiveStatus,
      ipNet: String(c.effectiveIpNet),
      note: c.adjNote || '',
    })
  }

  const handleSaveAdj = () => {
    const c = expanded ? caseByNum.get(expanded) : null
    if (!c || !user) return
    const by = user.email || getUserName() || 'Admin'
    const parsedIp = form.ipNet === '' ? null : Number(form.ipNet)
    // (nguoi sua lay tu tai khoan dang nhap — khong con o nhap ten thu cong)
    const adj = {
      status: form.status || null,
      ipNet: Number.isFinite(parsedIp) ? parsedIp : null,
      note: form.note || '',
    }
    const changes = {}
    if (adj.status && adj.status !== c.effectiveStatus) changes.status = { from: c.effectiveStatus, to: adj.status }
    if (adj.ipNet !== null && adj.ipNet !== c.effectiveIpNet) changes.ipNet = { from: c.effectiveIpNet, to: adj.ipNet }
    if ((adj.note || '') !== (c.adjNote || '')) changes.note = { from: c.adjNote || '', to: adj.note || '' }
    const saved = saveAdjustmentLocal(c.proposalNum, adj, changes, by)
    setAdjustments(saved.adjustments)
    setAudit(saved.audit)
    saveAdjustmentRemote(c.proposalNum, adj, changes, by).catch(() => { /* best-effort */ })
    setSaveMsg(`✓ Đã lưu điều chỉnh cho hồ sơ ••••${c.proposalNum.slice(-2)} — ${by} · ${new Date().toLocaleString('vi-VN')}`)
  }

  const exportExcel = () => {
    const perTvv = new Map()
    const perUnit = new Map()
    const bump = (m, key, init, c) => {
      if (!m.has(key)) m.set(key, init())
      const r = m.get(key)
      if (c.effectiveStatus !== 'OTHER') r.nop += 1
      if (c.effectiveStatus === 'IF') { r.ph += 1; r.ipPh += Number(c.effectiveIpNet) || 0 }
      if (c.effectiveStatus === 'PS') r.pend += 1
    }
    for (const c of cases) {
      bump(perTvv, c.msdl || c.agName, () => ({ 'TVV': c.agName || '—', 'Mã số': c.msdl || '', 'Unit': c.unit || '', nop: 0, ph: 0, pend: 0, ipPh: 0 }), c)
      bump(perUnit, c.unit || '—', () => ({ 'Unit': c.unit || '—', nop: 0, ph: 0, pend: 0, ipPh: 0 }), c)
    }
    const tvvRows = [...perTvv.values()]
      .sort((a, b) => b.ipPh - a.ipPh)
      .map((r) => ({ 'TVV': r['TVV'], 'Mã số': r['Mã số'], 'Unit': r['Unit'], 'Số nộp': r.nop, 'Số phát hành': r.ph, 'Số pending': r.pend, 'IP phát hành (tr)': Math.round(r.ipPh * 10) / 10 }))
    const unitRows = [...perUnit.values()]
      .sort((a, b) => b.ipPh - a.ipPh)
      .map((r) => ({ 'Unit': r['Unit'], 'Số nộp': r.nop, 'Số phát hành': r.ph, 'Số pending': r.pend, 'IP phát hành (tr)': Math.round(r.ipPh * 10) / 10 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tvvRows), 'Overview')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitRows), 'TongHop')
    XLSX.writeFile(wb, `SalesReport_D07_${year}-${String(month).padStart(2, '0')}.xlsx`)
  }

  const filteredAll = cases.filter((c) => {
    if (statusFilter !== 'ALL' && c.effectiveStatus !== statusFilter) return false
    if (unitFilter !== 'ALL' && c.unit !== unitFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${c.agName} ${c.msdl} ${c.proposalNum} ${c.unit}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const renderDetail = (c) => (
    <div className="detail-box">
      <div style={{ fontSize: 13.5, marginBottom: 6 }}>
        Số hồ sơ{canSeeFull ? ' đầy đủ' : ''}: <b>{maskSensitive(c.proposalNum, canSeeFull)}</b>
        {c.policyNum ? <> · Số HĐ: <b>{maskSensitive(c.policyNum, canSeeFull)}</b></> : null}
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
      {c.adjusted && !c.adjustmentStale && (
        <div className="msg info" style={{ marginBottom: 10 }}>
          ✏️ Hồ sơ này đã được chỉnh tay{c.adjustment?.updatedBy ? ` bởi ${c.adjustment.updatedBy}` : ''}{c.adjNote ? ` — ghi chú: “${c.adjNote}”` : ''}
        </div>
      )}
      {c.adjustmentStale && (
        <div className="msg success" style={{ marginBottom: 10 }}>
          ✓ Hệ thống đã cập nhật khớp với điều chỉnh trước đó — không còn ghi đè nữa.
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 800, margin: '10px 0 8px' }}>✏️ Điều chỉnh hồ sơ</div>
      {!user ? (
        <div className="lock-note">🔐 Đăng nhập để điều chỉnh hồ sơ — bạn vẫn xem được toàn bộ nhật ký, nhưng sửa trạng thái / IP / ghi chú cần tài khoản (điều chỉnh sẽ ghi tên theo email đăng nhập).</div>
      ) : (
      <>
      <div className="field">
        <label>Trạng thái</label>
        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          <option value="IF">Phát hành</option>
          <option value="PS">Pending</option>
          <option value="PIPELINE">Chưa lên phí</option>
          <option value="OTHER">Khác</option>
        </select>
      </div>
      <div className="field">
        <label>IP Net (triệu đồng)</label>
        <input type="number" inputMode="decimal" value={form.ipNet} onChange={(e) => setForm((f) => ({ ...f, ipNet: e.target.value }))} />
      </div>
      <div className="field">
        <label>Ghi chú / lý do pending</label>
        <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="VD: Chờ bổ sung khám y tế" />
      </div>
      <button className="btn-primary" onClick={handleSaveAdj}>💾 Lưu điều chỉnh</button>
      {saveMsg ? <div className="msg success">{saveMsg}</div> : null}
      </>
      )}
    </div>
  )

  const renderCard = (c) => {
    const v = cardValue(c)
    return (
    <div className="case-card" key={c.proposalNum}>
      <div className="case-head" onClick={() => openCase(c)}>
        <div className="case-main">
          <div className="case-num">
            {maskSensitive(c.proposalNum, canSeeFull)}
            {c.adjusted && !c.adjustmentStale ? <span className="badge-adj">Đã chỉnh tay</span> : null}
            {c.adjustmentStale ? <span className="badge-stale">Hệ thống đã cập nhật khớp</span> : null}
          </div>
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

  const renderAuditChanges = (changes) => {
    if (!changes || typeof changes !== 'object' || !Object.keys(changes).length) return 'Cập nhật điều chỉnh'
    const parts = []
    if (changes.status) parts.push(`Trạng thái: ${STATUS_LABELS[changes.status.from] || changes.status.from} → ${STATUS_LABELS[changes.status.to] || changes.status.to}`)
    if (changes.ipNet) parts.push(`IP Net: ${fmtTr(changes.ipNet.from)} → ${fmtTr(changes.ipNet.to)} tr`)
    if (changes.note) parts.push(`Ghi chú: “${changes.note.to || ''}”`)
    return parts.join(' · ') || 'Cập nhật điều chỉnh'
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
        <div className="muted" style={{ marginTop: 4 }}>Dữ liệu đến {fmtDateVN(snap.id)} · nhật ký từng hồ sơ, không nhập tay tổng số theo TVV</div>
        {months.length > 1 && (
          <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
            <label>Tháng xem</label>
            <select value={effMonth} onChange={(e) => { setSelectedMonth(e.target.value); setDay(''); setExpanded(null) }}>
              {months.map((m) => <option key={m} value={m}>{`Tháng ${m.split('-')[1]}/${m.split('-')[0]}`}</option>)}
            </select>
          </div>
        )}
        <button className="btn-ghost" style={{ marginTop: 10, width: '100%' }} onClick={exportExcel}>⬇ Xuất Excel (Overview + Tổng hợp)</button>
      </div>

      {/* ── Chuyen muc ── */}
      <div className="chips-row">
        <button className={`fchip ${subview === 'day' ? 'active' : ''}`} onClick={() => setSubview('day')}>🗓️ Theo ngày</button>
        <button className={`fchip ${subview === 'all' ? 'active' : ''}`} onClick={() => setSubview('all')}>🗂️ Tất cả hồ sơ</button>
        <button className={`fchip ${subview === 'pending' ? 'active' : ''}`} onClick={() => setSubview('pending')}>⏳ Pending ({fmtInt(summary.byStatus.PS.n)})</button>
      </div>

      {subview === 'day' && (
        <div>
          <div className="card">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Ngày xem nhật ký</label>
              <input type="date" value={effDay} min={`${effMonth}-01`} max={snap.id} onChange={(e) => setDay(e.target.value)} />
            </div>
          </div>
          <div className="mini-stats">
            <div className="mini-stat"><div className="ms-num">{journal.submitted.length}</div><div className="ms-label">Nộp ngày đó</div></div>
            <div className="mini-stat"><div className="ms-num">{journal.issued.length}</div><div className="ms-label">Phát hành ngày đó</div></div>
            <div className="mini-stat"><div className="ms-num">{journal.submittedPending.length}</div><div className="ms-label">Nộp ngày đó đang pending</div></div>
          </div>
          {journal.submitted.length === 0 && journal.issued.length === 0 && (
            <div className="card empty"><div className="e-ic">🌤️</div>Ngày {fmtDateVN(effDay)} không có hồ sơ nộp mới hay phát hành nào trong dữ liệu hiện có.</div>
          )}
          {journal.submitted.length > 0 && (
            <>
              <div style={{ fontWeight: 800, margin: '4px 2px 8px' }}>Hồ sơ nộp ngày {fmtDateVN(effDay)}</div>
              {journal.submitted.map(renderCard)}
            </>
          )}
          {journal.issued.filter((c) => c.proposalDate !== effDay).length > 0 && (
            <>
              <div style={{ fontWeight: 800, margin: '10px 2px 8px' }}>Hồ sơ nộp trước đó, phát hành ngày {fmtDateVN(effDay)}</div>
              {journal.issued.filter((c) => c.proposalDate !== effDay).map(renderCard)}
            </>
          )}
          {journal.submittedPipeline.length > 0 && (
            <>
              <div style={{ fontWeight: 800, margin: '10px 2px 8px' }}>Hồ sơ chưa lên phí nộp ngày {fmtDateVN(effDay)} ({journal.submittedPipeline.length})</div>
              {journal.submittedPipeline.map(renderCard)}
            </>
          )}
        </div>
      )}

      {subview === 'all' && (
        <div>
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
          <div className="muted" style={{ marginBottom: 8 }}>{filteredAll.length} hồ sơ · bấm vào thẻ để xem hành trình + điều chỉnh</div>
          {filteredAll.length === 0 && <div className="card empty"><div className="e-ic">🔍</div>Không có hồ sơ nào khớp bộ lọc.</div>}
          {filteredAll.slice(0, 200).map(renderCard)}
          {filteredAll.length > 200 && <div className="muted" style={{ textAlign: 'center' }}>Đang hiện 200 hồ sơ đầu — hãy lọc thêm để thu hẹp.</div>}
        </div>
      )}

      {subview === 'pending' && (
        <div>
          <div className="muted" style={{ marginBottom: 8 }}>
            {summary.pending.length} hồ sơ đang pending · sắp xếp chờ lâu nhất trước · tuổi tính đến {fmtDateVN(snap.id)}
          </div>
          {summary.pending.length === 0 && <div className="card empty"><div className="e-ic">🎉</div>Không có hồ sơ pending nào.</div>}
          {summary.pending.map(renderCard)}
        </div>
      )}

      {/* ── Lich su dieu chinh ── */}
      <div className="card">
        <h2>🕘 Lịch sử điều chỉnh</h2>
        {audit.length === 0 && <div className="muted">Chưa có điều chỉnh nào. Mở 1 hồ sơ ở mục Tất cả hồ sơ để điều chỉnh trạng thái / IP / ghi chú.</div>}
        {audit.slice(0, 20).map((a, i) => (
          <div className="audit-row" key={`${a.ts}-${i}`}>
            <div>
              <b>{maskSensitive(a.proposalNum, canSeeFull)}</b> — {renderAuditChanges(a.changes)}
            </div>
            <div className="a-ts">{a.by || 'Admin'} · {new Date(a.ts).toLocaleString('vi-VN')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
