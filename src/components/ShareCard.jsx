// ─────────────────────────────────────────────────────────────
// ShareCard.jsx — ANH CHIA SE gui Zalo (10/11/2026):
//   DailyShareCard — "Ban tin ngay" cua Trang Chu (du lieu tu
//     lib/shareCard.dailyCardData: homeKpi + topIssuedByRow — CUNG
//     so voi man hinh, khong tinh lai kieu khac).
//   BoardShareCard — Top 10 Bang Vang theo che do sap xep DANG CHON
//     (lib/shareCard.boardCardData: rankAgents — cung so voi hang
//     Bang Vang tren man hinh).
// The anh render AN ngoai man hinh (.share-offscreen) o kho 540px,
// html2canvas scale 2 -> PNG ~1080px ngang. Bam nut -> chup -> mo
// modal xem truoc + nut Tai xuong. Loi render -> nem loi ra cho UI
// bao tieng Viet than thien, app khong crash.
// Anh Bang Vang: avatar that chi nhung khi withAvatars = true; neu
// html2canvas loi vi anh ngoai (CORS) thi UI tu thu lai voi
// withAvatars = false (vong tron chu cai dau nhu giao dien).
// ─────────────────────────────────────────────────────────────
import React from 'react'
import html2canvas from 'html2canvas'
import { LOGO_D07 } from '../lib/logoData'

const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN')
const fmtCaseSub = (n) => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('vi-VN')
const MEDALS = ['🥇', '🥈', '🥉']

const segKey = (agSeg) => {
  const s = String(agSeg || '').toLowerCase()
  if (s.includes('diamond')) return 'dia'
  if (s.includes('platinum')) return 'pla'
  if (s.includes('gold')) return 'gold'
  return 'oth'
}

/** Chup 1 element thanh PNG data URL (scale 2). Loi -> throw. */
export async function captureShareCard(el) {
  if (!el) throw new Error('share-card-missing')
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })
  return canvas.toDataURL('image/png')
}

function ShareHead({ kind, sub }) {
  return (
    <div className="sc-head">
      <img className="sc-logo" src={LOGO_D07} alt="" />
      <div>
        <div className="sc-brand">Prudential Quận 7</div>
        <div className="sc-slogan">Cùng Học Hỏi – Cùng Phát Triển – Cùng Thành Công</div>
      </div>
      <div className="sc-kind">
        <div>{kind}</div>
        <div className="sc-date">{sub}</div>
      </div>
    </div>
  )
}

/** Anh BAN TIN NGAY (Trang Chu). data = dailyCardData(...). */
export function DailyShareCard({ data, cardRef }) {
  if (!data) return null
  const k = data.kpi
  return (
    <div className="share-card" ref={cardRef}>
      <div className="sc-hero">
        <ShareHead kind="📰 BẢN TIN NGÀY" sub={`Dữ liệu đến ${data.dateLabel}`} />
        <div className="sc-fyp-label">🎯 FYP tháng {data.month}/{data.year}</div>
        <div className="sc-fyp-num">{fmtTr(data.fyp)} <span className="sc-unit">triệu đồng</span></div>
        {data.target !== null ? (
          <>
            <div className="sc-progress"><div className="sc-progress-fill" style={{ width: `${data.pct || 0}%` }} /></div>
            <div className="sc-note-hero">
              Đạt <b>{(Math.round((data.pct || 0) * 10) / 10).toLocaleString('vi-VN')}%</b> mục tiêu {fmtTr(data.target)} tr
              {data.remaining > 0 ? <> · còn thiếu <b>{fmtTr(data.remaining)} tr</b></> : <> · đã đạt mục tiêu 🎉</>}
            </div>
          </>
        ) : null}
      </div>
      <div className="sc-body">
        <div className="sc-kpis">
          <div className="sc-kpi sc-kpi-nop">
            <div className="sc-kpi-label">📥 Nộp (theo IP)</div>
            <div className="sc-kpi-val">{fmtTr(k.nop.ip)} tr</div>
            <div className="sc-kpi-sub">{fmtInt(k.nop.n)} hồ sơ</div>
          </div>
          <div className="sc-kpi sc-kpi-issued">
            <div className="sc-kpi-label">✅ Phát hành (IP Net)</div>
            <div className="sc-kpi-val">{fmtTr(k.phatHanh.ip)} tr</div>
            <div className="sc-kpi-sub">{fmtInt(k.phatHanh.n)} hợp đồng</div>
          </div>
          <div className="sc-kpi sc-kpi-pending">
            <div className="sc-kpi-label">⏳ Pending (theo APE)</div>
            <div className="sc-kpi-val">{fmtTr(k.pending.ape)} tr</div>
            <div className="sc-kpi-sub">{fmtInt(k.pending.n)} hồ sơ</div>
          </div>
          <div className="sc-kpi sc-kpi-pipe">
            <div className="sc-kpi-label">💸 Chưa lên phí (APE)</div>
            <div className="sc-kpi-val">{fmtTr(k.chuaLenPhi.ape)} tr</div>
            <div className="sc-kpi-sub">{fmtInt(k.chuaLenPhi.n)} hồ sơ</div>
          </div>
        </div>
        <div className="sc-sec-label">🏆 Top 5 TVV phát hành</div>
        {data.top.length === 0 ? (
          <div className="sc-note">Chưa có TVV nào phát hành trong tháng này.</div>
        ) : data.top.map((a, i) => (
          <div className={`sc-top-row${i === 0 ? ' sc-top-first' : ''}${i > 0 && i % 2 === 1 ? ' sc-top-alt' : ''}`} key={`${a.name}-${i}`}>
            {i < 3 ? <span className="sc-medal">{MEDALS[i]}</span> : <span className="sc-rank">{i + 1}</span>}
            <div className="sc-top-who">
              <div className="sc-top-name">{a.name || '—'}</div>
              <div className="sc-top-unit">{a.unit || ''}</div>
            </div>
            <div className="sc-top-ip">{fmtTr(a.ip)} tr</div>
          </div>
        ))}
      </div>
      <div className="sc-foot">
        👥 TVV đang hoạt động: <b>{fmtInt(data.activeCount)}/{fmtInt(data.totalAgents)}</b> · Số liệu từ Daily Sales đến {data.dateLabel}
      </div>
    </div>
  )
}

/** Anh BANG VANG (Tinh Anh). data = boardCardData(...). */
export function BoardShareCard({ data, month, year, avatarMap = {}, withAvatars = true, cardRef }) {
  if (!data) return null
  return (
    <div className="share-card" ref={cardRef}>
      <div className="sc-hero">
        <ShareHead kind="🏆 BẢNG VÀNG" sub={`Tháng ${month}/${year}`} />
        <div className="sc-hero-note">
          Xếp hạng theo: <b>{data.modeLabel}</b> · Top {data.rows.length} trong {fmtInt(data.listedCount)} TVV có số liệu tháng
        </div>
      </div>
      <div className="sc-body">
      {data.rows.map((r) => {
        const av = withAvatars ? (avatarMap[String(r.msdl || '').trim().toUpperCase()] || '') : ''
        const pctOf = (v) => (r.bar.total > 0 ? (v / r.bar.total) * 100 : 0)
        return (
          <div className={`sc-board-row${r.rank <= 3 ? ` sc-board-r${r.rank}` : ''}${r.rank > 3 && r.rank % 2 === 0 ? ' sc-board-alt' : ''}`} key={r.msdl || r.rank}>
            <span className={`sc-avatar sc-av-${segKey(r.agSeg)}`}>
              {av ? <img className="sc-avatar-img" src={av} alt="" crossOrigin="anonymous" /> : r.initials}
              {r.rank <= 3 ? <span className="sc-avatar-medal">{MEDALS[r.rank - 1]}</span> : null}
            </span>
            <div className="sc-board-main">
              <div className="sc-top-name">
                {r.rank > 3 ? <span className="sc-rank">{r.rank}</span> : null}
                {r.name || '—'}
              </div>
              <div className="sc-top-unit">{r.unit || '—'}{r.agSeg ? ` · ${r.agSeg}` : ''}</div>
              {r.bar.total > 0 ? (
                <span className="sc-bar">
                  {r.bar.issued > 0 ? <span className="bv-seg-issued" style={{ width: `${pctOf(r.bar.issued)}%` }} /> : null}
                  {r.bar.pending > 0 ? <span className="bv-seg-pending" style={{ width: `${pctOf(r.bar.pending)}%` }} /> : null}
                  {r.bar.pipeline > 0 ? <span className="bv-seg-pipeline" style={{ width: `${pctOf(r.bar.pipeline)}%` }} /> : null}
                </span>
              ) : null}
              {r.fycShort !== null && r.fycShort !== undefined ? (
                <div className="sc-short">Thiếu {fmtTr(r.fycShort)} tr (mốc 5tr FYC)</div>
              ) : null}
            </div>
            <div className="sc-board-total">
              <div className={`sc-board-num ${r.bigIsFyc ? (r.fycShort ? 'sc-num-short' : 'sc-num-fyc') : ''}`}>{fmtTr(r.big)}</div>
              <div className="sc-kpi-sub">{r.bigLabel || (r.bigIsFyc ? 'FYC tháng' : 'Tổng giá trị')} · {fmtCaseSub(r.caseSub)} HS</div>
            </div>
          </div>
        )
      })}
      </div>
      <div className="sc-foot">Prudential Quận 7 · Cùng Học Hỏi – Cùng Phát Triển – Cùng Thành Công</div>
    </div>
  )
}

/** Modal xem truoc anh da chup + nut Tai xuong (tai dung .modal-*). */
export function SharePreviewModal({ imgUrl, fileName, title, onClose }) {
  if (!imgUrl) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title || '📸 Ảnh chia sẻ'}</div>
        <img className="share-preview-img" src={imgUrl} alt="Ảnh chia sẻ" />
        <a className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 12 }} href={imgUrl} download={fileName || 'anh-chia-se-d07.png'}>
          ⬇ Tải xuống
        </a>
        <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>Đóng</button>
      </div>
    </div>
  )
}
