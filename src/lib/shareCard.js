// ─────────────────────────────────────────────────────────────
// shareCard.js — Chuan bi DU LIEU cho 2 anh chia se (10/11/2026):
//   1) Anh "Ban tin ngay" o Trang Chu (dailyCardData)
//   2) Anh "Bang Vang" o Tinh Anh (boardCardData)
// Ham THUAN (khong React/DOM/html2canvas) de test bang node tren file
// Daily that. Component ShareCard.jsx chi viec TRINH BAY dung cac
// truong o day — so lieu lay tu CUNG cac ham ma man hinh dang dung
// (homeKpi/topIssuedByRow cho Trang Chu; buildTeam/rankAgents cho
// Bang Vang) nen anh va man hinh khong bao gio lech nhau.
// Don vi tien: trieu dong (nhu du lieu Daily).
// ─────────────────────────────────────────────────────────────
import { homeKpi, topIssuedByRow } from './homeKpi.js'
import { rankAgents, issuedOf } from './team.js'

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 'yyyy-mm-dd' -> 'dd/mm/yyyy' (sai dinh dang thi tra nguyen van). */
export function fmtDateVN(iso) {
  const p = String(iso || '').split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(iso || '')
}

/**
 * Chu cai dau avatar du phong: 2 tu cuoi cua ten (ten rieng kieu Viet),
 * giong DoiNgu/CaNhan. Ten rong -> '?'.
 */
export function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Du lieu anh BAN TIN NGAY tu snapshot moi nhat + muc tieu thang.
 * snapshot: { id: 'yyyy-mm-dd', data } — target: so trieu hoac null.
 * So lieu KHOP Trang Chu: kpi = homeKpi(data); fyp = tong agents.fyp;
 * top = topIssuedByRow (fallback theo agent.ipNet nhu HomNay khi chua
 * co dong IF nao); active = TVV co fyp > 0 hoac co ho so IF/PS/Other
 * (cung cong thuc tvvActive cua HomNay).
 */
export function dailyCardData(snapshot, target = null) {
  const data = (snapshot && snapshot.data) || {}
  const id = (snapshot && snapshot.id) || ''
  const [year, month] = String(id).split('-').map(Number)
  const kpi = homeKpi(data)
  const agents = Object.values(data.agents || {})
  const fyp = agents.reduce((s, a) => s + num(a.fyp), 0)
  let top = topIssuedByRow(data, 5).map((a) => ({ name: a.name, unit: a.unit, ip: a.ip }))
  if (!top.length) {
    top = agents
      .filter((a) => num(a.ipNet) > 0)
      .sort((x, y) => num(y.ipNet) - num(x.ipNet))
      .slice(0, 5)
      .map((a) => ({ name: a.agName || '', unit: a.unit || '', ip: num(a.ipNet) }))
  }
  const t = target !== null && target !== undefined && Number(target) > 0 ? Number(target) : null
  return {
    dateId: id,
    dateLabel: fmtDateVN(id),
    month: month || 0,
    year: year || 0,
    fyp,
    target: t,
    pct: t ? Math.min(100, Math.max(0, (fyp / t) * 100)) : null,
    remaining: t !== null ? t - fyp : null,
    kpi,
    top,
    activeCount: agents.filter((a) => num(a.fyp) > 0 || (num(a.cIF) + num(a.cPS) + num(a.cOther)) > 0).length,
    totalAgents: agents.length,
  }
}

export const BOARD_MODE_LABELS = {
  ipNet: 'IP phát hành',
  barTotal: 'Tổng nộp',
  fyc: 'FYC tháng',
}

/**
 * Du lieu anh BANG VANG tu team (buildTeam) theo che do sap xep dang
 * chon. Cung tap TVV "co so lieu thang" nhu DoiNgu dang hien thi
 * (bar.total > 0 hoac fyp > 0), cat Top `limit`.
 * So TO cua moi hang KHOP hang Bang Vang tren man hinh theo nguyen
 * tac SO TO = tieu chi dang sap xep (Lan chot 10/11/2026): 'fyc' ->
 * FYC thang (kem so thieu toi moc FYC_FLOOR khi duoi moc, truyen qua
 * fycFloor); 'ipNet' -> issuedRow (IP phat hanh dem theo dong IF cua
 * Proposal — issuedOf); 'barTotal' -> tong nop (bar.total). bigLabel
 * cua tung hang = nhan che do (modeLabel) de anh tu giai thich.
 */
export function boardCardData(team, sortKey = 'ipNet', limit = 10, fycFloor = 5) {
  const ranked = rankAgents(team, sortKey)
  const listed = ranked.filter((a) => (a.bar && a.bar.total > 0) || num(a.fyp) > 0)
  const rows = listed.slice(0, Math.max(0, limit)).map((a, i) => {
    const isFyc = sortKey === 'fyc'
    const fyc = num(a.fyc)
    return {
      rank: i + 1,
      msdl: a.msdl || '',
      name: a.agName || '',
      unit: a.unit || '',
      agSeg: a.agSeg || '',
      initials: initialsOf(a.agName),
      big: isFyc ? fyc : sortKey === 'ipNet' ? issuedOf(a) : num(a.bar && a.bar.total),
      bigLabel: BOARD_MODE_LABELS[sortKey] || BOARD_MODE_LABELS.ipNet,
      bigIsFyc: isFyc,
      fycShort: isFyc && fyc < fycFloor ? fycFloor - fyc : null,
      caseSub: num(a.caseSub),
      bar: {
        issued: num(a.bar && a.bar.issued),
        pending: num(a.bar && a.bar.pending),
        pipeline: num(a.bar && a.bar.pipeline),
        total: num(a.bar && a.bar.total),
      },
    }
  })
  return {
    sortKey,
    modeLabel: BOARD_MODE_LABELS[sortKey] || BOARD_MODE_LABELS.ipNet,
    rows,
    listedCount: listed.length,
  }
}
