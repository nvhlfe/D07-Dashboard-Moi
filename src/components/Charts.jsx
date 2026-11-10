// ─────────────────────────────────────────────────────────────
// Charts.jsx — Bieu do SVG TU VE (khong dung thu vien chart ngoai:
// mang noi bo cua Lan chan nhieu CDN, nen bieu do phai tu chua 100%).
//   DailyStackChart  — cot xep chong theo ngay nop trong thang (mau D03):
//                      Phat hanh (tim) / Pending (hong) / Chua len phi (xanh
//                      duong), to theo TRANG THAI HIEN TAI cua ho so.
//   YearJourneyChart — cot FYP theo thang + duong TVV Active (thang rieng,
//                      KHONG nhan so tren diem) + so Active de DUOI thang.
// Ca hai deu nhan so tho (trieu dong) tu lib/journey.js.
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react'

// Dinh dang tien kieu Viet: 1 so thap phan, bo phan thap phan neu nguyen
// (khop fmtTr o HomNay): 1577.6 -> "1.577,6" · 264 -> "264".
const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}

const C_ISSUED = '#7c3aed'
const C_PENDING = '#ec4899'
const C_PIPELINE = '#06b6d4'
const C_GRID = '#dfe7f1'
const C_AXIS = '#a9bcd2'
const C_LABEL = '#677b94'
const C_ACT = '#c2410c'

// Moc tran "dep" cho truc Y: chon moc nho nhat >= v trong thang bac nay.
function niceMax(v) {
  if (!v || v <= 0) return 50
  const steps = [25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000]
  for (const s of steps) if (v <= s) return s
  return Math.ceil(v / 1000) * 1000
}

// Path chu nhat chi bo tron 2 goc TREN (doan tren cung cua cot xep chong /
// dau cot hanh trinh) — cac goc duoi vuong de cac doan khop nhau.
function topRoundPath(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h))
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`
}

/**
 * Cot xep chong theo ngay trong thang.
 *   days: map 'yyyy-mm-dd' -> { issued, pending, pipeline, total } (lib/journey dailyStacks)
 *   yyyyMm: 'yyyy-mm' cua thang dang xem; daysInMonth: so ngay trong thang
 *   selected: ngay dang chon 'yyyy-mm-dd'; onSelect(iso) khi bam 1 cot/ngay.
 */
export function DailyStackChart({ days, yyyyMm, daysInMonth, selected, onSelect }) {
  const W = 700
  const H = 264
  const mL = 36
  const mR = 8
  const mT = 12
  const mB = 24
  const plotW = W - mL - mR
  const plotH = H - mT - mB
  const baseY = mT + plotH

  const isoOf = (d) => `${yyyyMm}-${String(d).padStart(2, '0')}`
  let maxTotal = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const e = days ? days[isoOf(d)] : null
    if (e && e.total > maxTotal) maxTotal = e.total
  }
  const yMax = niceMax(maxTotal)
  const ticks = [0, 1, 2, 3, 4].map((i) => (yMax * i) / 4)
  const slot = plotW / daysInMonth
  const barW = Math.max(4, Math.min(16, slot * 0.6))
  const labelDays = [...new Set([1, 5, 10, 15, 20, 25, daysInMonth])].filter((d) => d <= daysInMonth)

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ nhịp nộp theo ngày">
      {/* Luoi ngang + nhan truc Y */}
      {ticks.map((t, i) => {
        const y = baseY - (t / yMax) * plotH
        return (
          <g key={i}>
            <line x1={mL} x2={W - mR} y1={y} y2={y} stroke={i === 0 ? C_AXIS : C_GRID} strokeWidth={1} />
            <text x={mL - 6} y={y + 4} textAnchor="end" fontSize={12} fill={C_LABEL}>{fmtTr(t)}</text>
          </g>
        )
      })}

      {/* Cot tung ngay */}
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
        const iso = isoOf(d)
        const e = days ? days[iso] : null
        const cx = mL + slot * (d - 0.5)
        const x = cx - barW / 2
        const isSel = iso === selected
        const segs = e
          ? [
              { v: e.issued, color: C_ISSUED },
              { v: e.pending, color: C_PENDING },
              { v: e.pipeline, color: C_PIPELINE },
            ].filter((s) => s.v > 0)
          : []
        let acc = 0
        const drawn = segs.map((s, idx) => {
          let h = (s.v / yMax) * plotH
          if (h < 1.2) h = 1.2
          const yTop = baseY - acc - h
          acc += h
          const isTop = idx === segs.length - 1
          return isTop
            ? <path key={idx} d={topRoundPath(x, yTop, barW, h, 3)} fill={s.color} />
            : <rect key={idx} x={x} y={yTop} width={barW} height={h} fill={s.color} />
        })
        return (
          <g key={d}>
            {isSel && <rect x={mL + slot * (d - 1)} y={mT} width={slot} height={plotH} fill="rgba(15,46,82,0.07)" />}
            {drawn}
            {isSel && acc > 0 && (
              <rect x={x - 1.5} y={baseY - acc - 1.5} width={barW + 3} height={acc + 1.5} fill="none" stroke="#0a1f33" strokeWidth={1.4} />
            )}
            <rect
              x={mL + slot * (d - 1)} y={mT} width={slot} height={plotH}
              fill="transparent" style={{ cursor: 'pointer' }}
              onClick={() => onSelect && onSelect(iso)}
            />
          </g>
        )
      })}

      {/* Nhan ngay (thua nhu anh mau) */}
      {labelDays.map((d) => {
        const cx = mL + slot * (d - 0.5)
        const isSel = isoOf(d) === selected
        return (
          <text
            key={d} x={cx} y={H - 6} textAnchor="middle" fontSize={12.5}
            fontWeight={isSel ? 800 : 600} fill={isSel ? '#0a1f33' : C_LABEL}
          >
            {d}
          </text>
        )
      })}
    </svg>
  )
}

/**
 * Hanh trinh nam: cot FYP theo thang + so TVV Active de DUOI nhan thang.
 *   journey: { year, months: [{ month, fyp, act, source }] } (lib/journey buildYearJourney)
 *   currentMonth: thang cua snapshot dang xem (in dam nhan thang + mac dinh
 *   chon de hien chi tiet). Bam vao cot/thang de xem chi tiet thang do.
 * Duong Active: GIU lai theo dinh chinh cua Lan (09/11/2026) — polyline
 * cam dam thang RIENG theo actMax, dut doan tai thang khong co du lieu,
 * nhung TUYET DOI khong ve nhan so tren cac diem (phan chong cheo Lan che
 * truoc do). So Active nam thanh 1 hang rieng ngay duoi nhan thang
 * T1..T12, dam, cam dam, canh giua theo cot. Thang khong co du lieu ->
 * khong ve cot/diem, o Active hien '–' mo.
 */
export function YearJourneyChart({ journey, currentMonth }) {
  const [sel, setSel] = useState(null)
  const W = 700
  const H = 308
  const mL = 10
  const mR = 10
  const mT = 30
  const mB = 50
  const plotW = W - mL - mR
  const plotH = H - mT - mB
  const baseY = mT + plotH

  const months = (journey && journey.months) || []
  const has = (m) => m.fyp !== null && m.fyp !== undefined
  const hasAct = (m) => has(m) && m.act !== null && m.act !== undefined
  const present = months.filter(has)
  if (!present.length) {
    return <div className="muted" style={{ marginTop: 4 }}>Chưa có dữ liệu tháng nào trong năm {journey ? journey.year : ''} để vẽ hành trình.</div>
  }
  const fypMax = Math.max(0, ...present.map((m) => m.fyp))
  // Thang RIENG cho duong Active (doc lap voi thang FYP cua cot)
  const actMax = Math.max(0, ...months.filter(hasAct).map((m) => m.act))
  const lineY = (act) => baseY - (actMax > 0 ? (act / actMax) * plotH : 0)
  const slot = plotW / 12
  const barW = Math.min(38, slot * 0.64)
  const cxOf = (i) => mL + slot * (i + 0.5)
  // Gom cac thang LIEN TIEP co so Active thanh tung doan duong rieng —
  // gap thang trong thi ngat doan, khong noi duong qua thang trong.
  const actSegs = []
  let actRun = []
  months.forEach((m, i) => {
    if (hasAct(m)) {
      actRun.push({ x: cxOf(i), y: lineY(m.act) })
    } else if (actRun.length) {
      actSegs.push(actRun)
      actRun = []
    }
  })
  if (actRun.length) actSegs.push(actRun)

  const selMonth = sel !== null
    ? months.find((m) => m.month === sel && has(m)) || null
    : months.find((m) => m.month === currentMonth && has(m)) || present[present.length - 1]

  return (
    <>
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ hành trình năm">
      <defs>
        <linearGradient id="yjViolet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="yjPink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>

      {/* Luoi ngang mo */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={mL} x2={W - mR} y1={baseY - plotH * f} y2={baseY - plotH * f} stroke={C_GRID} strokeWidth={1} />
      ))}
      <line x1={mL} x2={W - mR} y1={baseY} y2={baseY} stroke={C_AXIS} strokeWidth={1} />

      {/* Cot FYP tung thang */}
      {months.map((m, i) => {
        if (!has(m)) return null
        const cx = cxOf(i)
        let h = fypMax > 0 ? (m.fyp / fypMax) * plotH : 0
        if (m.fyp > 0 && h < 4) h = 4
        const isMax = fypMax > 0 && m.fyp === fypMax
        const isSel = selMonth && m.month === selMonth.month
        return (
          <g key={m.month}>
            {isSel && <rect x={mL + slot * i} y={mT - 6} width={slot} height={plotH + 6 + 48} fill="rgba(15,46,82,0.07)" />}
            {h > 0 && (
              <path d={topRoundPath(cx - barW / 2, baseY - h, barW, h, 7)} fill={isMax ? 'url(#yjPink)' : 'url(#yjViolet)'} />
            )}
            <text x={cx} y={baseY - h - 8} textAnchor="middle" fontSize={15} fontWeight={800} fill={isMax ? '#db2777' : '#4c1d95'}>
              {fmtTr(m.fyp)}
            </text>
            <rect
              x={mL + slot * i} y={mT - 6} width={slot} height={plotH + 6 + 48}
              fill="transparent" style={{ cursor: 'pointer' }}
              onClick={() => setSel(m.month)}
            />
          </g>
        )
      })}

      {/* Duong TVV Active (thang rieng actMax, dut doan o thang trong) —
          KHONG ve nhan so tren diem: so Active da nam o hang duoi thang */}
      {actSegs.map((seg, si) => (
        <polyline
          key={si}
          points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke={C_ACT} strokeWidth={2.2}
          strokeLinejoin="round" strokeLinecap="round" pointerEvents="none"
        />
      ))}
      {months.map((m, i) => (
        hasAct(m) && (
          <circle
            key={m.month} cx={cxOf(i)} cy={lineY(m.act)} r={3.6}
            fill={C_ACT} stroke="#fff" strokeWidth={1.4} pointerEvents="none"
          />
        )
      ))}

      {/* Nhan thang */}
      {months.map((m, i) => {
        const cx = cxOf(i)
        const ok = has(m)
        return (
          <text
            key={m.month}
            x={cx} y={baseY + 19} textAnchor="middle" fontSize={13.5}
            fontWeight={m.month === currentMonth ? 800 : 600}
            fill={ok ? (m.month === currentMonth ? '#0a1f33' : '#52667c') : '#b9c7d8'}
          >
            T{m.month}
          </text>
        )
      })}

      {/* Hang so TVV Active DUOI nhan thang (so lieu cua duong cam nam o day) */}
      {months.map((m, i) => {
        const cx = cxOf(i)
        const ok = hasAct(m)
        return (
          <text
            key={m.month}
            x={cx} y={baseY + 40} textAnchor="middle" fontSize={13.5}
            fontWeight={800}
            fill={ok ? C_ACT : '#d3dce7'}
          >
            {ok ? m.act : '–'}
          </text>
        )
      })}
    </svg>
    {selMonth && (
      <div className="chart-detail">
        📅 Tháng <b>{selMonth.month}/{journey.year}</b>: FYP <b>{fmtTr(selMonth.fyp)} tr</b> · TVV Active <b>{selMonth.act}</b>
        <span className="muted"> · {selMonth.source === 'ga' ? 'số liệu GA' : 'theo Daily Sales'}</span>
      </div>
    )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// PaceChart — "NHIP DO VE DICH" (10/11/2026): duong FYP luy ke THUC
// TE theo ngay (diem = snapshot Daily cua thang, tu lib/pace) ve
// cung duong NHIP CAN THIET thang toi muc tieu (net dut). Diem cuoi
// to XANH khi >= nhip can tai ngay do, DO khi thap hon (khong co
// muc tieu thi to mau primary). Thuan hien thi — so lieu nhan san.
// points: [{ day, fyp }] da sap xep; target: trieu hoac null.
// ─────────────────────────────────────────────────────────────
export function PaceChart({ points, target, daysInMonth }) {
  if (!points || !points.length || !daysInMonth) return null
  const W = 340
  const H = 128
  const L = 8
  const R = 8
  const T = 14
  const B = 20
  const iw = W - L - R
  const ih = H - T - B
  const maxFyp = Math.max(...points.map((p) => p.fyp))
  const yMax = niceMax(Math.max(maxFyp, Number(target) || 0))
  const x = (day) => L + (Math.min(Math.max(day, 0), daysInMonth) / daysInMonth) * iw
  const y = (v) => T + ih - (Math.min(Math.max(v, 0), yMax) / yMax) * ih
  const last = points[points.length - 1]
  const needLast = target ? (Number(target) * last.day) / daysInMonth : null
  const lastColor = !target ? '#1a56a8' : last.fyp >= needLast ? '#047857' : '#b91c1c'
  const linePts = points.map((p) => `${x(p.day)},${y(p.fyp)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Biểu đồ nhịp độ về đích">
      <line x1={L} y1={T + ih} x2={W - R} y2={T + ih} stroke={C_GRID} strokeWidth={1} />
      {target ? (
        <>
          <line x1={x(0)} y1={y(0)} x2={x(daysInMonth)} y2={y(Number(target))} stroke="#94a3b8" strokeWidth={1.6} strokeDasharray="5 4" />
          <text x={W - R} y={Math.max(10, y(Number(target)) - 4)} textAnchor="end" fontSize={10.5} fontWeight={700} fill="#64748b">
            Mục tiêu {fmtTr(target)}
          </text>
        </>
      ) : null}
      {points.length > 1 ? (
        <polyline points={linePts} fill="none" stroke="#1a56a8" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      {points.map((p, i) => (
        <circle key={p.day} cx={x(p.day)} cy={y(p.fyp)} r={i === points.length - 1 ? 4.4 : 3} fill={i === points.length - 1 ? lastColor : '#1a56a8'} stroke="#ffffff" strokeWidth={1.4} />
      ))}
      <text x={x(1)} y={H - 5} textAnchor="middle" fontSize={10.5} fill={C_LABEL}>1</text>
      <text x={x(last.day)} y={Math.max(10, y(last.fyp) - 8)} textAnchor="middle" fontSize={11} fontWeight={800} fill={lastColor}>
        {fmtTr(last.fyp)} tr
      </text>
      <text x={x(daysInMonth)} y={H - 5} textAnchor="middle" fontSize={10.5} fill={C_LABEL}>{daysInMonth}</text>
    </svg>
  )
}
