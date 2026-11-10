// ─────────────────────────────────────────────────────────────
// badges.js — HUY HIEU THANH TICH + hang "TIEN BO NHAT THANG"
// (10/11/2026). Ham THUAN, test bang node tren file Daily that.
//
// Huy hieu CHI TICH CUC, tinh tu du lieu thang hien tai:
//   ✅ 'active' — Dat Active: caseNet > 0 (chuan Active toan app).
//   🎯 'fyc5'   — FYC thang >= 5tr (moc FYC_FLOOR cua lib/team).
//   🔥 'streak' — Nop ho so 3 ngay LIEN TIEP tro len trong thang:
//      dem theo ngay nop (proposalDate) cua cac ho so buildCases
//      cua TVV trong snapshot thang.
//   🏅 'top10'  — Nam trong Top 10 Bang Vang theo IP phat hanh
//      (rankAgents sortKey 'ipNet').
// agentBadges(agent, ctx): agent la agentView cua lib/team (co
// msdl/caseNet/fyc); ctx = { topMsdl: Set<MSDL>, daysByMsdl: Map }.
//
// progressRank(curSnap, prevSnap): TVV co IP phat hanh (agent.ipNet
// o sheet Agent) thang nay TRU IP thang truoc tang nhieu nhat.
// Don vi: trieu dong.
// ─────────────────────────────────────────────────────────────
import { rankAgents } from './team.js'

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const up = (v) => String(v || '').trim().toUpperCase()

export const BADGE_DEFS = [
  { id: 'active', icon: '✅', label: 'Đạt Active' },
  { id: 'fyc5', icon: '🎯', label: 'FYC ≥ 5tr' },
  { id: 'streak', icon: '🔥', label: 'Nộp 3 ngày liên tiếp' },
  { id: 'top10', icon: '🏅', label: 'Top 10 tháng' },
]
export const FYC_BADGE_FLOOR = 5
export const STREAK_DAYS = 3

/**
 * Gom ngay nop ho so theo TVV tu cases (buildCases):
 * Map<MSDL, Set<'yyyy-mm-dd'>> — moi ho so co proposalDate dem 1
 * ngay cho TVV cua no (ke ca ho so chi o sheet Pipeline/Pending:
 * chung van la ho so TVV da nop trong thang).
 */
export function submissionDaysByAgent(cases) {
  const map = new Map()
  for (const c of cases || []) {
    const key = up(c && c.msdl)
    const day = String((c && c.proposalDate) || '')
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
    if (!map.has(key)) map.set(key, new Set())
    map.get(key).add(day)
  }
  return map
}

/** Chay ngay lien tiep DAI NHAT trong tap ngay 'yyyy-mm-dd'. */
export function maxConsecutiveDays(daySet) {
  const days = [...(daySet || [])]
    .map((d) => {
      const [y, m, dd] = String(d).split('-').map(Number)
      return Date.UTC(y, (m || 1) - 1, dd || 1) / 86400000
    })
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev = null
  for (const d of days) {
    run = prev !== null && d === prev + 1 ? run + 1 : 1
    if (run > best) best = run
    prev = d
  }
  return best
}

/** Co chay nop >= n ngay lien tiep khong (mac dinh n = STREAK_DAYS). */
export function hasDayStreak(daySet, n = STREAK_DAYS) {
  return maxConsecutiveDays(daySet) >= n
}

/** Tap MSDL cua Top n TVV theo IP phat hanh (rankAgents 'ipNet'). */
export function topMsdlSet(team, n = 10) {
  return new Set(rankAgents(team, 'ipNet').slice(0, n).map((a) => up(a.msdl)))
}

/**
 * Huy hieu cua 1 TVV trong thang. Tra mang BADGE_DEFS da loc theo
 * thu tu co dinh [active, fyc5, streak, top10] — UI tu cat so icon
 * hien thi (Bang Vang toi da 3, trang Ca nhan hien het kem chu).
 */
export function agentBadges(agent, ctx = {}) {
  if (!agent) return []
  const out = []
  const msdl = up(agent.msdl)
  if (num(agent.caseNet) > 0) out.push(BADGE_DEFS[0])
  if (num(agent.fyc) >= FYC_BADGE_FLOOR) out.push(BADGE_DEFS[1])
  const days = ctx.daysByMsdl ? ctx.daysByMsdl.get(msdl) : null
  if (days && hasDayStreak(days)) out.push(BADGE_DEFS[2])
  if (ctx.topMsdl && ctx.topMsdl.has(msdl)) out.push(BADGE_DEFS[3])
  return out
}

/**
 * Hang TIEN BO: delta = ipNet thang nay - ipNet thang truoc theo
 * MSDL (agent o sheet Agent cua tung snapshot; TVV khong co o thang
 * truoc thi prev = 0). Chi lay TVV co o thang NAY va delta > 0,
 * sap giam dan theo delta (hoa thi theo ipNet thang nay giam dan).
 * Tra toi da `limit` muc [{ msdl, name, unit, cur, prev, delta }].
 */
export function progressRank(curSnap, prevSnap, limit = 3) {
  const curAgents = (curSnap && curSnap.data && curSnap.data.agents) || {}
  const prevAgents = (prevSnap && prevSnap.data && prevSnap.data.agents) || {}
  const prevByMsdl = new Map()
  for (const a of Object.values(prevAgents)) {
    const key = up(a && a.msdl)
    if (key) prevByMsdl.set(key, num(a.ipNet))
  }
  const rows = []
  for (const a of Object.values(curAgents)) {
    const key = up(a && a.msdl)
    if (!key) continue
    const cur = num(a.ipNet)
    const prev = prevByMsdl.get(key) || 0
    const delta = cur - prev
    if (delta <= 0) continue
    rows.push({
      msdl: key,
      name: a.agName || '',
      unit: a.unit || '',
      cur,
      prev,
      delta,
    })
  }
  rows.sort((x, y) => y.delta - x.delta || y.cur - x.cur || x.name.localeCompare(y.name, 'vi'))
  return rows.slice(0, Math.max(0, limit))
}
