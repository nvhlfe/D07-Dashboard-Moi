// ─────────────────────────────────────────────────────────────
// ThiDua — Tab "🏆 Thi Đua" (Lan duyet 13/11/2026): theo doi cac
// chuong trinh thi đua dang chay. Tu 20/11/2026 CA 3 chuong trinh
// deu hien theo BANG THEO DOI CHINH THUC cua cong ty trong file
// Excel Memo_18.11.xlsx (Lan gui 20/11/2026):
//  - Memo 00311 (Kickoff 2027) + Memo 00211 (Thi đua Thang 11):
//    lib/raceOfficial — cong ty tinh gom ca IP nop + phat hanh
//    (00211) va da tinh san SO VE TAM DAT (00311), khac du lieu
//    Daily nen app KHONG tu tinh lai tu Daily nua.
//  - Memo 00210 (thuong iPhone Quy 4): lib/iphoneOfficial — bang
//    cong ty cap nhat 18/11/2026 (45 TVV).
// Khong con tu tinh tu Daily, khong con tai lazy thang, khong
// con khoi "Sap dat" gate Admin/truong phong:
// ca 3 the la du lieu TINH cua cong ty, hien cong khai toan bo
// danh sach de vinh danh (so con thieu tung moc ghi ngay tren
// tung dong o the iPhone; ve 00311 la ve TAM DAT — cong ty chot
// dieu kien duy tri phi tai 30/11/2026).
// DONG/MO tung the (Lan yeu cau 14/11/2026 — trang qua dai): moi
// the chuong trinh dong/mo doc lap bang nut o hang dau the; khi
// DONG chi hien ten + so memo + chip han chot + 1 dong tom tat
// nhanh; cuoi the mo co nut "Thu gon". MAC DINH chi mo 1 the co
// han chot GAN NHAT (xem defaultOpenRaceId ben duoi).
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react'
import { IPHONE_OFFICIAL, iphoneRowStatus, iphoneSummary } from '../lib/iphoneOfficial'
import {
  NOV_OFFICIAL, KICKOFF_OFFICIAL, KICKOFF_OFFICIAL_TARGET,
  novOfficialTier, novOfficialSummary, kickoffOfficialSummary,
} from '../lib/raceOfficial'

const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN')
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

export default function ThiDua({ loading }) {
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

  // ── The Memo 00311 (Kickoff 2027): BANG CHINH THUC cong ty
  // (lib/raceOfficial) — so ve TAM DAT cong ty da tinh san.
  const renderKickoff = () => {
    const sum = kickoffOfficialSummary()
    const rows = [...KICKOFF_OFFICIAL.rows].sort((a, b) => b.ipNet - a.ipNet)
    const isOpen = !!openMap.kickoff
    const countLine = (
      <>🏅 Vé tạm đạt: <b>{fmtInt(sum.totalTickets)}</b> vé · <b>{fmtInt(sum.achievers)}</b> TVV đạt · Bảng công ty có {fmtInt(sum.total)} TVV</>
    )
    return (
      <div className="card race-card">
        {renderHead('kickoff', '🏆 Tăng tốc về đích 2026 — Ghi danh Agency Kickoff 2027', '2026-11-30')}
        <div className="race-sub">
          Memo 00311/AD/2026 · 01/11 – 30/11/2026 · Hạn chốt 30/11/2026
        </div>

        {!isOpen && <div className="race-quick">{countLine}</div>}

        {isOpen && (<>
        <div className="race-source">
          📋 Kết quả theo bảng theo dõi chính thức của công ty — {KICKOFF_OFFICIAL.updatedLabel}.
          Vé trong bảng là vé TẠM ĐẠT — công ty chốt điều kiện duy trì phí tại 30/11/2026.
        </div>

        <ul className="race-tiers">
          <li>TVV: IP thuần tháng 11 từ 50tr → 01 vé tham dự</li>
          <li>TVV MỚI có hoạt động: IP thuần tháng 11 từ 25tr → 01 vé</li>
        </ul>

        <div className="race-count">{countLine}</div>

        {rows.map((r, i) => {
          const parts = []
          if ((Number(r.tickets) || 0) > 0) {
            parts.push(`🎟️ Vé tạm đạt: ${fmtInt(r.tickets)} vé (diện TVV)`)
          } else {
            parts.push(`Còn thiếu ${fmtTr((KICKOFF_OFFICIAL_TARGET - r.ipNet) / 1000000)} tr tới mốc vé 50tr`)
          }
          if (r.retention != null) {
            parts.push(`Duy trì phí cá nhân ${fmtPct(r.retention)}%`)
          }
          return (
            <div className="race-row" key={r.msdl}>
              <span className="race-rank">{i + 1}</span>
              <div className="race-who">
                <div className="race-name">{r.name || '—'}{r.unit ? <span className="race-unit"> · {r.unit}</span> : null}</div>
                <div className="race-tier">{parts.join(' · ')}</div>
              </div>
              <div className="race-val">
                <div className="race-val-num">{fmtTr(r.ipNet / 1000000)} tr</div>
                <div className="race-val-label">IP thuần T11</div>
              </div>
            </div>
          )
        })}

        <div className="race-notes">
          <div>ℹ️ Điều kiện chốt vé: tỷ lệ duy trì phí tái tục cá nhân (TVV) / của phòng (QLTVV) tại 30/11/2026 từ 75%; tối đa 01 vé/TVV, riêng TVV giới thiệu tối đa 02 vé.</div>
          <div>ℹ️ Trong bảng 18/11, cả 33 TVV đều thuộc diện TVV thường và 10 vé tạm đạt đều thuộc diện TVV — chưa có vé thuộc diện TVV mới, giới thiệu hay QLTVV.</div>
        </div>

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
          Cả ba chương trình thi đua hiển thị theo bảng theo dõi chính thức của công ty (cập nhật 18/11/2026).
          Danh sách đã đạt mở công khai để vinh danh; điều kiện nằm ngoài bảng (nếu có) được ghi chú ngay trong từng chương trình.
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
