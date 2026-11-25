// ─────────────────────────────────────────────────────────────
// ThiDua — Tab "🏆 Thi Đua" (Lan duyet 13/11/2026): theo doi cac
// chuong trinh thi đua dang chay. Kien truc tu 25/11/2026 (Lan
// yeu cau): the Kickoff TU TINH tu Daily Sales; 2 the con lai
// theo BANG THEO DOI CHINH THUC cua cong ty (file Excel
// Memo_18.11.xlsx, Lan gui 20/11/2026):
//  - Memo 00311 (Kickoff 2027): TU TINH bang lib/races
//    (raceKickoff) — IP THUAN phat hanh = Σ ipNet cac dong IF cua
//    snapshot thang 11 moi nhat; TVV thuong ≥50tr -> ve, TVV MOI
//    (xap xi: chua co mat o sheet Agent snapshot thang 10) ≥25tr
//    -> ve. Ve la ve TAM DAT: dieu kien duy tri phi tai tuc
//    ≥75% cong ty chot tai 30/11/2026 theo memo. Xin tai lazy 2
//    thang nen 2026-10 + 2026-11 qua onNeedMonth (moi thang 1
//    lan). Danh sach DA DAT + SAP DAT hien CONG KHAI (khong con
//    gate Admin/truong phong nhu ban truoc 20/11/2026).
//  - Memo 00211 (Thi đua Thang 11): lib/raceOfficial
//    (NOV_OFFICIAL) — cong ty tinh gom ca IP nop + phat hanh,
//    khac du lieu Daily nen app khong tu tinh lai.
//  - Memo 00210 (thuong iPhone Quy 4): lib/iphoneOfficial — bang
//    cong ty cap nhat 18/11/2026 (45 TVV), hien toan bo danh
//    sach kem so con thieu tung moc tren tung dong.
// DONG/MO tung the (Lan yeu cau 14/11/2026 — trang qua dai): moi
// the chuong trinh dong/mo doc lap bang nut o hang dau the; khi
// DONG chi hien ten + so memo + chip han chot + 1 dong tom tat
// nhanh; cuoi the mo co nut "Thu gon". MAC DINH chi mo 1 the co
// han chot GAN NHAT (xem defaultOpenRaceId ben duoi).
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { raceKickoff } from '../lib/races'
import { IPHONE_OFFICIAL, iphoneRowStatus, iphoneSummary } from '../lib/iphoneOfficial'
import {
  NOV_OFFICIAL,
  novOfficialTier, novOfficialSummary,
} from '../lib/raceOfficial'

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
// Ty le 0–1 -> phan tram 1 chu so thap phan, dinh dang vi-VN (dau phay).
const fmtPct = (ratio) => {
  const v = (Number(ratio) || 0) * 100
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// So ngay con lai toi han chot (tinh theo ngay hom nay that cua thiet bi).
function daysToDeadline(isoDate) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(`${isoDate}T00:00:00`)
  return Math.round((target - today) / 86400000)
}

// The chuong trinh iPhone chinh thuc (Memo 00210) trong co che dong/mo.
const IPHONE_RACE_ID = 'iphone'
const IPHONE_DEADLINE = '2026-12-31'

// Danh sach the co dinh theo DUNG thu tu hien thi tren tab:
// Kickoff -> Thang 11 -> iPhone.
const raceEntries = [
  { id: 'kickoff', deadline: '2026-11-30' },
  { id: 'nov', deadline: '2026-11-30' },
  { id: IPHONE_RACE_ID, deadline: IPHONE_DEADLINE },
]

// The MAC DINH mo khi vao tab: the co han chot GAN NHAT so voi hom
// nay — uu tien the sap chot chua qua han (han chot nho nhat trong
// cac the chua chot); 2 the cung han chot (00311 + 00211 deu
// 30/11) thi lay the DAU TIEN theo thu tu hien thi; neu tat ca da
// qua han thi lay the co han chot gan hom nay nhat (moi chot nhat).
// entries: [{ id, deadline }] theo DUNG thu tu hien thi tren tab.
export function defaultOpenRaceId(entries) {
  let best = null
  for (const e of entries || []) {
    const d = daysToDeadline(e.deadline)
    if (!best) { best = { id: e.id, d }; continue }
    const bestFuture = best.d >= 0
    const candFuture = d >= 0
    if (candFuture && !bestFuture) best = { id: e.id, d }
    else if (candFuture && bestFuture && d < best.d) best = { id: e.id, d }
    else if (!candFuture && !bestFuture && d > best.d) best = { id: e.id, d }
  }
  return best ? best.id : null
}

export default function ThiDua({ snaps, loading, onNeedMonth }) {
  const [nearOpen, setNearOpen] = useState(false)
  const raceReqRef = useRef(new Set())

  // ── Xin tai lazy 2 thang nen cua the Kickoff tu tinh (T10 cho
  // xac dinh TVV moi; T11 la thang thi dua) — moi thang 1 lan,
  // chi khi snaps chua co thang do.
  useEffect(() => {
    if (!onNeedMonth) return
    for (const ym of ['2026-10', '2026-11']) {
      if ((snaps || []).some((s) => s.id && s.id.startsWith(`${ym}-`))) continue
      if (raceReqRef.current.has(ym)) continue
      raceReqRef.current.add(ym)
      onNeedMonth(ym)
    }
  }, [snaps, onNeedMonth])

  // ── The Kickoff TU TINH tu Daily Sales (lib/races).
  const kickoff = useMemo(() => raceKickoff(snaps || []), [snaps])

  // ── Dong/mo tung the chuong trinh (state noi bo, khong luu ben).
  // openRaces = null nghia la chua thao tac: dung ban do mac dinh
  // chi mo 1 the gan han chot nhat (hien tai la Kickoff 00311).
  const defaultOpenId = defaultOpenRaceId(raceEntries)
  const [openRaces, setOpenRaces] = useState(null)
  const openMap = openRaces || (defaultOpenId ? { [defaultOpenId]: true } : {})
  const toggleRace = (id) => setOpenRaces((prev) => {
    const cur = prev || (defaultOpenId ? { [defaultOpenId]: true } : {})
    return { ...cur, [id]: !cur[id] }
  })

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }

  // Hang dau the (nut bam dong/mo) + chip han chot — dung chung 3 the.
  const renderHead = (id, title, deadline) => {
    const days = daysToDeadline(deadline)
    const isOpen = !!openMap[id]
    return (
      <button type="button" className="race-head race-toggle" onClick={() => toggleRace(id)} aria-expanded={isOpen}>
        <h2>{title}</h2>
        {days > 0
          ? <span className="race-chip">⏳ Còn {days} ngày</span>
          : days === 0
            ? <span className="race-chip hot">⏰ Hôm nay chốt</span>
            : <span className="race-chip done">Đã chốt</span>}
        <span className="memo-caret">{isOpen ? '▾' : '▸'}</span>
      </button>
    )
  }

  // ── The Memo 00311 (Kickoff 2027): TU TINH tu Daily Sales
  // (lib/races — raceKickoff). Danh sach DA DAT + SAP DAT hien
  // CONG KHAI cho moi nguoi (khong gate Admin/truong phong).
  const renderKickoff = () => {
    const { meta } = kickoff
    const isOpen = !!openMap.kickoff
    const hasData = !!kickoff.dataDate
    const countLine = hasData
      ? <>🏅 Vé tạm đạt: <b>{fmtInt(kickoff.achieved.length)}</b> TVV (mốc 50tr: {fmtInt(kickoff.counts.standard)} · TVV mới mốc 25tr: {fmtInt(kickoff.counts.fresh)})</>
      : <>⏳ Chờ dữ liệu Daily Sales tháng 11…</>
    const notes = [...(meta.notes || [])]
    if (hasData && !kickoff.hasOct) {
      notes.push('App chưa có dữ liệu tháng 10/2026 nên chưa xác định được TVV mới theo quy tắc đối chiếu — số vé TVV mới có thể chưa đầy đủ.')
    }
    return (
      <div className="card race-card">
        {renderHead('kickoff', '🏆 Tăng tốc về đích 2026 — Ghi danh Agency Kickoff 2027', '2026-11-30')}
        <div className="race-sub">
          Memo 00311/AD/2026 · 01/11 – 30/11/2026 · Hạn chốt 30/11/2026
        </div>

        {!isOpen && <div className="race-quick">{countLine}</div>}

        {isOpen && !hasData && (<>
        <div className="muted" style={{ marginBottom: 10 }}>
          📭 Chưa có dữ liệu Daily Sales tháng 11/2026 — thẻ Kickoff sẽ tự tính ngay khi Admin nạp Daily.
        </div>

        <button type="button" className="race-collapse-btn" onClick={() => toggleRace('kickoff')}>Thu gọn ⌃</button>
        </>)}

        {isOpen && hasData && (<>
        <div className="race-source">
          📊 Tự tính từ Daily Sales Admin nạp hằng ngày — dữ liệu đến {fmtDateVN(kickoff.dataDate)}.
          Vé là vé TẠM ĐẠT theo IP thuần phát hành; điều kiện duy trì phí tái tục ≥75% được công ty chốt tại 30/11/2026 theo memo.
        </div>

        <ul className="race-tiers">
          {meta.tiersSummary.map((t) => <li key={t}>{t}</li>)}
        </ul>

        <div className="race-count">{countLine}</div>

        {kickoff.achieved.length === 0
          ? <div className="muted" style={{ marginBottom: 10 }}>Chưa có TVV nào đạt mốc vé của chương trình này theo dữ liệu hiện có.</div>
          : kickoff.achieved.map((r, i) => (
            <div className="race-row" key={r.msdl}>
              <span className="race-rank">{i + 1}</span>
              <div className="race-who">
                <div className="race-name">{r.name || '—'}{r.unit ? <span className="race-unit"> · {r.unit}</span> : null}</div>
                <div className="race-tier">{r.tierLabel}</div>
              </div>
              <div className="race-val">
                <div className="race-val-num">{fmtTr(r.value)} tr</div>
                <div className="race-val-label">IP thuần T11</div>
              </div>
            </div>
          ))}

        <div className="race-near">
          <button type="button" className="memo-summary-head" onClick={() => setNearOpen((o) => !o)} aria-expanded={nearOpen}>
            <span className="attn-head-main">
              <span className="attn-head-title">🎯 Sắp đạt ({kickoff.near.length} người)</span>
              <span className="attn-head-sub">Còn thiếu ≤ 20% mốc kế tiếp hoặc ≤ 10tr</span>
            </span>
            <span className="memo-caret">{nearOpen ? '▾' : '▸'}</span>
          </button>
          {nearOpen ? (
            <div className="attn-body">
              {kickoff.near.length === 0
                ? <div className="attn-empty">Chưa có TVV nào ở ngưỡng sắp đạt.</div>
                : kickoff.near.map((r) => (
                  <div className="attn-row static" key={r.msdl}>
                    <span className="attn-name">{r.name || '—'} <span className="attn-unit">· {r.unit || '—'}</span></span>
                    <span className="attn-detail">IP thuần T11 {fmtTr(r.value)} tr · còn thiếu <b>{fmtTr(r.gap)} tr</b> tới {r.nextLabel}</span>
                  </div>
                ))}
            </div>
          ) : null}
        </div>

        {notes.length > 0 && (
          <div className="race-notes">
            {notes.map((nt) => <div key={nt}>ℹ️ {nt}</div>)}
          </div>
        )}

        <button type="button" className="race-collapse-btn" onClick={() => toggleRace('kickoff')}>Thu gọn ⌃</button>
        </>)}
      </div>
    )
  }

  // ── The Memo 00211 (Thi đua Thang 11): BANG CHINH THUC cong ty
  // (lib/raceOfficial) — IP nop + phat hanh theo cach tinh cong ty.
  const renderNov = () => {
    const sum = novOfficialSummary()
    const rows = [...NOV_OFFICIAL.rows].sort((a, b) => b.total - a.total)
    const isOpen = !!openMap.nov
    const countLine = (
      <>🏅 Đã đạt thưởng: <b>{fmtInt(sum.achieved)}</b> TVV · Tổng thưởng dự kiến {fmtTr(sum.totalBonus / 1000000)}tr (từ 100tr: {fmtInt(sum.byTier[0])} · 50tr: {fmtInt(sum.byTier[1])} · 25tr: {fmtInt(sum.byTier[2])} · 18tr: {fmtInt(sum.byTier[3])})</>
    )
    return (
      <div className="card race-card">
        {renderHead('nov', '🏆 Thi đua Tháng 11/2026', '2026-11-30')}
        <div className="race-sub">
          Memo 00211/AD/2026 · 01/11 – 30/11/2026 · Hạn chốt 30/11/2026
        </div>

        {!isOpen && <div className="race-quick">{countLine}</div>}

        {isOpen && (<>
        <div className="race-source">
          📋 Kết quả theo bảng theo dõi chính thức của công ty — {NOV_OFFICIAL.updatedLabel}.
          IP trong bảng là IP nộp + phát hành theo cách tính của công ty.
        </div>

        <ul className="race-tiers">
          <li>IP phát hành từ 18–&lt;25tr → thưởng 1,5tr</li>
          <li>IP phát hành từ 25–&lt;50tr → thưởng 2,5tr</li>
          <li>IP phát hành từ 50–&lt;100tr → thưởng 5,0tr</li>
          <li>IP phát hành từ 100tr → thưởng 8% IP (tổng thưởng tối đa 100tr/TVV)</li>
        </ul>

        <div className="race-count">{countLine}</div>

        {rows.map((r, i) => {
          const t = novOfficialTier(r.total, r.crossRatio)
          const pct = fmtPct(r.crossRatio)
          return (
            <div className="race-row" key={r.msdl}>
              <span className="race-rank">{i + 1}</span>
              <div className="race-who">
                <div className="race-name">{r.name || '—'}{r.unit ? <span className="race-unit"> · {r.unit}</span> : null}</div>
                <div className="race-tier">
                  {t.tier
                    ? <>{t.tier.label} · thưởng dự kiến <b>{fmtTr(t.bonus / 1000000)} tr</b>{t.doubled ? <> (đã ×2 vì IP bán cùng {pct}% ≥ 40%)</> : null}</>
                    : <>Chưa đạt · còn thiếu {fmtTr(t.lackToFirst / 1000000)} tr tới mốc 18tr (thưởng 1,5tr)</>}
                  {' · '}IP bán cùng {pct}%
                </div>
              </div>
              <div className="race-val">
                <div className="race-val-num">{fmtTr(r.total / 1000000)} tr</div>
                <div className="race-val-label">Tổng IP T11</div>
              </div>
            </div>
          )
        })}

        <div className="race-notes">
          <div>ℹ️ Thưởng chính nhân đôi (×2) khi IP bán cùng đạt từ 40% — trong bảng 18/11 có 2 TVV đạt điều kiện này và đã tính vào thưởng dự kiến: Trần Thị Ngọc Phương (42,0%) và Đỗ Ngọc Thảo (40,3%).</div>
          <div>ℹ️ Số IP của bảng công ty gồm cả nộp + phát hành nên khác số IP phát hành app tự tính từ Daily trước đây.</div>
        </div>

        <button type="button" className="race-collapse-btn" onClick={() => toggleRace('nov')}>Thu gọn ⌃</button>
        </>)}
      </div>
    )
  }

  // ── The Memo 00210: BANG CHINH THUC cua cong ty (lib/iphoneOfficial).
  // Hien TOAN BO danh sach cong khai (so cong ty, khong gate, khong
  // co khoi "Sap dat" rieng — so con thieu tung moc da ghi ngay tren
  // tung dong). Du lieu tinh nen hien ca khi chua co Daily tren may.
  const renderIphone = () => {
    const sum = iphoneSummary()
    const rows = [...IPHONE_OFFICIAL.rows].sort((a, b) => b.total - a.total)
    const isOpen = !!openMap[IPHONE_RACE_ID]
    const goalLine = (label, st) => (
      <>{label}: {st.reached ? <b>✅ Đạt</b> : <>còn thiếu <b>{fmtTr(st.lack / 1000000)} tr</b></>}</>
    )
    return (
      <div className="card race-card">
        {renderHead(IPHONE_RACE_ID, '🏆 Đỉnh cao hiệu suất — Rinh ngay quà lớn (Quý 4/2026)', IPHONE_DEADLINE)}
        <div className="race-sub">
          Memo 00210/AD/2026 · Quý 4/2026 (T10–T12) · Hạn chốt 31/12/2026
        </div>

        {!isOpen && (
          <div className="race-quick">
            🏅 Đạt iPhone 18 Pro Max: <b>{fmtInt(sum.datPromax)}</b> TVV · Đạt iPhone Duo: <b>{fmtInt(sum.datDuo)}</b> TVV
            {' '}· Bảng công ty có {fmtInt(sum.total)} TVV
          </div>
        )}

        {isOpen && (<>
        <div className="race-source">
          📋 Kết quả theo bảng theo dõi chính thức của công ty — {IPHONE_OFFICIAL.updatedLabel}.
          Công ty tính IP nộp + phát hành và IP hỗ trợ đặc biệt nên app hiển thị nguyên văn bảng này, không tự tính lại từ Daily Sales.
        </div>

        <ul className="race-tiers">
          <li>Tổng IP tính thưởng 600–&lt;900tr → iPhone 18 Pro Max 256GB</li>
          <li>Tổng IP tính thưởng từ 900tr → iPhone Duo 256GB</li>
        </ul>

        <div className="race-count">
          🏅 Đạt iPhone 18 Pro Max: <b>{fmtInt(sum.datPromax)}</b> TVV · Đạt iPhone Duo: <b>{fmtInt(sum.datDuo)}</b> TVV
          {' '}· Bảng công ty có {fmtInt(sum.total)} TVV
        </div>

        {rows.map((r, i) => {
          const st = iphoneRowStatus(r)
          return (
            <div className="race-row" key={r.msdl}>
              <span className="race-rank">{i + 1}</span>
              <div className="race-who">
                <div className="race-name">{r.name || '—'}{r.unit ? <span className="race-unit"> · {r.unit}</span> : null}</div>
                <div className="race-tier">
                  {goalLine('📱 iPhone 18 Pro Max', st.promax)}
                  {' · '}
                  {goalLine('📱 iPhone Duo', st.duo)}
                </div>
              </div>
              <div className="race-val">
                <div className="race-val-num">{fmtTr(r.total / 1000000)} tr</div>
                <div className="race-val-label">Tổng IP tính thưởng</div>
              </div>
            </div>
          )
        })}

        <div className="race-notes">
          <div>ℹ️ Điều kiện của memo: mỗi TVV tối đa 01 quà, không quy đổi tiền; riêng Pru-Đầu Tư Vững Tiến chỉ tính hồ sơ từ 20tr.</div>
          <div>ℹ️ Khi công ty gửi bảng cập nhật mới, Admin gửi ảnh/file cho Muse để cập nhật lại danh sách này.</div>
        </div>

        <button type="button" className="race-collapse-btn" onClick={() => toggleRace(IPHONE_RACE_ID)}>Thu gọn ⌃</button>
        </>)}
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>🏆 Thi Đua — các chương trình đang chạy</h2>
        <div className="muted">
          Vé Kickoff (Memo 00311) tự tính từ Daily Sales Admin nạp hằng ngày; hai chương trình còn lại
          (00211 Tháng 11, 00210 iPhone Quý 4) hiển thị theo bảng theo dõi chính thức của công ty (cập nhật 18/11/2026).
          Danh sách đã đạt mở công khai để vinh danh.
          Bấm vào đầu từng chương trình để mở/thu gọn.
        </div>
      </div>
      <div className="race-grid">
        {renderKickoff()}
        {renderNov()}
        {renderIphone()}
      </div>
    </div>
  )
}
