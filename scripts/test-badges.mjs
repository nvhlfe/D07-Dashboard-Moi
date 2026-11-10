// Test lib/badges.js (HUY HIEU + TIEN BO NHAT — 10/11/2026) tren 2 file
// Daily THAT: 25.10 = thang truoc, 8.11 = thang nay.
//  - progressRank(T11 so T10): hang 1 khop DELTA TINH DOC LAP trong
//    test (doc thang agents cua 2 ban parse, tru ipNet theo MSDL).
//  - agentBadges: TVV top 1 IP phat hanh phai co huy hieu top10; TVV
//    caseNet > 0 phai co 'active'; fyc >= 5 phai co 'fyc5'; huy hieu
//    streak khop hasDayStreak tinh doc lap tu buildCases.
//  - maxConsecutiveDays/hasDayStreak: ca gia lap (chay 3 ngay lien tiep,
//    ngay le, trung thang/nam).
// Chay: node scripts/test-badges.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { buildCases } from '../src/lib/cases.js'
import { buildTeam, rankAgents } from '../src/lib/team.js'
import {
  agentBadges, submissionDaysByAgent, maxConsecutiveDays, hasDayStreak,
  topMsdlSet, progressRank,
} from '../src/lib/badges.js'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const up = (v) => String(v || '').trim().toUpperCase()
const R1 = (x) => Math.round(x * 10) / 10

function loadSnap(path, dateId) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
  return { id: dateId, data: parseWorkbook(wb) }
}
const snapT10 = loadSnap(process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx', '2026-10-25')
const snapT11 = loadSnap(process.env.HOME + '/workspace/user/files/Daily_Sales_8.11.xlsx', '2026-11-08')

// ── Chay ngay lien tiep (gia lap) ──
{
  assert.strictEqual(maxConsecutiveDays(new Set(['2026-11-01', '2026-11-02', '2026-11-03'])), 3, 'streak: 3 ngay lien tiep -> 3')
  assert.strictEqual(maxConsecutiveDays(new Set(['2026-11-01', '2026-11-03', '2026-11-04'])), 2, 'streak: dut quang -> chay dai nhat 2')
  assert.strictEqual(maxConsecutiveDays(new Set(['2026-10-31', '2026-11-01', '2026-11-02'])), 3, 'streak: lien tiep qua thang -> 3')
  assert.strictEqual(maxConsecutiveDays(new Set()), 0, 'streak: tap rong -> 0')
  assert.strictEqual(hasDayStreak(new Set(['2026-11-05', '2026-11-06', '2026-11-07'])), true, 'hasDayStreak: du 3 ngay -> true')
  assert.strictEqual(hasDayStreak(new Set(['2026-11-05', '2026-11-06'])), false, 'hasDayStreak: 2 ngay -> false')
  console.log('=== maxConsecutiveDays/hasDayStreak: chay lien tiep, dut quang, qua thang — dung ===')
}

// ── progressRank: T11 so voi T10, delta tinh DOC LAP ──
{
  // Tinh doc lap: doc agents cua 2 ban parse, delta = ipNet T11 - ipNet T10.
  const prevMap = new Map()
  for (const a of Object.values(snapT10.data.agents)) prevMap.set(up(a.msdl), num(a.ipNet))
  const expected = Object.values(snapT11.data.agents)
    .map((a) => ({ msdl: up(a.msdl), cur: num(a.ipNet), prev: prevMap.get(up(a.msdl)) || 0 }))
    .map((r) => ({ ...r, delta: r.cur - r.prev }))
    .filter((r) => r.delta > 0)
    .sort((x, y) => y.delta - x.delta || y.cur - x.cur)
  assert.ok(expected.length >= 3, 'doc lap: phai co it nhat 3 TVV tien bo de xep hang')
  const rank = progressRank(snapT11, snapT10, 3)
  assert.strictEqual(rank.length, 3, 'progressRank: tra top 3')
  assert.strictEqual(rank[0].msdl, expected[0].msdl, `progressRank: hang 1 phai la ${expected[0].msdl} (doc lap), thuc te ${rank[0].msdl}`)
  assert.ok(Math.abs(rank[0].delta - expected[0].delta) < 1e-6, 'progressRank: delta hang 1 khop tinh doc lap')
  assert.ok(Math.abs(rank[0].cur - expected[0].cur) < 1e-6 && Math.abs(rank[0].prev - expected[0].prev) < 1e-6, 'progressRank: cur/prev hang 1 khop')
  for (let i = 1; i < rank.length; i++) assert.ok(rank[i - 1].delta >= rank[i].delta, 'progressRank: giam dan theo delta')
  assert.ok(rank.every((r) => r.delta > 0), 'progressRank: chi TVV co delta > 0')
  // Khong co thang truoc -> prev = 0 het, hang 1 = TVV ipNet cao nhat thang nay
  const noPrev = progressRank(snapT11, null, 1)
  const topIp = Object.values(snapT11.data.agents).reduce((m, a) => Math.max(m, num(a.ipNet)), 0)
  assert.ok(Math.abs(noPrev[0].delta - topIp) < 1e-6, 'progressRank: prevSnap null -> delta = ipNet thang nay')
  console.log(`=== progressRank T11/T10: hang 1 = ${rank[0].name} (${rank[0].msdl}) +${R1(rank[0].delta)}tr (${R1(rank[0].prev)} -> ${R1(rank[0].cur)}) — khop tinh doc lap ===`)
}

// ── agentBadges tren file 8.11 ──
{
  const cases = buildCases(snapT11)
  const team = buildTeam(snapT11, cases)
  const ctx = { topMsdl: topMsdlSet(team, 10), daysByMsdl: submissionDaysByAgent(cases) }
  assert.strictEqual(ctx.topMsdl.size, 10, 'topMsdlSet: dung 10 MSDL')
  const ranked = rankAgents(team, 'ipNet')
  const top1 = ranked[0]
  const bTop1 = agentBadges(top1, ctx).map((b) => b.id)
  assert.ok(bTop1.includes('top10'), 'badges: TVV hang 1 IP phat hanh phai co huy hieu top10')
  // Moi TVV: badge active/fyc5 phai khop dieu kien tho cua agentView
  let nActive = 0; let nFyc5 = 0; let nStreak = 0
  for (const a of ranked) {
    const ids = agentBadges(a, ctx).map((b) => b.id)
    assert.strictEqual(ids.includes('active'), num(a.caseNet) > 0, `badges: 'active' cua ${a.msdl} phai khop caseNet > 0`)
    assert.strictEqual(ids.includes('fyc5'), num(a.fyc) >= 5, `badges: 'fyc5' cua ${a.msdl} phai khop fyc >= 5`)
    const days = ctx.daysByMsdl.get(up(a.msdl))
    assert.strictEqual(ids.includes('streak'), !!days && hasDayStreak(days), `badges: 'streak' cua ${a.msdl} phai khop chay ngay nop`)
    assert.ok(ids.length <= 4, 'badges: toi da 4 huy hieu')
    if (ids.includes('active')) nActive += 1
    if (ids.includes('fyc5')) nFyc5 += 1
    if (ids.includes('streak')) nStreak += 1
  }
  console.log(`=== agentBadges 8.11: top1 co top10; active x${nActive} · fyc5 x${nFyc5} · streak x${nStreak} — khop dieu kien tho tung TVV ===`)
  // Thu tu huy hieu co dinh [active, fyc5, streak, top10]
  const all = agentBadges({ msdl: top1.msdl, caseNet: 1, fyc: 9 }, { topMsdl: new Set([up(top1.msdl)]), daysByMsdl: new Map([[up(top1.msdl), new Set(['2026-11-01', '2026-11-02', '2026-11-03'])]]) })
  assert.deepStrictEqual(all.map((b) => b.id), ['active', 'fyc5', 'streak', 'top10'], 'badges: thu tu co dinh [active, fyc5, streak, top10]')
  assert.deepStrictEqual(agentBadges(null), [], 'badges: agent null -> []')
}

console.log('\n✅ TAT CA ASSERT DAT (test-badges)')
