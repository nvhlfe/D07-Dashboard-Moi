// ─────────────────────────────────────────────────────────────
// ThiDua — Tab "🏆 Thi Đua" (Lan duyet 13/11/2026): theo doi cac
// chuong trinh thi đua dang chay, TU TINH tu Daily Sales (lib/races).
// Dot dau gom 3 chuong trinh: Memo 00311 (Kickoff T11), Memo 00211
// (Thi đua Thang 11), Memo 00210 (Quy 4/2026).
// QUYEN XEM: MOI NGUOI (ke ca chua dang nhap) xem the chuong trinh +
// danh sach DA DAT (vinh danh cong khai). Danh sach SAP DAT chi
// Admin chinh + TRUONG PHONG thay — CUNG gate + loc theo phong minh
// nhu khoi "Can chu y hom nay" o Tinh Anh (DoiNgu): Admin thay toan
// GA, truong phong chi thay TVV thuoc Unit minh dung dau (leaderCode
// trung MSDL cua minh trong sheet Leader).
// Du lieu: dung snaps App co san + xin tai LAZY thang 10/2026 (va
// 12/2026 neu chua co) qua onNeedMonth — moi thang chi xin 1 lan.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildRaces } from '../lib/races'
import { isSuperAdmin, emailToMsdl } from '../lib/firebaseConfig'

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

// So ngay con lai toi han chot (tinh theo ngay hom nay that cua thiet bi).
function daysToDeadline(isoDate) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(`${isoDate}T00:00:00`)
  return Math.round((target - today) / 86400000)
}

// Nhãn giá trị theo từng chương trình (hiện bên phải mỗi dòng TVV).
const VALUE_LABEL = {
  kickoff: 'IP thuần T11',
  nov: 'IP phát hành T11',
  q4: 'IP tính thưởng Q4',
}

export default function ThiDua({ snaps, loading, remoteSettled = true, onNeedMonth, user, profile, isSuperAdmin: adminProp }) {
  const isAdmin = typeof adminProp === 'boolean' ? adminProp : isSuperAdmin(user)
  const [nearOpen, setNearOpen] = useState({})
  const raceReqRef = useRef(new Set())

  const newest = snaps && snaps.length ? snaps[snaps.length - 1] : null

  // ── Xin tai lazy cac thang nen cua 3 chuong trinh (T10 cho Q4 +
  // xac dinh TVV moi; T12 cho Q4 khi vao thang 12) — moi thang 1 lan.
  useEffect(() => {
    if (!onNeedMonth) return
    for (const ym of ['2026-10', '2026-11', '2026-12']) {
      if ((snaps || []).some((s) => s.id && s.id.startsWith(`${ym}-`))) continue
      if (raceReqRef.current.has(ym)) continue
      raceReqRef.current.add(ym)
      onNeedMonth(ym)
    }
  }, [snaps, onNeedMonth])

  // ── Nhan dien truong phong + phong minh dung dau (CUNG cach DoiNgu):
  // UM/BM theo AGLevel trong sheet Agent, hoac MSDL trung LeaderCode
  // cua 1 Unit trong sheet Leader (snapshot moi nhat toan cuc).
  const viewerMsdl = String((profile && profile.msdl) || emailToMsdl(user && user.email) || '').trim().toUpperCase()
  const leaderCtx = useMemo(() => {
    const empty = { isLeader: false, myUnitCodes: new Set() }
    if (!viewerMsdl || !newest) return empty
    const agentsObj = (newest.data && newest.data.agents) || {}
    const mine = Object.values(agentsObj).find(
      (a) => String((a && a.msdl) || '').trim().toUpperCase() === viewerMsdl,
    )
    const lv = String((mine && mine.level) || '').trim().toUpperCase()
    const myUnitCodes = new Set()
    const unitsObj = (newest.data && newest.data.units) || {}
    for (const [code, u] of Object.entries(unitsObj)) {
      if (String((u && u.leaderCode) || '').trim().toUpperCase() === viewerMsdl) {
        myUnitCodes.add(String(code || '').trim().toUpperCase())
      }
    }
    return { isLeader: lv === 'UM' || lv === 'BM' || myUnitCodes.size > 0, myUnitCodes }
  }, [viewerMsdl, newest])
  const canSeeNear = isAdmin || leaderCtx.isLeader

  const races = useMemo(() => buildRaces(snaps || []), [snaps])

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }
  if (!newest) {
    if (!remoteSettled) {
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
        <p>Số thi đua sẽ hiện tại đây sau khi Admin chính nạp file Daily Sales.</p>
      </div>
    )
  }

  const renderRace = (race) => {
    const { meta } = race
    const days = daysToDeadline(meta.deadline)
    const dataDate = meta.id === 'q4'
      ? (race.dataDates?.nov || race.dataDates?.oct || race.dataDates?.dec)
      : race.dataDate
    // Sap dat: gate Admin/truong phong; truong phong chi thay phong minh.
    const nearAll = race.near || []
    const nearShown = !canSeeNear
      ? null
      : isAdmin
        ? nearAll
        : nearAll.filter((r) => leaderCtx.myUnitCodes.has(String(r.unit || '').trim().toUpperCase()))
    const open = !!nearOpen[meta.id]
    const notes = [...(meta.notes || [])]
    if (meta.id === 'q4' && !race.hasDec) {
      notes.push('Số liệu hiện chưa gồm tháng 12/2026 — IP tính thưởng sẽ còn tăng khi có Daily tháng 12.')
    }
    if (meta.id === 'kickoff' && !race.hasOct) {
      notes.push('App chưa có dữ liệu tháng 10/2026 nên chưa xác định được TVV mới theo quy tắc đối chiếu — số vé TVV mới có thể chưa đầy đủ.')
    }
    return (
      <div className="card race-card" key={meta.id}>
        <div className="race-head">
          <h2>🏆 {meta.name}</h2>
          {days > 0
            ? <span className="race-chip">⏳ Còn {days} ngày</span>
            : days === 0
              ? <span className="race-chip hot">⏰ Hôm nay chốt</span>
              : <span className="race-chip done">Đã chốt</span>}
        </div>
        <div className="race-sub">
          Memo {meta.memo} · {meta.periodLabel} · Hạn chốt {fmtDateVN(meta.deadline)}
          {dataDate ? <> · Dữ liệu đến {fmtDateVN(dataDate)}</> : null}
        </div>

        <ul className="race-tiers">
          {meta.tiersSummary.map((t) => <li key={t}>{t}</li>)}
        </ul>

        <div className="race-count">
          🏅 Đã đạt: <b>{fmtInt(race.achieved.length)}</b> TVV
          {meta.id === 'kickoff' && race.counts
            ? <> (mốc 50tr: {fmtInt(race.counts.standard)} · TVV mới mốc 25tr: {fmtInt(race.counts.fresh)})</>
            : null}
          {meta.id === 'nov' && race.counts
            ? <> (từ 100tr: {fmtInt(race.counts.byTier[0])} · 50tr: {fmtInt(race.counts.byTier[1])} · 25tr: {fmtInt(race.counts.byTier[2])} · 18tr: {fmtInt(race.counts.byTier[3])})</>
            : null}
          {meta.id === 'q4' && race.counts
            ? <> (iPhone Duo: {fmtInt(race.counts.duo)} · iPhone 18 Pro Max: {fmtInt(race.counts.pro)})</>
            : null}
        </div>

        {race.achieved.length === 0
          ? <div className="muted" style={{ marginBottom: 10 }}>Chưa có TVV nào đạt mốc của chương trình này theo dữ liệu hiện có.</div>
          : race.achieved.map((r, i) => (
            <div className="race-row" key={r.msdl}>
              <span className="race-rank">{i + 1}</span>
              <div className="race-who">
                <div className="race-name">{r.name || '—'}{r.unit ? <span className="race-unit"> · {r.unit}</span> : null}</div>
                <div className="race-tier">{r.tierLabel}{meta.id === 'nov' && r.bonus ? <> · thưởng dự kiến <b>{fmtTr(r.bonus)} tr</b></> : null}</div>
              </div>
              <div className="race-val">
                <div className="race-val-num">{fmtTr(r.value)} tr</div>
                <div className="race-val-label">{VALUE_LABEL[meta.id]}</div>
              </div>
            </div>
          ))}

        {nearShown !== null && (
          <div className="race-near">
            <button type="button" className="memo-summary-head attn-head" onClick={() => setNearOpen((o) => ({ ...o, [meta.id]: !o[meta.id] }))} aria-expanded={open}>
              <span className="attn-head-main">
                <span className="attn-head-title">🎯 Sắp đạt ({nearShown.length} người)</span>
                <span className="attn-head-sub">
                  {isAdmin ? 'Chỉ Admin chính và trưởng phòng thấy danh sách này' : 'Chỉ hiện TVV thuộc phòng bạn đứng đầu'}
                  {' · '}ngưỡng: còn thiếu ≤ 20% mốc kế tiếp hoặc ≤ 10tr
                </span>
              </span>
              <span className="memo-caret">{open ? '▾' : '▸'}</span>
            </button>
            {open ? (
              <div className="attn-body">
                {nearShown.length === 0
                  ? <div className="attn-empty">Chưa có TVV nào ở ngưỡng sắp đạt.</div>
                  : nearShown.map((r) => (
                    <div className="attn-row static" key={r.msdl}>
                      <span className="attn-name">{r.name || '—'} <span className="attn-unit">· {r.unit || '—'}</span></span>
                      <span className="attn-detail">{VALUE_LABEL[meta.id]} {fmtTr(r.value)} tr · còn thiếu <b>{fmtTr(r.gap)} tr</b> tới {r.nextLabel}</span>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        )}

        {notes.length > 0 && (
          <div className="race-notes">
            {notes.map((nt) => <div key={nt}>ℹ️ {nt}</div>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>🏆 Thi Đua — các chương trình đang chạy</h2>
        <div className="muted">
          Số liệu tự tính từ Daily Sales Admin nạp hằng ngày. Danh sách <b>đã đạt</b> mở công khai để vinh danh;
          danh sách <b>sắp đạt</b> chỉ Admin chính và trưởng phòng thấy để đốc thúc.
          Điều kiện nằm ngoài dữ liệu Daily (nếu có) được ghi chú ngay trong từng chương trình.
        </div>
      </div>
      <div className="race-grid">
        {races.map(renderRace)}
      </div>
    </div>
  )
}
