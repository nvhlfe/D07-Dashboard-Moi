// ─────────────────────────────────────────────────────────────
// ThiDua — Tab "🏆 Thi Đua" (Lan duyet 13/11/2026): theo doi cac
// chuong trinh thi đua dang chay. 2 chuong trinh thang 11 TU TINH
// tu Daily Sales (lib/races): Memo 00311 (Kickoff T11) + Memo
// 00211 (Thi đua Thang 11). Chuong trinh Memo 00210 (thuong
// iPhone Quy 4) hien theo BANG THEO DOI CHINH THUC cua cong ty
// (lib/iphoneOfficial — Lan gui bang ngay 13/11/2026, import
// 14/11/2026): cong ty tinh gom ca IP nop + phat hanh va IP ho
// tro dac biet, khac du lieu Daily nen app KHONG tu tinh lai.
// QUYEN XEM: MOI NGUOI (ke ca chua dang nhap) xem the chuong trinh +
// danh sach DA DAT (vinh danh cong khai). Danh sach SAP DAT (2
// chuong trinh tu tinh) chi Admin chinh + TRUONG PHONG thay —
// CUNG gate + loc theo phong minh nhu khoi "Can chu y hom nay" o
// Tinh Anh (DoiNgu): Admin thay toan GA, truong phong chi thay
// TVV thuoc Unit minh dung dau (leaderCode trung MSDL cua minh
// trong sheet Leader).
// Du lieu: dung snaps App co san + xin tai LAZY thang 10/2026 qua
// onNeedMonth — moi thang chi xin 1 lan. The iPhone chinh thuc la
// du lieu tinh, hien ngay ca khi chua co Daily tren may.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildRaces } from '../lib/races'
import { IPHONE_OFFICIAL, iphoneRowStatus, iphoneSummary } from '../lib/iphoneOfficial'
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
}

export default function ThiDua({ snaps, loading, remoteSettled = true, onNeedMonth, user, profile, isSuperAdmin: adminProp }) {
  const isAdmin = typeof adminProp === 'boolean' ? adminProp : isSuperAdmin(user)
  const [nearOpen, setNearOpen] = useState({})
  const raceReqRef = useRef(new Set())

  const newest = snaps && snaps.length ? snaps[snaps.length - 1] : null

  // ── Xin tai lazy cac thang nen cua 2 chuong trinh tu tinh
  // (T10 cho xac dinh TVV moi cua Kickoff; T11 la thang thi dua)
  // — moi thang 1 lan.
  useEffect(() => {
    if (!onNeedMonth) return
    for (const ym of ['2026-10', '2026-11']) {
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
  const renderRace = (race) => {
    const { meta } = race
    const days = daysToDeadline(meta.deadline)
    const dataDate = race.dataDate
    // Sap dat: gate Admin/truong phong; truong phong chi thay phong minh.
    const nearAll = race.near || []
    const nearShown = !canSeeNear
      ? null
      : isAdmin
        ? nearAll
        : nearAll.filter((r) => leaderCtx.myUnitCodes.has(String(r.unit || '').trim().toUpperCase()))
    const open = !!nearOpen[meta.id]
    const notes = [...(meta.notes || [])]
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

  // ── The Memo 00210: BANG CHINH THUC cua cong ty (lib/iphoneOfficial).
  // Hien TOAN BO danh sach cong khai (so cong ty, khong gate, khong
  // co khoi "Sap dat" rieng — so con thieu tung moc da ghi ngay tren
  // tung dong). Du lieu tinh nen hien ca khi chua co Daily tren may.
  const renderIphone = () => {
    const days = daysToDeadline('2026-12-31')
    const sum = iphoneSummary()
    const rows = [...IPHONE_OFFICIAL.rows].sort((a, b) => b.total - a.total)
    const goalLine = (label, st) => (
      <>{label}: {st.reached ? <b>✅ Đạt</b> : <>còn thiếu <b>{fmtTr(st.lack / 1000000)} tr</b></>}</>
    )
    return (
      <div className="card race-card">
        <div className="race-head">
          <h2>🏆 Đỉnh cao hiệu suất — Rinh ngay quà lớn (Quý 4/2026)</h2>
          {days > 0
            ? <span className="race-chip">⏳ Còn {days} ngày</span>
            : days === 0
              ? <span className="race-chip hot">⏰ Hôm nay chốt</span>
              : <span className="race-chip done">Đã chốt</span>}
        </div>
        <div className="race-sub">
          Memo 00210/AD/2026 · Quý 4/2026 (T10–T12) · Hạn chốt 31/12/2026
        </div>

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
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>🏆 Thi Đua — các chương trình đang chạy</h2>
        <div className="muted">
          Hai chương trình tháng 11 tự tính từ Daily Sales Admin nạp hằng ngày; chương trình thưởng iPhone Quý 4
          hiển thị theo <b>bảng theo dõi chính thức của công ty</b>. Danh sách <b>đã đạt</b> mở công khai để vinh danh;
          danh sách <b>sắp đạt</b> (các chương trình tự tính) chỉ Admin chính và trưởng phòng thấy để đốc thúc.
          Điều kiện nằm ngoài dữ liệu Daily (nếu có) được ghi chú ngay trong từng chương trình.
        </div>
      </div>
      <div className="race-grid">
        {newest
          ? races.map(renderRace)
          : (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{remoteSettled ? '📭 Chưa có dữ liệu Daily Sales' : '⏳ Đang tải dữ liệu…'}</div>
              <div className="muted">
                {remoteSettled
                  ? 'Hai chương trình tháng 11 (00311, 00211) sẽ hiện tại đây sau khi Admin chính nạp file Daily Sales. Chương trình iPhone Quý 4 theo bảng công ty vẫn xem được ở bên cạnh.'
                  : 'Lần đầu trên thiết bị này có thể mất vài giây — dữ liệu Daily đang được tải về, bạn không cần nạp lại file. Chương trình iPhone Quý 4 theo bảng công ty vẫn xem được ở bên cạnh.'}
              </div>
            </div>
          )}
        {renderIphone()}
      </div>
    </div>
  )
}
