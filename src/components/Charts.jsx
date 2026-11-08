// ─────────────────────────────────────────────────────────────
// Charts.jsx — Bieu do SVG TU VE (khong dung thu vien chart ngoai:
// mang noi bo cua Lan chan nhieu CDN, nen bieu do phai tu chua 100%).
//   DailyStackChart  — cot xep chong theo ngay nop trong thang (mau D03):
//                      Phat hanh (tim) / Pending (hong) / Chua len phi (xanh
//                      duong), to theo TRANG THAI HIEN TAI cua ho so.
//   YearJourneyChart — cot IP phat hanh theo thang + duong cam so hop dong.
// Ca hai deu nhan so tho (trieu dong) tu lib/journey.js.
// ─────────────────────────────────────────────────────────────
import React from 'react'

// Dinh dang tien kieu Viet: 1 so thap phan, bo phan thap phan neu nguyen
// (khop fmtTr o HomNay): 1577.6 -> "1.577,6" · 264 -> "264".
const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}

const C_ISSUED = '#7c3aed'
const C_PENDING = '#ec4899'
const C_PIPELINE = '#06b6d4'
const C_GRID = '#e3e8f0'
const C_AXIS = '#cbd5e1'
const C_LABEL = '#94a3b8'
const C_ORANGE = '#f97316'

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
              <rect x={x - 1.5} y={baseY - acc - 1.5} width={barW + 3} height={acc + 1.5} fill="none" stroke="#0f2e52" strokeWidth={1.4} />
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
            fontWeight={isSel ? 800 : 600} fill={isSel ? '#0f2e52' : C_LABEL}
          >
            {d}
          </text>
        )
      })}
    </svg>
  )
}

/**
 * Hanh trinh nam: cot IP phat hanh theo thang + duong cam so hop dong.
 *   journey: { year, months: [{ month, ipIssued, contracts, dataDate }] } (lib/journey monthJourney)
 *   currentMonth: thang cua snapshot dang xem (in dam nhan thang).
 */
export function YearJourneyChart({ journey, currentMonth }) {
  const W = 700
  const H = 288
  const mL = 10
  const mR = 10
  const mT = 30
  const mB = 46
  const plotW = W - mL - mR
  const plotH = H - mT - mB
  const baseY = mT + plotH

  const months = (journey && journey.months) || []
  const present = months.filter((m) => m.ipIssued !== null && m.ipIssued !== undefined)
  if (!present.length) {
    return <div className="muted" style={{ marginTop: 4 }}>Chưa có dữ liệu tháng nào trong năm {journey ? journey.year : ''} để vẽ hành trình.</div>
  }
  const ipMax = Math.max(0, ...present.map((m) => m.ipIssued))
  const contractsMax = Math.max(0, ...present.map((m) => m.contracts || 0))
  const slot = plotW / 12
  const barW = Math.min(38, slot * 0.64)
  const cxOf = (i) => mL + slot * (i + 0.5)
  const lineY = (contracts) => baseY - 6 - (contractsMax > 0 ? (contracts / contractsMax) * plotH * 0.55 : 0)

  // Duong cam: chi noi cac thang LIEN TIEP deu co du lieu (thang trong thi
  // dut doan, khong noi xuyen qua).
  const runs = []
  let run = []
  months.forEach((m, i) => {
    if (m.ipIssued !== null && m.ipIssued !== undefined) {
      run.push(`${cxOf(i)},${lineY(m.contracts || 0)}`)
    } else if (run.length) {
      runs.push(run)
      run = []
    }
  })
  if (run.length) runs.push(run)

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ hành trình năm">
      <defs>
        <linearGradient id="yjViolet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="yjPink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9a8d4" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      {/* Luoi ngang mo */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={mL} x2={W - mR} y1={baseY - plotH * f} y2={baseY - plotH * f} stroke={C_GRID} strokeWidth={1} />
      ))}
      <line x1={mL} x2={W - mR} y1={baseY} y2={baseY} stroke={C_AXIS} strokeWidth={1} />

      {/* Cot IP tung thang */}
      {months.map((m, i) => {
        if (m.ipIssued === null || m.ipIssued === undefined) return null
        const cx = cxOf(i)
        let h = ipMax > 0 ? (m.ipIssued / ipMax) * plotH : 0
        if (m.ipIssued > 0 && h < 4) h = 4
        const isMax = ipMax > 0 && m.ipIssued === ipMax
        return (
          <g key={m.month}>
            {h > 0 && (
              <path d={topRoundPath(cx - barW / 2, baseY - h, barW, h, 7)} fill={isMax ? 'url(#yjPink)' : 'url(#yjViolet)'} />
            )}
            <text x={cx} y={baseY - h - 8} textAnchor="middle" fontSize={15} fontWeight={800} fill={isMax ? '#db2777' : '#5b21b6'}>
              {fmtTr(m.ipIssued)}
            </text>
          </g>
        )
      })}

      {/* Duong cam so hop dong */}
      {runs.filter((r) => r.length > 1).map((r, i) => (
        <polyline key={i} points={r.join(' ')} fill="none" stroke={C_ORANGE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {months.map((m, i) => {
        if (m.ipIssued === null || m.ipIssued === undefined) return null
        return (
          <circle key={m.month} cx={cxOf(i)} cy={lineY(m.contracts || 0)} r={4.5} fill="#ffffff" stroke={C_ORANGE} strokeWidth={2.5} />
        )
      })}

      {/* Nhan thang + so hop dong */}
      {months.map((m, i) => {
        const cx = cxOf(i)
        const has = m.ipIssued !== null && m.ipIssued !== undefined
        const isMax = has && ipMax > 0 && m.ipIssued === ipMax
        return (
          <g key={m.month}>
            <text
              x={cx} y={baseY + 20} textAnchor="middle" fontSize={13.5}
              fontWeight={m.month === currentMonth ? 800 : 600}
              fill={has ? (m.month === currentMonth ? '#1e293b' : '#64748b') : '#cbd5e1'}
            >
              T{m.month}
            </text>
            {has && (
              <text x={cx} y={baseY + 40} textAnchor="middle" fontSize={13} fontWeight={700} fill={isMax ? '#db2777' : '#ea580c'}>
                {fmtTr(m.contracts)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
