// ─────────────────────────────────────────────────────────────
// DoiNgu — Man hinh "Doi Ngu" (SPEC v3, man hinh 3): "Ai manh, ai can ho tro?"
// Gop GA + UM + TVV trong 1 man: danh sach Unit, bam vao xo TVV ben trong
// (khong chuyen man hinh). Moi TVV: FYP/FYC thang, so ho so nop/PH/pending,
// dat Act hay chua (tu tinh tu Daily — xem ghi chu trung thuc ve MOC ben duoi).
// Loc nhanh: Tat ca / Chua dat MOC / Chua co ho so / Top TVV + o tim kiem.
// ManMark rut gon: chi giu THE MUC TIEU THANG (bo bang cam ket tuan) —
// tien do FYP toan GA so voi getTarget, cung nguon so voi man Hom Nay.
// ─────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react'
import { buildCases } from '../lib/cases'
import { buildTeam, flattenAgents, MOC_TARGET } from '../lib/team'
import { getTarget } from '../lib/store'

const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN')
const MEDALS = ['🥇', '🥈', '🥉']
const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'moc', label: 'Chưa đạt MOC' },
  { id: 'nocase', label: 'Chưa có hồ sơ' },
  { id: 'top', label: 'Top TVV' },
]

function toggleInSet(set, key) {
  const next = new Set(set)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

// Trong che do "Chua dat MOC": TVV chua Act len dau de quan ly thay ngay
// can day ai; trong tung nhom (chua Act / da Act) giu FYP giam dan.
const sortMocAgents = (list) => [...list].sort((x, y) => {
  if (x.isAct !== y.isAct) return x.isAct ? 1 : -1
  return y.fyp - x.fyp
})

export default function DoiNgu({ snaps, loading, onGoNap }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [openUnits, setOpenUnits] = useState(() => new Set())
  const [closedMoc, setClosedMoc] = useState(() => new Set())

  const newest = snaps && snaps.length ? snaps[snaps.length - 1] : null

  const view = useMemo(() => {
    if (!newest) return null
    const [year, month] = newest.id.split('-').map(Number)
    const cases = buildCases(newest)
    const team = buildTeam(newest, cases)
    return { year, month, team, allAgents: flattenAgents(team) }
  }, [newest])

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }
  if (!newest || !view) {
    return (
      <div className="card empty">
        <div className="e-ic">📭</div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có dữ liệu Daily Sales</div>
        <p style={{ marginBottom: 14 }}>Hãy nạp file Daily Sales đầu tiên ở tab Nạp — đội ngũ tháng sẽ hiện ngay tại đây.</p>
        <button className="btn-primary" onClick={onGoNap}>📥 Đến tab Nạp dữ liệu</button>
      </div>
    )
  }

  const { year, month, team, allAgents } = view
  const t = team.totals
  const actPct = t.agentCount > 0 ? Math.round((t.actAgents / t.agentCount) * 100) : 0

  // ── Muc tieu thang (ManMark rut gon): FYP tong = tong FYP sheet Agent,
  // dung cach cong cua man Hom Nay nen 2 man khong lech nhau ──
  const target = getTarget(year, month)
  const fypTotal = t.fyp
  const pct = target !== null && target > 0 ? Math.min(100, Math.max(0, (fypTotal / target) * 100)) : null
  const remaining = target !== null ? target - fypTotal : null

  const query = search.trim().toLowerCase()
  const searchResults = query
    ? allAgents.filter((a) => String(a.agName || '').toLowerCase().includes(query) || String(a.msdl || '').toLowerCase().includes(query))
    : null
  const mocUnits = team.units.filter((u) => !u.actEnough)
  const noCaseAgents = allAgents
    .filter((a) => a.nop === 0)
    .sort((x, y) => String(x.unit).localeCompare(String(y.unit)) || String(x.agName).localeCompare(String(y.agName), 'vi'))
  const topAgents = [...allAgents].sort((x, y) => y.fyp - x.fyp || String(x.agName).localeCompare(String(y.agName), 'vi')).slice(0, 20)

  // ── 1 dong TVV (dung chung cho moi che do hien thi) ──
  const renderAgentRow = (a, opts = {}) => (
    <div className="tvv-row" key={a.msdl}>
      <div className="tvv-main">
        <div className="tvv-name">
          {opts.medal ? <span className="medal">{opts.medal}</span> : null}
          {opts.rank ? <span className="rank">{opts.rank}</span> : null}
          <span className="nm">{a.agName || '—'}</span>
          {a.agSeg ? <span className="seg-chip">{a.agSeg}</span> : null}
        </div>
        <div className="muted">
          {a.msdl}
          {opts.showUnit ? ` · Unit ${a.unit || '—'}` : ''}
          {a.level ? ` · ${a.level}` : ''}
        </div>
        <div className="tvv-nums">
          FYP {fmtTr(a.fyp)} tr · FYC {fmtTr(a.fyc)} tr · Nộp {fmtInt(a.nop)} · PH {fmtInt(a.ph)}
          {a.pend > 0 ? ` · Pending ${fmtInt(a.pend)}` : ''}
        </div>
      </div>
      <span className={`act-badge ${a.isAct ? 'ok' : 'no'}`}>{a.isAct ? '✓ Act' : 'Chưa Act'}</span>
    </div>
  )

  // ── 1 the Unit: header bam xo/gap + hang MOC + danh sach TVV ──
  const renderUnitCard = (u) => {
    const open = filter === 'moc' ? !closedMoc.has(u.unit) : openUnits.has(u.unit)
    const agents = filter === 'moc' ? sortMocAgents(u.agents) : u.agents
    const onToggle = () => {
      if (filter === 'moc') setClosedMoc((s) => toggleInSet(s, u.unit))
      else setOpenUnits((s) => toggleInSet(s, u.unit))
    }
    return (
      <div className="unit-card" key={u.unit}>
        <button type="button" className="unit-head" onClick={onToggle} aria-expanded={open}>
          <div className="unit-main">
            <div className="unit-title">
              <b>{u.unit || '—'}</b>
              {u.leaderName ? <span className="muted"> · Leader {u.leaderName}</span> : null}
            </div>
            <div className="muted">{fmtInt(u.agentCount)} TVV · FYP {fmtTr(u.fyp)} tr</div>
            <div className="moc-line">
              <span>Lượt Act {u.actCount}/{MOC_TARGET}</span>
              <span className="moc-bar">
                <span className={`moc-fill ${u.actEnough ? 'ok' : ''}`} style={{ width: `${Math.min(100, (u.actCount / MOC_TARGET) * 100)}%` }} />
              </span>
              {u.actEnough
                ? <span className="moc-badge ok">✓ Đủ MOC</span>
                : <span className="moc-badge lack">Còn thiếu {u.actNeed} lượt</span>}
            </div>
          </div>
          <span className="unit-caret">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="unit-agents">
            {agents.length === 0
              ? <div className="muted" style={{ padding: '8px 0' }}>Unit chưa có TVV trong dữ liệu tháng này.</div>
              : agents.map((a) => renderAgentRow(a))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* ── Tong quan doi ngu thang ── */}
      <div className="card">
        <h2>👥 Đội ngũ — tháng {month}/{year}</h2>
        <div className="mini-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0 }}>
          <div className="mini-stat"><div className="ms-num">{fmtInt(t.unitCount)}</div><div className="ms-label">Unit</div></div>
          <div className="mini-stat"><div className="ms-num">{fmtInt(t.agentCount)}</div><div className="ms-label">TVV</div></div>
          <div className="mini-stat"><div className="ms-num">{fmtInt(t.actAgents)}</div><div className="ms-label">Đạt Act ({actPct}%)</div></div>
          <div className="mini-stat"><div className="ms-num">{fmtInt(t.unitsEnough)}/{fmtInt(t.unitCount)}</div><div className="ms-label">Unit đủ MOC</div></div>
        </div>
      </div>

      {/* ── Muc tieu thang (ManMark rut gon — chi muc tieu thang) ── */}
      <div className="card">
        <h2>🎯 Mục tiêu tháng {month}/{year}</h2>
        <div><span className="big-num">{fmtTr(fypTotal)}</span> <span className="muted">triệu đồng FYP toàn GA</span></div>
        {target !== null ? (
          <>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            <div style={{ fontSize: 13.5 }}>
              Đạt <b>{(Math.round(pct * 10) / 10).toLocaleString('vi-VN')}%</b> mục tiêu {fmtTr(target)} tr
              {remaining > 0 ? <> · còn thiếu <b>{fmtTr(remaining)} tr</b></> : <> · đã vượt <b>{fmtTr(-remaining)} tr</b> 🎉</>}
            </div>
          </>
        ) : (
          <div style={{ marginTop: 8 }}>
            <span className="chip" onClick={onGoNap}>Chưa đặt mục tiêu tháng — đặt ở tab Nạp</span>
          </div>
        )}
      </div>

      {/* ── Ghi chu trung thuc ve luot Act / MOC uoc tinh ── */}
      <p className="muted" style={{ margin: '0 2px 12px' }}>
        Lượt Act ước tính từ Daily Sales tháng này: TVV có hợp đồng phát hành ròng = 1 lượt,
        ngưỡng MOC ≥ {MOC_TARGET} lượt/Unit. Chưa gồm hệ số TVV mới CL ×2 — số MOC chính thức nằm ở file Compensation.
      </p>

      {/* ── Tim kiem + loc nhanh ── */}
      <div className="search-row">
        <div className="field">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔎 Tìm TVV theo tên hoặc MSĐL…" />
        </div>
      </div>
      <div className="chips-row">
        {FILTERS.map((f) => (
          <button key={f.id} className={`fchip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      {/* ── Noi dung theo che do ── */}
      {searchResults ? (
        <div className="card">
          <h2>Kết quả tìm “{search.trim()}” ({searchResults.length})</h2>
          {searchResults.length === 0
            ? <div className="muted">Không thấy TVV nào khớp.</div>
            : searchResults.map((a) => renderAgentRow(a, { showUnit: true }))}
        </div>
      ) : filter === 'moc' ? (
        mocUnits.length === 0 ? (
          <div className="card empty">
            <div className="e-ic">🎉</div>
            <div style={{ fontWeight: 700 }}>Mọi Unit đều đã đủ lượt Act (ước tính)</div>
          </div>
        ) : (
          <div>{mocUnits.map((u) => renderUnitCard(u))}</div>
        )
      ) : filter === 'nocase' ? (
        <div className="card">
          <h2>📭 Chưa có hồ sơ — {fmtInt(noCaseAgents.length)} TVV</h2>
          <div className="muted" style={{ marginBottom: 6 }}>
            TVV chưa có hồ sơ nào trên Proposal trong tháng {month}/{year} (hồ sơ chỉ nằm ở Pipeline vẫn tính là chưa nộp).
          </div>
          {noCaseAgents.length === 0
            ? <div className="muted">Mọi TVV đều đã có hồ sơ nộp trong tháng. 🎉</div>
            : noCaseAgents.map((a) => renderAgentRow(a, { showUnit: true }))}
        </div>
      ) : filter === 'top' ? (
        <div className="card">
          <h2>🏆 Top 20 TVV theo FYP tháng {month}/{year}</h2>
          {topAgents.length === 0
            ? <div className="muted">Chưa có TVV nào trong dữ liệu tháng này.</div>
            : topAgents.map((a, i) => renderAgentRow(a, { showUnit: true, medal: i < 3 ? MEDALS[i] : null, rank: i >= 3 ? i + 1 : null }))}
        </div>
      ) : (
        <div>
          {team.units.length === 0
            ? <div className="card empty"><div className="e-ic">📭</div>Chưa có Unit/TVV nào trong dữ liệu tháng này.</div>
            : team.units.map((u) => renderUnitCard(u))}
        </div>
      )}
    </div>
  )
}
