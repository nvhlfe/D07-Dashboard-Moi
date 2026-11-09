// ─────────────────────────────────────────────────────────────
// HomNay — Man hinh "Hom Nay" (MVP): hero countdown + quote, tien do FYP,
// 4 KPI, Top 5 TVV, thanh xep chong, bieu do nhip nop theo ngay
// (cot xep chong SVG, thay heatmap APE cu — mau D03) + hanh trinh nam, canh bao.
// Nguon so: snapshot Daily moi nhat (Firestore neu co, khong thi localStorage).
// Logic KPI dung analyzeSoSanLuong (port tu So San Luong ban cu).
// ─────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react'
import { analyzeSoSanLuong } from '../lib/analyze'
import { buildCases } from '../lib/cases'
import { dailyStacks, buildYearJourney } from '../lib/journey'
import { DailyStackChart, YearJourneyChart } from './Charts'
import { QUOTES, quoteIndexForDate } from '../lib/quotes'
import { getTarget } from '../lib/store'
import { isSuperAdmin } from '../lib/firebaseConfig'

const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN')
const MEDALS = ['🥇', '🥈', '🥉']

function daysUntil(isoDate) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(`${isoDate}T00:00:00`)
  return Math.round((target - today) / 86400000)
}

export default function HomNay({ snaps, loading, onGoNap, user, profile, onOpenLogin, onOpenAccount }) {
  const [quoteOffset, setQuoteOffset] = useState(0)
  const [selDay, setSelDay] = useState(null)

  const newest = snaps && snaps.length ? snaps[snaps.length - 1] : null

  const view = useMemo(() => {
    if (!newest) return null
    const [year, month] = newest.id.split('-').map(Number)
    const ymPrefix = newest.id.slice(0, 7)
    const pm = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
    const p = (n) => String(n).padStart(2, '0')
    const prevMonthDocs = snaps.filter((s) => s.id.startsWith(`${pm.y}-${p(pm.m)}-`))
    const analysis = analyzeSoSanLuong([newest], prevMonthDocs, { year, month })
    const agentsObj = newest.data?.agents || {}
    const agentsList = Object.values(agentsObj)
    const fypTotal = agentsList.reduce((s, a) => s + (Number(a.fyp) || 0), 0)
    // Top 5 theo IP phat hanh rong; neu chua co thi fallback theo IP Net cua Agent
    let top = (analysis.topNet || []).map((a) => ({ name: a.name, unit: a.unit, ip: a.netIp }))
    if (!top.length) {
      top = agentsList
        .filter((a) => (Number(a.ipNet) || 0) > 0)
        .sort((x, y) => (y.ipNet || 0) - (x.ipNet || 0))
        .slice(0, 5)
        .map((a) => ({ name: a.agName, unit: a.unit, ip: a.ipNet }))
    }
    const daysInMonth = new Date(year, month, 0).getDate()
    // Bieu do "Nhip nop theo ngay" (thay heatmap APE cu — theo mau D03 Lan
    // gui): cot xep chong theo ngay NOP, to theo TRANG THAI HIEN TAI; gia tri
    // groupValue (IF = IP Net rong; PS/Pipeline = APE neu co, khong thi IP Sub)
    // — nhat quan voi thanh xep chong o Doi Ngu / Sales Report.
    const stacks = dailyStacks(buildCases(newest), ymPrefix)
    // "Hanh trinh nam": cot FYP + duong so TVV Active theo thang. Thang co
    // so GA (gaHistory: 2026 T1-T10) lay so GA; thang con lai lay snapshot
    // MOI NHAT cua thang do (trong snaps da gop may + may).
    const journey = buildYearJourney(snaps, year)
    const pendingOld = (analysis.pendingAll || []).filter((c) => (c.ageDays ?? 0) > 7)
    const tvvActive = agentsList.filter((a) => (Number(a.fyp) || 0) > 0 || (a.cIF || 0) + (a.cPS || 0) + (a.cOther || 0) > 0).length
    return {
      year, month, daysInMonth, analysis,
      fypTotal, top, stacks, journey, pendingOld, tvvActive, tvvTotal: agentsList.length,
      agentsObj,
      snapDay: Number(newest.id.split('-')[2]),
    }
  }, [snaps, newest])

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }
  if (!newest || !view) {
    return (
      <div className="card empty">
        <div className="e-ic">📭</div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có dữ liệu Daily Sales</div>
        <p style={{ marginBottom: 14 }}>Hãy nạp file Daily Sales đầu tiên ở tab Nạp — số liệu tháng sẽ hiện ngay tại đây.</p>
        <button className="btn-primary" onClick={onGoNap}>📥 Đến tab Nạp dữ liệu</button>
      </div>
    )
  }

  const { year, month, daysInMonth, analysis, fypTotal, top, stacks, journey, pendingOld } = view
  const t = analysis.totals
  const target = getTarget(year, month)

  // ── Ngay dang chon tren bieu do nhip nop (mac dinh = ngay du lieu) ──
  const ymStr = newest.id.slice(0, 7)
  const selDate = selDay && selDay.startsWith(ymStr) ? selDay : newest.id
  const selStack = stacks[selDate] || null
  const selDM = `${selDate.split('-')[2]}/${selDate.split('-')[1]}`

  // ── Countdown theo thang cua snapshot, tinh voi ngay hom nay that ──
  const now = new Date()
  const curY = now.getFullYear(); const curM = now.getMonth() + 1
  const isCurMonth = curY === year && curM === month
  const isPastMonth = year < curY || (year === curY && month < curM)
  const elapsedDays = isCurMonth ? now.getDate() : isPastMonth ? daysInMonth : 0
  const daysLeft = isCurMonth ? daysInMonth - now.getDate() : isPastMonth ? 0 : daysInMonth
  const daysYearEnd = daysUntil('2026-12-31')
  const daysTet = daysUntil('2027-02-06')

  const remaining = target !== null ? target - fypTotal : null
  const needPerDay = target !== null && daysLeft > 0 && remaining > 0 ? remaining / daysLeft : null
  const pct = target !== null && target > 0 ? Math.min(100, Math.max(0, (fypTotal / target) * 100)) : null
  const projection = elapsedDays > 0 ? (fypTotal / elapsedDays) * daysInMonth : null

  const quote = QUOTES[(quoteIndexForDate(now) + quoteOffset) % QUOTES.length]

  // ── Ca nhan hoa: so cua rieng TVV dang dang nhap (theo ma TVV trong profile) ──
  const myMsdl = String(profile?.msdl || '').trim()
  const myKey = myMsdl.toUpperCase()
  const myAgent = myMsdl
    ? (view.agentsObj[myMsdl] || Object.values(view.agentsObj).find((a) => String(a.msdl || '').toUpperCase() === myKey) || null)
    : null
  const myCases = myMsdl
    ? buildCases(newest, {}).filter((c) => String(c.msdl || '').toUpperCase() === myKey)
    : []
  const myRankIdx = myMsdl ? analysis.agents.findIndex((a) => String(a.msdl || '').toUpperCase() === myKey) : -1
  const myAnAgent = myRankIdx >= 0 ? analysis.agents[myRankIdx] : null
  const myCounts = {
    nop: myCases.length,
    ph: myCases.filter((c) => c.effectiveStatus === 'IF').length,
    pend: myCases.filter((c) => c.effectiveStatus === 'PS').length,
  }

  const nopTr = t.subIp + t.pipeApe
  const stackTotal = t.netIp + t.pendIp + t.pipeApe
  const segPct = (v) => (stackTotal > 0 ? Math.max(0, (v / stackTotal) * 100) : 0)

  return (
    <div>
      {/* ── HERO: countdown + quote ── */}
      <div className="hero">
        <div className="hero-inner">
          <div className="cd-row">
            <div className="cd-main">
              <div className="cd-label">Còn</div>
              <div className="cd-big">{daysLeft}</div>
              <div className="cd-label">ngày nữa hết tháng {month}/{year}</div>
              {target !== null && remaining > 0 && needPerDay !== null && (
                <div className="cd-need">Cần {fmtTr(needPerDay)} tr/ngày để kịp mục tiêu</div>
              )}
              {target !== null && remaining <= 0 && (
                <div className="cd-need" style={{ color: 'var(--green)' }}>🎉 Đã đạt mục tiêu tháng!</div>
              )}
            </div>
            <div className="cd-side">
              <div>
                <div className="cd-small-num">{Math.max(0, daysYearEnd)}</div>
                <div className="cd-small-label">ngày nữa hết năm 2026</div>
              </div>
              <div>
                <div className="cd-small-num">{Math.max(0, daysTet)}</div>
                <div className="cd-small-label">ngày nữa đến Tết Đinh Mùi 2027</div>
              </div>
            </div>
          </div>
          <hr className="divider" />
          <div className="quote" onClick={() => setQuoteOffset((o) => o + 1)} title="Bấm để đổi câu khác">
            “{quote.text}”{quote.author ? <span className="author"> — {quote.author}</span> : null}
            <div className="quote-hint">Câu hay mỗi ngày · bấm vào để đổi câu khác</div>
          </div>
        </div>
      </div>

      {/* ── Cua toi (ca nhan hoa theo ma TVV) — Admin chinh khong can khoi nay ── */}
      {!isSuperAdmin(user) && (!user ? (
        <div className="card my-card">
          <h2>🙋 Của tôi</h2>
          <div className="my-line">Đăng nhập để xem số của riêng bạn trên mọi thiết bị — FYP, số hồ sơ và hạng phát hành của chính mình, khỏi phải lục cả danh sách Quận 7.</div>
          <button className="btn-ghost" style={{ marginTop: 10 }} onClick={onOpenLogin}>🔐 Đăng nhập</button>
        </div>
      ) : !myMsdl ? (
        <div className="card my-card">
          <h2>🙋 Của tôi</h2>
          <div className="my-line">Bạn đã đăng nhập nhưng chưa gắn <b>Mã TVV</b> — gắn mã để màn hình này hiện số của riêng bạn.</div>
          <div style={{ marginTop: 10 }}>
            <span className="chip" onClick={onOpenAccount}>Thêm Mã TVV của tôi →</span>
          </div>
        </div>
      ) : (
        <div className="card my-card">
          <h2>🙋 Của tôi — {profile?.avatarUrl ? <img className="my-avatar" src={profile.avatarUrl} alt="" /> : null}{myAgent?.agName || myAnAgent?.name || profile?.displayName || 'TVV'} {myAgent?.unit || myAnAgent?.unit ? <span className="muted">· {myAgent?.unit || myAnAgent?.unit}</span> : null} {(myAgent?.agSeg || myAnAgent?.agSeg) ? <span className="muted">· Phân loại: {myAgent?.agSeg || myAnAgent?.agSeg}</span> : null}</h2>
          {!myAgent && myCases.length === 0 ? (
            <div className="my-line">Chưa thấy mã <b>{myMsdl}</b> trong dữ liệu tháng {month}/{year}. Kiểm tra lại Mã TVV ở mục Tài khoản (mã phải khớp mã số đại lý trong file Daily Sales).</div>
          ) : (
            <>
              <div className="mini-stats" style={{ marginBottom: 4 }}>
                <div className="mini-stat"><div className="ms-num">{fmtTr(myAgent?.fyp)} tr</div><div className="ms-label">FYP tháng của tôi</div></div>
                <div className="mini-stat"><div className="ms-num">{fmtTr(myAgent?.fyc)} tr</div><div className="ms-label">FYC tháng của tôi</div></div>
                <div className="mini-stat"><div className="ms-num">{myRankIdx >= 0 ? `${myRankIdx + 1}/${analysis.agents.length}` : '—'}</div><div className="ms-label">Hạng phát hành</div></div>
              </div>
              <div className="my-line">
                Hồ sơ tháng này của tôi: nộp <b>{fmtInt(myCounts.nop)}</b> · phát hành <b>{fmtInt(myCounts.ph)}</b> · pending <b>{fmtInt(myCounts.pend)}</b>
                {myRankIdx >= 0 ? <> · hạng được tính theo IP phát hành ròng toàn Quận 7</> : null}
              </div>
            </>
          )}
        </div>
      ))}

      {/* ── Tien do FYP ── */}
      <div className="card">
        <h2>🎯 Tiến độ FYP tháng {month}/{year}</h2>
        <div><span className="big-num">{fmtTr(fypTotal)}</span> <span className="muted">triệu đồng</span></div>
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
        {projection !== null && (
          <div className="muted" style={{ marginTop: 6 }}>
            Chiếu theo nhịp hiện tại: cuối tháng ~{fmtTr(projection)} tr <span>(phép chiếu đơn giản theo {elapsedDays} ngày đã qua, không phải dự báo chắc chắn)</span>
          </div>
        )}
        <div className="muted" style={{ marginTop: 4 }}>{view.tvvActive}/{view.tvvTotal} TVV có số trong tháng</div>
      </div>

      {/* ── 4 KPI ── */}
      <div className="kpi-grid">
        <div className="kpi blue"><span className="k-ic">📥</span><div className="k-body"><div className="k-label">Nộp</div><div className="k-val">{fmtTr(nopTr)} tr</div><div className="k-sub">{fmtInt(t.nopN)} hồ sơ</div></div></div>
        <div className="kpi green"><span className="k-ic">✅</span><div className="k-body"><div className="k-label">Phát hành</div><div className="k-val">{fmtTr(t.netIp)} tr</div><div className="k-sub">{fmtInt(t.netN)} hợp đồng</div></div></div>
        <div className="kpi violet"><span className="k-ic">⏳</span><div className="k-body"><div className="k-label">Pending</div><div className="k-val">{fmtTr(t.pendIp)} tr</div><div className="k-sub">{fmtInt(t.pendN)} hồ sơ</div></div></div>
        <div className="kpi pink"><span className="k-ic">💸</span><div className="k-body"><div className="k-label">Chưa lên phí</div><div className="k-val">{fmtTr(t.pipeApe)} tr</div><div className="k-sub">{fmtInt(t.pipeN)} hồ sơ</div></div></div>
      </div>

      {/* ── Thanh xep chong ── */}
      <div className="card">
        <h2>🧱 Cơ cấu hồ sơ đã nộp</h2>
        <div className="stack-bar">
          <div className="seg-issued" style={{ width: `${segPct(t.netIp)}%` }} />
          <div className="seg-pending" style={{ width: `${segPct(t.pendIp)}%` }} />
          <div className="seg-pipe" style={{ width: `${segPct(t.pipeApe)}%` }} />
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: '#7c3aed' }} />Đã phát hành {fmtTr(t.netIp)} tr</span>
          <span><span className="dot" style={{ background: '#ec4899' }} />Pending {fmtTr(t.pendIp)} tr</span>
          <span><span className="dot" style={{ background: '#06b6d4' }} />Chưa lên phí {fmtTr(t.pipeApe)} tr</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 14 }}>
          Tỷ lệ phát hành: <b>{t.rate !== null && t.rate !== undefined ? `${Math.round(t.rate * 100)}%` : '—'}</b>
          <span className="muted"> (phát hành ròng / IP đã nộp lên phí)</span>
        </div>
      </div>

      {/* ── Top 5 TVV ── */}
      <div className="card">
        <h2>🏆 Bảng Vàng — Top 5 TVV phát hành</h2>
        {!top.length && <div className="muted">Chưa có TVV nào phát hành trong tháng này.</div>}
        {top.map((a, i) => (
          <div className="top-row" key={`${a.name}-${i}`}>
            {i < 3 ? <span className="medal">{MEDALS[i]}</span> : <span className="rank">{i + 1}</span>}
            <div className="who"><div className="nm">{a.name || '—'}</div><div className="un">{a.unit || ''}</div></div>
            <div className="ip">{fmtTr(a.ip)} tr</div>
          </div>
        ))}
      </div>

      {/* ── Canh bao ── */}
      {pendingOld.length > 0 && (
        <div className="warn-box">
          <div className="w-title">⚠️ Cần chú ý</div>
          Có <b>{pendingOld.length} hồ sơ pending quá 7 ngày</b> (lâu nhất {Math.max(...pendingOld.map((c) => c.ageDays || 0))} ngày) — xem chi tiết ở đợt Sales Report tiếp theo.
        </div>
      )}

      {/* ── Bieu do nhip nop theo ngay (cot xep chong, thay heatmap) ── */}
      <div className="card">
        <h2>🌊 Nhịp nộp theo ngày — tháng {month}/{year}</h2>
        <div className="chart-sub">Giá trị hồ sơ theo ngày nộp, tô theo trạng thái hiện tại — Phát hành tính IP ròng, Pending/Chưa lên phí tính APE (chưa có APE thì tính IP Sub). Bấm vào một cột để xem số của ngày đó.</div>
        <div className="legend chart-legend">
          <span><span className="dot" style={{ background: '#7c3aed' }} />Đã phát hành</span>
          <span><span className="dot" style={{ background: '#ec4899' }} />Pending</span>
          <span><span className="dot" style={{ background: '#06b6d4' }} />Chưa lên phí</span>
        </div>
        <DailyStackChart days={stacks} yyyyMm={ymStr} daysInMonth={daysInMonth} selected={selDate} onSelect={setSelDay} />
        <div className="chart-detail">
          {selStack && selStack.total > 0 ? (
            <>📅 Ngày <b>{selDM}</b>: Phát hành <b>{fmtTr(selStack.issued)} tr</b> · Pending <b>{fmtTr(selStack.pending)} tr</b> · Chưa lên phí <b>{fmtTr(selStack.pipeline)} tr</b> · Tổng <b>{fmtTr(selStack.total)} tr</b></>
          ) : (
            <>📅 Ngày <b>{selDM}</b>: chưa có hồ sơ nộp trong dữ liệu hiện tại.</>
          )}
        </div>
      </div>

      {/* ── Hanh trinh nam: cot FYP + duong so TVV Active theo thang ── */}
      <div className="card">
        <h2>🗓️ Hành trình {year} — Prudential Quận 7</h2>
        <div className="chart-sub">Cột: FYP (tr) · Đường: số TVV Active{year === 2026 ? <> · <span>T1–T10: số liệu GA · Từ T11: theo Daily Sales</span></> : null} · bấm vào một cột để xem chi tiết tháng.</div>
        <div className="legend chart-legend">
          <span><span className="dot" style={{ background: '#7c3aed' }} />FYP (triệu)</span>
          <span><span className="dash" />Số TVV Active</span>
        </div>
        <YearJourneyChart journey={journey} currentMonth={month} />
      </div>
    </div>
  )
}
