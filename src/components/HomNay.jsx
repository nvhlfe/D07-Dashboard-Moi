// ─────────────────────────────────────────────────────────────
// HomNay — Man hinh "Hom Nay" (MVP): hero countdown + quote, tien do FYP,
// 4 KPI, Top 5 TVV, thanh xep chong, bieu do nhip nop theo ngay
// (cot xep chong SVG, thay heatmap APE cu — mau D03) + hanh trinh nam, canh bao.
// Nguon so: snapshot Daily moi nhat (Firestore neu co, khong thi localStorage).
// Y 8 (13/11/2026): them BO CHON THANG xem lai so lieu — phan so lieu
// (tien do FYP / 4 KPI / Top 5 / Nhip nop / Cua toi) theo thang chon,
// tai lazy qua onNeedMonth; HERO countdown + canh bao pending qua 7
// ngay + anh ban tin van theo "hom nay" (thoi gian thuc / snapshot
// moi nhat toan cuc).
// 4 KPI + Top 5 dung homeKpi (CHUAN B, Lan chot 10/11/2026: dem theo DONG
// nhu file goc). analyzeSoSanLuong CHI con dung cho danh sach nhac viec
// "pending qua 7 ngay" va hang phat hanh trong khoi "Cua toi" — KHONG
// dung cho so KPI nua.
// ─────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from 'react'
import { analyzeSoSanLuong } from '../lib/analyze'
import { homeKpi, topIssuedByRow } from '../lib/homeKpi'
import { buildCases } from '../lib/cases'
import { dailyStacks, buildYearJourney } from '../lib/journey'
import { dailyCardData } from '../lib/shareCard'
import { DailyStackChart, YearJourneyChart } from './Charts'
import { DailyShareCard, SharePreviewModal, captureShareCard } from './ShareCard'
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

export default function HomNay({ snaps, loading, remoteSettled = true, onGoNap, onNeedMonth, user, profile, onOpenLogin }) {
  const [quoteOffset, setQuoteOffset] = useState(0)
  const [selDay, setSelDay] = useState(null)
  // Anh ban tin ngay (ShareCard): trang thai tao anh + anh da chup (modal)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareImg, setShareImg] = useState('')
  const [shareErr, setShareErr] = useState('')
  const dailyCardRef = useRef(null)

  const newest = snaps && snaps.length ? snaps[snaps.length - 1] : null

  // ── CHON THANG XEM LAI (Y 8 — Lan duyet 13/11/2026) ──
  // Cung mau chon thang cua Sales Report: mac dinh = thang cua
  // snapshot moi nhat (hanh vi cu khong doi); chon thang khac thi
  // toan bo PHAN SO LIEU (tien do FYP, 4 KPI, Top 5, Nhip nop, khoi
  // "Cua toi") doi theo snapshot moi nhat cua thang do, tai LAZY qua
  // onNeedMonth (ensureMonth cua App) neu thang chua co trong snaps.
  // HERO countdown + khoi canh bao pending qua 7 ngay la phan "hom
  // nay" — LUON theo thoi gian thuc / snapshot moi nhat toan cuc,
  // khong doi theo thang dang xem (phan dinh o cac khoi ben duoi).
  const [selectedMonth, setSelectedMonth] = useState('')
  const [lazyMonth, setLazyMonth] = useState(null)
  const months = useMemo(
    () => [...new Set((snaps || []).map((s) => s.id.slice(0, 7)))].sort(),
    [snaps],
  )
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
  const viewSnap = useMemo(() => {
    if (!effMonth) return null
    const list = (snaps || []).filter((s) => s.id.startsWith(`${effMonth}-`))
    return list.length ? list[list.length - 1] : null
  }, [snaps, effMonth])
  const isLatestMonth = !!newest && !!effMonth && newest.id.slice(0, 7) === effMonth

  const handleSelectMonth = (ym) => {
    setSelectedMonth(ym)
    setSelDay(null)
    if (!onNeedMonth || months.includes(ym)) { setLazyMonth(null); return }
    setLazyMonth({ ym, phase: 'loading' })
    Promise.resolve(onNeedMonth(ym)).then((ok) => {
      setLazyMonth((cur) => (cur && cur.ym === ym ? (ok ? null : { ym, phase: 'empty' }) : cur))
    }).catch(() => {
      setLazyMonth((cur) => (cur && cur.ym === ym ? { ym, phase: 'empty' } : cur))
    })
  }

  const view = useMemo(() => {
    if (!viewSnap) return null
    const newest = viewSnap
    const [year, month] = newest.id.split('-').map(Number)
    const ymPrefix = newest.id.slice(0, 7)
    const pm = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
    const p = (n) => String(n).padStart(2, '0')
    const prevMonthDocs = snaps.filter((s) => s.id.startsWith(`${pm.y}-${p(pm.m)}-`))
    // analyze CHI de lay hang trong khoi "Cua toi" (theo thang dang
    // xem); 4 KPI Trang Chu lay tu homeKpi (chuan B). Danh sach
    // pending qua 7 ngay (nhac viec "hom nay") tinh rieng tu snapshot
    // moi nhat TOAN CUC o todayPendingOld ben duoi.
    const analysis = analyzeSoSanLuong([newest], prevMonthDocs, { year, month })
    const kpi = homeKpi(newest.data)
    const agentsObj = newest.data?.agents || {}
    const agentsList = Object.values(agentsObj)
    const fypTotal = agentsList.reduce((s, a) => s + (Number(a.fyp) || 0), 0)
    // Ty le phat hanh chuan B = IP Net phat hanh / IP Sub da nop len phi (IF+PS)
    const subIpRows = (newest.data?.proposalRows || [])
      .filter((r) => r.statusGroup === 'IF' || r.statusGroup === 'PS')
      .reduce((s, r) => s + (Number(r.ipSub) || 0), 0)
    const issRate = subIpRows > 0 ? kpi.phatHanh.ip / subIpRows : null
    // Top 5 theo PHAT HANH chuan B (tong IP Net cac dong IF theo TVV, dem
    // theo dong); neu chua co thi fallback theo IP Net cua Agent
    let top = topIssuedByRow(newest.data, 5).map((a) => ({ name: a.name, unit: a.unit, ip: a.ip }))
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
    const tvvActive = agentsList.filter((a) => (Number(a.fyp) || 0) > 0 || (a.cIF || 0) + (a.cPS || 0) + (a.cOther || 0) > 0).length
    return {
      year, month, daysInMonth, analysis, kpi, issRate,
      fypTotal, top, stacks, journey, tvvActive, tvvTotal: agentsList.length,
      agentsObj,
      snapDay: Number(newest.id.split('-')[2]),
    }
  }, [snaps, viewSnap])

  // ── Canh bao "pending qua 7 ngay" la nhac viec HOM NAY: LUON tinh
  // tu snapshot moi nhat TOAN CUC, khong doi theo thang dang xem. ──
  const todayPendingOld = useMemo(() => {
    if (!newest) return []
    const [ty, tm] = newest.id.split('-').map(Number)
    const tpm = tm === 1 ? { y: ty - 1, m: 12 } : { y: ty, m: tm - 1 }
    const p = (x) => String(x).padStart(2, '0')
    const prevDocs = (snaps || []).filter((s) => s.id.startsWith(`${tpm.y}-${p(tpm.m)}-`))
    const an = analyzeSoSanLuong([newest], prevDocs, { year: ty, month: tm })
    return (an.pendingAll || []).filter((c) => (c.ageDays ?? 0) > 7)
  }, [snaps, newest])

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }
  if (!newest) {
    // Chua co du lieu TREN MAY nay va luot tai may dau tien chua xong:
    // hien "dang tai" thay vi man rong 📭 (truoc day nguoi dung tuong
    // he thong trong du lieu trong luc cho tai o lan mo dau/domain moi).
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
        <p style={{ marginBottom: 14 }}>Hãy nạp file Daily Sales đầu tiên ở tab Nạp — số liệu tháng sẽ hiện ngay tại đây.</p>
        <button className="btn-primary" onClick={onGoNap}>📥 Đến tab Nạp dữ liệu</button>
      </div>
    )
  }

  // ── HERO: countdown LUON theo THOI GIAN THUC (thang hien tai that),
  // khong doi theo thang dang xem so lieu. Dong luu y muc tieu trong
  // hero (chi Admin chinh thay — gate giu nguyen) tinh tu snapshot +
  // muc tieu cua THANG HIEN TAI THAT; chua co du lieu thang hien tai
  // thi an dong luu y, countdown van chay. ──
  const nowRt = new Date()
  const curY = nowRt.getFullYear(); const curM = nowRt.getMonth() + 1
  const heroDaysInMonth = new Date(curY, curM, 0).getDate()
  const heroDaysLeft = heroDaysInMonth - nowRt.getDate()
  const daysYearEnd = daysUntil('2026-12-31')
  const daysTet = daysUntil('2027-02-06')
  const quote = QUOTES[(quoteIndexForDate(nowRt) + quoteOffset) % QUOTES.length]
  const curMonthSnap = (() => {
    const prefix = `${curY}-${String(curM).padStart(2, '0')}-`
    const list = (snaps || []).filter((s) => s.id.startsWith(prefix))
    return list.length ? list[list.length - 1] : null
  })()
  const heroTarget = curMonthSnap ? getTarget(curY, curM) : null
  const heroFyp = curMonthSnap
    ? Object.values(curMonthSnap.data?.agents || {}).reduce((s, a) => s + (Number(a.fyp) || 0), 0)
    : 0
  const heroRemaining = heroTarget !== null ? heroTarget - heroFyp : null
  const heroNeedPerDay = heroTarget !== null && heroDaysLeft > 0 && heroRemaining > 0
    ? heroRemaining / heroDaysLeft : null

  const heroBlock = (
    <div className="hero">
      <div className="hero-inner">
        <div className="cd-row">
          <div className="cd-main">
            <div className="cd-label">Còn</div>
            <div className="cd-big">{heroDaysLeft}</div>
            <div className="cd-label">ngày nữa hết tháng {curM}/{curY}</div>
            {isSuperAdmin(user) && heroTarget !== null && heroRemaining > 0 && heroNeedPerDay !== null && (
              <div className="cd-need">Cần {fmtTr(heroNeedPerDay)} tr/ngày để kịp mục tiêu</div>
            )}
            {isSuperAdmin(user) && heroTarget !== null && heroRemaining <= 0 && (
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
        </div>
      </div>
    </div>
  )

  // ── Bo chon thang (dau PHAN SO LIEU, ngay duoi hero) — cung mau
  // <select> cua Sales Report; chi hien khi co hon 1 thang chon duoc.
  const monthLabel = (ym) => (ym ? `Tháng ${ym.split('-')[1]}/${ym.split('-')[0]}` : '')
  const monthPicker = pickerMonths.length > 1 ? (
    <div className="card" style={{ paddingTop: 12, paddingBottom: 12 }}>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>📅 Tháng xem số liệu</label>
        <select value={effMonth || ''} onChange={(e) => handleSelectMonth(e.target.value)}>
          {pickerMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}{months.includes(m) ? '' : ' (tải khi chọn)'}</option>)}
        </select>
      </div>
      {!isLatestMonth && (
        <div className="muted" style={{ marginTop: 6 }}>
          Đang xem lại {monthLabel(effMonth)} — số liệu bên dưới là của tháng này; hero đếm ngược phía trên vẫn là tháng hiện tại.
        </div>
      )}
    </div>
  ) : null

  // Thang dang chon CHUA CO snapshot (dang tai lazy / chua co du lieu):
  // giu hero + bo chon thang, phan so lieu thay bang trang thai than
  // thien — KHONG hien so 0 gay hieu nham (cung mau Sales Report).
  if (!view) {
    return (
      <div>
        {heroBlock}
        {monthPicker}
        {lazyMonth && lazyMonth.ym === effMonth && lazyMonth.phase === 'loading' ? (
          <div className="card empty">
            <div className="e-ic">⏳</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Đang tải dữ liệu {monthLabel(effMonth)}…</div>
            <p>Hệ thống chỉ tải đúng tháng bạn chọn — chờ một lát nhé.</p>
          </div>
        ) : (
          <div className="card empty">
            <div className="e-ic">📭</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{monthLabel(effMonth)} chưa có dữ liệu</div>
            <p>Chưa có bản Daily Sales nào của tháng này trên hệ thống. Chọn tháng khác ở ô phía trên, hoặc nạp file Daily Sales của tháng này ở tab Nạp.</p>
          </div>
        )}
      </div>
    )
  }

  const { year, month, daysInMonth, analysis, kpi, issRate, fypTotal, top, stacks, journey } = view
  const pendingOld = todayPendingOld
  const target = getTarget(year, month)

  // ── Anh ban tin ngay: LUON lay snapshot MOI NHAT TOAN CUC + muc
  // tieu cua thang moi nhat (ban tin "ngay" la cua hien tai, khong
  // doi theo thang dang xem lai) — nut chi hien khi dang xem thang
  // moi nhat de so tren anh khop so dang nhin. ──
  const newestTarget = getTarget(Number(newest.id.slice(0, 4)), Number(newest.id.slice(5, 7)))
  const cardData = dailyCardData(newest, newestTarget)
  const handleShareDaily = async () => {
    if (shareBusy) return
    setShareErr('')
    setShareBusy(true)
    try {
      const url = await captureShareCard(dailyCardRef.current)
      setShareImg(url)
    } catch (e) {
      setShareErr('Chưa tạo được ảnh lúc này — bạn thử lại sau ít phút nhé.')
    } finally {
      setShareBusy(false)
    }
  }

  // ── Ngay dang chon tren bieu do nhip nop (mac dinh = ngay du lieu
  // cua thang dang xem) ──
  const ymStr = viewSnap.id.slice(0, 7)
  const selDate = selDay && selDay.startsWith(ymStr) ? selDay : viewSnap.id
  const selStack = stacks[selDate] || null
  const selDM = `${selDate.split('-')[2]}/${selDate.split('-')[1]}`

  // ── Phep chieu o the Tien do FYP: tinh theo thang DANG XEM doi
  // chieu ngay hom nay that (thang cu -> chieu ca thang; thang hien
  // tai -> theo so ngay da qua). Hero countdown dung bo so rieng
  // theo thoi gian thuc o tren, khong dung chung cac bien nay. ──
  const isCurMonth = curY === year && curM === month
  const isPastMonth = year < curY || (year === curY && month < curM)
  const elapsedDays = isCurMonth ? nowRt.getDate() : isPastMonth ? daysInMonth : 0

  const remaining = target !== null ? target - fypTotal : null
  const pct = target !== null && target > 0 ? Math.min(100, Math.max(0, (fypTotal / target) * 100)) : null
  const projection = elapsedDays > 0 ? (fypTotal / elapsedDays) * daysInMonth : null

  // ── Ca nhan hoa: so cua rieng TVV dang dang nhap (theo ma TVV trong profile) ──
  const myMsdl = String(profile?.msdl || '').trim()
  const myKey = myMsdl.toUpperCase()
  const myAgent = myMsdl
    ? (view.agentsObj[myMsdl] || Object.values(view.agentsObj).find((a) => String(a.msdl || '').toUpperCase() === myKey) || null)
    : null
  const myCases = myMsdl
    ? buildCases(viewSnap, {}).filter((c) => String(c.msdl || '').toUpperCase() === myKey)
    : []
  const myRankIdx = myMsdl ? analysis.agents.findIndex((a) => String(a.msdl || '').toUpperCase() === myKey) : -1
  const myAnAgent = myRankIdx >= 0 ? analysis.agents[myRankIdx] : null
  const myCounts = {
    nop: myCases.length,
    ph: myCases.filter((c) => c.effectiveStatus === 'IF').length,
    pend: myCases.filter((c) => c.effectiveStatus === 'PS').length,
  }

  // Thanh co cau dung CUNG so chuan B voi 4 o KPI (phat hanh IP Net +
  // pending APE + chua len phi APE) de ca man hinh chi co MOT bo so.
  const stackTotal = kpi.phatHanh.ip + kpi.pending.ape + kpi.chuaLenPhi.ape
  const segPct = (v) => (stackTotal > 0 ? Math.max(0, (v / stackTotal) * 100) : 0)

  return (
    <div>
      {/* ── HERO: countdown + quote (LUON theo thoi gian thuc) ── */}
      {heroBlock}

      {/* ── Bo chon thang xem lai so lieu (Y 8) ── */}
      {monthPicker}

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
          <div className="my-line">Bạn đã đăng nhập nhưng chưa gắn <b>Mã TVV</b> — gắn mã để màn hình này hiện số của riêng bạn. TVV hãy đăng nhập bằng chính MSĐL của mình để hệ thống tự gắn mã.</div>
        </div>
      ) : (
        <div className="card my-card">
          <h2>🙋 Của tôi — {profile?.avatarUrl ? <img className="my-avatar" src={profile.avatarUrl} alt="" /> : null}{myAgent?.agName || myAnAgent?.name || profile?.displayName || 'TVV'} {myAgent?.unit || myAnAgent?.unit ? <span className="muted">· {myAgent?.unit || myAnAgent?.unit}</span> : null} {(myAgent?.agSeg || myAnAgent?.agSeg) ? <span className="muted">· Phân loại: {myAgent?.agSeg || myAnAgent?.agSeg}</span> : null}</h2>
          {!myAgent && myCases.length === 0 ? (
            <div className="my-line">Chưa thấy mã <b>{myMsdl}</b> trong dữ liệu tháng {month}/{year}. Kiểm tra lại Mã TVV (mã phải khớp mã số đại lý trong file Daily Sales).</div>
          ) : (
            <>
              <div className="mini-stats" style={{ marginBottom: 4 }}>
                <div className="mini-stat"><div className="ms-num num-fyc">{fmtTr(myAgent?.fyc)} tr</div><div className="ms-label">FYC tháng của tôi</div></div>
                <div className="mini-stat"><div className="ms-num">{myRankIdx >= 0 ? `${myRankIdx + 1}/${analysis.agents.length}` : '—'}</div><div className="ms-label">Hạng phát hành</div></div>
              </div>
              <div className="my-line">
                Hồ sơ tháng này của tôi: nộp <b>{fmtInt(myCounts.nop)}</b> · phát hành <b className="num-issued">{fmtInt(myCounts.ph)}</b> · pending <b className="num-pending">{fmtInt(myCounts.pend)}</b>
                {myRankIdx >= 0 ? <> · hạng được tính theo IP phát hành ròng toàn Quận 7</> : null}
              </div>
            </>
          )}
        </div>
      ))}

      {/* ── Tien do FYP. Phan LUU Y ve muc tieu thang Admin nap (dong
          cd-need o hero + hau to "muc tieu ... tr · con thieu ..." o
          dong % + chip "Chua dat muc tieu thang") chi Admin chinh
          thay — Lan yeu cau 10/11/2026; khach/TVV/truong phong chi
          thay so FYP + thanh tien do + % dat. ── */}
      <div className="card">
        <h2>🎯 Tiến độ FYP tháng {month}/{year}</h2>
        <div><span className="big-num">{fmtTr(fypTotal)}</span> <span className="muted">triệu đồng</span></div>
        {target !== null ? (
          <>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            <div style={{ fontSize: 13.5 }}>
              Đạt <b>{(Math.round(pct * 10) / 10).toLocaleString('vi-VN')}%</b>
              {isSuperAdmin(user) ? (
                <> mục tiêu {fmtTr(target)} tr
                  {remaining > 0 ? <> · còn thiếu <b>{fmtTr(remaining)} tr</b></> : <> · đã vượt <b>{fmtTr(-remaining)} tr</b> 🎉</>}
                </>
              ) : null}
            </div>
          </>
        ) : isSuperAdmin(user) ? (
          <div style={{ marginTop: 8 }}>
            <span className="chip" onClick={onGoNap}>Chưa đặt mục tiêu tháng — đặt ở tab Nạp</span>
          </div>
        ) : null}
        {projection !== null && (
          <div className="muted" style={{ marginTop: 6 }}>
            Chiếu theo nhịp hiện tại: cuối tháng ~{fmtTr(projection)} tr <span>(phép chiếu đơn giản theo {elapsedDays} ngày đã qua, không phải dự báo chắc chắn)</span>
          </div>
        )}
        <div className="muted" style={{ marginTop: 4 }}>{view.tvvActive}/{view.tvvTotal} TVV có số trong tháng</div>

        {/* ── Tao anh ban tin ngay de gui Zalo (ShareCard): anh LUON
            la cua thang moi nhat nen nut chi hien khi dang xem thang
            moi nhat (dang xem thang cu thi an — tranh anh lech so). ── */}
        {isLatestMonth && (
          <div className="share-btn-row">
            <button type="button" className="btn-ghost" disabled={shareBusy} onClick={handleShareDaily}>
              {shareBusy ? 'Đang tạo ảnh…' : '📸 Tạo ảnh bản tin'}
            </button>
            {shareErr ? <div className="msg error" style={{ marginTop: 8 }}>{shareErr}</div> : null}
          </div>
        )}
      </div>

      {/* ── 4 KPI (CHUAN B — dem theo dong nhu file goc; moi o ghi ro
          so chinh tinh theo IP hay APE) ── */}
      <div className="kpi-grid">
        <div className="kpi blue"><span className="k-ic">📥</span><div className="k-body"><div className="k-label">Nộp</div><div className="k-val">{fmtTr(kpi.nop.ip)} tr</div><div className="k-sub">theo IP · {fmtInt(kpi.nop.n)} hồ sơ</div></div></div>
        <div className="kpi green"><span className="k-ic">✅</span><div className="k-body"><div className="k-label">Phát hành</div><div className="k-val num-issued">{fmtTr(kpi.phatHanh.ip)} tr</div><div className="k-sub">theo IP Net · {fmtInt(kpi.phatHanh.n)} hợp đồng</div></div></div>
        <div className="kpi violet"><span className="k-ic">⏳</span><div className="k-body"><div className="k-label">Pending</div><div className="k-val num-pending">{fmtTr(kpi.pending.ape)} tr</div><div className="k-sub">theo APE · {fmtInt(kpi.pending.n)} hồ sơ</div></div></div>
        <div className="kpi pink"><span className="k-ic">💸</span><div className="k-body"><div className="k-label">Chưa lên phí</div><div className="k-val num-pipe">{fmtTr(kpi.chuaLenPhi.ape)} tr</div><div className="k-sub">theo APE · {fmtInt(kpi.chuaLenPhi.n)} hồ sơ</div></div></div>
      </div>

      {/* ── Thanh xep chong ── */}
      <div className="card">
        <h2>🧱 Cơ cấu hồ sơ đã nộp</h2>
        <div className="stack-bar">
          <div className="seg-issued" style={{ width: `${segPct(kpi.phatHanh.ip)}%` }} />
          <div className="seg-pending" style={{ width: `${segPct(kpi.pending.ape)}%` }} />
          <div className="seg-pipe" style={{ width: `${segPct(kpi.chuaLenPhi.ape)}%` }} />
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: '#7c3aed' }} />Đã phát hành {fmtTr(kpi.phatHanh.ip)} tr</span>
          <span><span className="dot" style={{ background: '#ec4899' }} />Pending {fmtTr(kpi.pending.ape)} tr</span>
          <span><span className="dot" style={{ background: '#06b6d4' }} />Chưa lên phí {fmtTr(kpi.chuaLenPhi.ape)} tr</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 14 }}>
          Tỷ lệ phát hành: <b>{issRate !== null && issRate !== undefined ? `${Math.round(issRate * 100)}%` : '—'}</b>
          <span className="muted"> (phát hành theo IP Net / IP đã nộp lên phí)</span>
        </div>
      </div>

      {/* ── Top 5 TVV + Nhịp nộp: boc chung .home-2col de desktop
          >=1024px xep 2 cot canh nhau bang CSS; o phone/tablet wrapper
          la div khoi thuong nen giao dien giu nguyen 100%. ── */}
      <div className="home-2col">
      {/* ── Top 5 TVV ── */}
      <div className="card">
        <h2>🏆 Bảng Vàng — Top 5 TVV phát hành</h2>
        {!top.length && <div className="muted">Chưa có TVV nào phát hành trong tháng này.</div>}
        {top.map((a, i) => (
          <div className="top-row" key={`${a.name}-${i}`}>
            {i < 3 ? <span className="medal">{MEDALS[i]}</span> : <span className="rank">{i + 1}</span>}
            <div className="who"><div className="nm">{a.name || '—'}</div><div className="un">{a.unit || ''}</div></div>
            <div className="ip num-issued">{fmtTr(a.ip)} tr</div>
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
      </div>

      {/* ── Hanh trinh nam: cot FYP + duong so TVV Active theo thang ── */}
      <div className="card">
        <h2>🗓️ Hành trình {year} — Prudential Quận 7</h2>
        <div className="chart-sub">Cột: FYP (tr) · Đường cam + số dưới tháng: TVV Active{year === 2026 ? <> · <span>T1–T10: số liệu GA · Từ T11: theo Daily Sales</span></> : null} · bấm vào một cột để xem chi tiết tháng.</div>
        <div className="legend chart-legend">
          <span><span className="dot" style={{ background: '#7c3aed' }} />FYP (triệu)</span>
          <span><span style={{ display: 'inline-block', width: 18, borderTop: '3px solid #c2410c', borderRadius: 2, marginRight: 5, verticalAlign: 'middle' }} />TVV Active (đường cam)</span>
          <span><span className="act-sample">52</span>Số Active dưới tháng</span>
        </div>
        <YearJourneyChart journey={journey} currentMonth={month} />
      </div>

      {/* ── The anh ban tin render AN ngoai man hinh de html2canvas
          chup (khong hien cho nguoi dung) + modal xem truoc anh ── */}
      <div className="share-offscreen" aria-hidden="true">
        <DailyShareCard data={cardData} cardRef={dailyCardRef} />
      </div>
      <SharePreviewModal
        imgUrl={shareImg}
        fileName={`ban-tin-d07-${newest.id}.png`}
        title="📸 Ảnh bản tin ngày"
        onClose={() => setShareImg('')}
      />
    </div>
  )
}
