// Test tinh nang XUAT ANH CHIA SE (10/11/2026):
//  - lib/shareCard.dailyCardData tren file THAT 8.11: so lieu KHOP
//    homeKpi (so neo doc lap o test-homekpi) + top phat hanh + dem
//    TVV hoat dong tinh doc lap trong test tu agents tho.
//  - lib/shareCard.boardCardData: thu tu/msdl KHOP rankAgents cua
//    lib/team tren cung team; so to theo che do (nguyen tac SO TO =
//    tieu chi dang sap, Lan chot 10/11/2026): fyc -> FYC thang;
//    ipNet -> issuedRow (IP phat hanh dem theo dong); barTotal ->
//    tong nop bar.total.
//  - Component: ShareCard.jsx co DailyShareCard/BoardShareCard/
//    captureShareCard; HomNay co nut "Tao anh ban tin"; DoiNgu co
//    nut "Tao anh Bang Vang" (node khong render html2canvas duoc
//    nen phan chup anh chi assert tinh tai — da kiem chung ky thuat
//    o du an Poster Vinh Danh).
// Chay: node scripts/test-share.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { buildCases } from '../src/lib/cases.js'
import { buildTeam, rankAgents, issuedOf } from '../src/lib/team.js'
import { dailyCardData, boardCardData, initialsOf, fmtDateVN } from '../src/lib/shareCard.js'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const R1 = (x) => Math.round(x * 10) / 10
const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')

function loadSnap(path, dateId) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
  return { id: dateId, data: parseWorkbook(wb) }
}
const snap = loadSnap(process.env.HOME + '/workspace/user/files/Daily_Sales_8.11.xlsx', '2026-11-08')

// ── dailyCardData ──
{
  const d = dailyCardData(snap, 3500)
  assert.strictEqual(d.dateLabel, '08/11/2026', 'dailyCardData: dateLabel dd/mm/yyyy tu id snapshot')
  assert.strictEqual(d.month, 11, 'dailyCardData: month = 11')
  assert.strictEqual(R1(d.fyp), 768.3, `dailyCardData: FYP = 768,3 (thuc te ${R1(d.fyp)})`)
  assert.strictEqual(R1(d.kpi.nop.ip), 1688.3, 'dailyCardData: Nop IP khop homeKpi (1.688,3)')
  assert.strictEqual(R1(d.kpi.phatHanh.ip), 735.8, 'dailyCardData: Phat hanh IP Net khop homeKpi (735,8)')
  assert.strictEqual(R1(d.kpi.pending.ape), 337.5, 'dailyCardData: Pending APE khop homeKpi (337,5)')
  assert.strictEqual(R1(d.kpi.chuaLenPhi.ape), 615.0, 'dailyCardData: Chua len phi APE khop homeKpi (615,0)')
  assert.strictEqual(d.target, 3500, 'dailyCardData: giu nguyen muc tieu truyen vao')
  assert.ok(d.pct > 0 && d.pct <= 100, 'dailyCardData: pct trong (0, 100]')
  assert.strictEqual(R1(d.remaining), R1(3500 - 768.3), 'dailyCardData: remaining = target - fyp')
  assert.strictEqual(d.top.length, 5, 'dailyCardData: top phat hanh co 5 TVV')
  assert.strictEqual(d.top[0].name, 'PHẠM THỊ MỸ TRANG', 'dailyCardData: top 1 phat hanh la PHAM THI MY TRANG')
  assert.strictEqual(R1(d.top[0].ip), 165.7, `dailyCardData: top 1 IP = 165,7 (thuc te ${R1(d.top[0].ip)})`)
  // Dem TVV hoat dong DOC LAP tu agents tho (cong thuc cua HomNay)
  const agents = Object.values(snap.data.agents)
  const expActive = agents.filter((a) => num(a.fyp) > 0 || (num(a.cIF) + num(a.cPS) + num(a.cOther)) > 0).length
  assert.strictEqual(d.activeCount, expActive, 'dailyCardData: activeCount khop dem doc lap')
  assert.strictEqual(d.totalAgents, agents.length, 'dailyCardData: totalAgents = so agents trong sheet Agent')
  const dNoTarget = dailyCardData(snap, null)
  assert.strictEqual(dNoTarget.target, null, 'dailyCardData: khong muc tieu -> target null')
  assert.strictEqual(dNoTarget.pct, null, 'dailyCardData: khong muc tieu -> pct null')
  console.log(`=== dailyCardData 8.11: FYP 768,3 · Nop 1.688,3 · PH 735,8 · Top1 Trang 165,7 · Active ${d.activeCount}/${d.totalAgents} ===`)
}

// ── boardCardData ──
{
  const cases = buildCases(snap)
  const team = buildTeam(snap, cases)
  const listedRanked = rankAgents(team, 'ipNet').filter((a) => a.bar.total > 0 || num(a.fyp) > 0)
  const b = boardCardData(team, 'ipNet', 10)
  assert.strictEqual(b.modeLabel, 'IP phát hành', "boardCardData: modeLabel cua ipNet")
  assert.strictEqual(b.rows.length, Math.min(10, listedRanked.length), 'boardCardData: so hang = min(10, so TVV co so lieu)')
  assert.strictEqual(b.listedCount, listedRanked.length, 'boardCardData: listedCount khop rankAgents loc doc lap')
  b.rows.forEach((r, i) => {
    assert.strictEqual(r.rank, i + 1, 'boardCardData: rank lien tuc tu 1')
    assert.strictEqual(r.msdl, listedRanked[i].msdl, `boardCardData: hang ${i + 1} dung TVV theo rankAgents`)
    assert.ok(Math.abs(r.big - issuedOf(listedRanked[i])) < 1e-6, `boardCardData: hang ${i + 1} so to = issuedRow (che do ipNet — doi tu bar.total theo chot 10/11/2026)`)
    assert.strictEqual(r.bigLabel, 'IP phát hành', 'boardCardData: che do ipNet -> bigLabel "IP phát hành"')
    assert.strictEqual(r.bigIsFyc, false, 'boardCardData: che do ipNet -> bigIsFyc false')
  })
  assert.strictEqual(R1(b.rows[0].big), 165.7, `boardCardData: so to hang 1 che do ipNet = issuedRow cua Trang 165,7 (thuc te ${R1(b.rows[0].big)})`)
  // Che do barTotal: so to van = tong nop bar.total nhu man hinh
  const listedBar = rankAgents(team, 'barTotal').filter((a) => a.bar.total > 0 || num(a.fyp) > 0)
  const bb = boardCardData(team, 'barTotal', 10)
  assert.strictEqual(bb.modeLabel, 'Tổng nộp', "boardCardData: modeLabel cua barTotal")
  bb.rows.forEach((r, i) => {
    assert.strictEqual(r.msdl, listedBar[i].msdl, `boardCardData: hang ${i + 1} dung TVV theo rankAgents barTotal`)
    assert.ok(Math.abs(r.big - num(listedBar[i].bar.total)) < 1e-6, `boardCardData: hang ${i + 1} so to = bar.total (che do barTotal)`)
    assert.strictEqual(r.bigLabel, 'Tổng nộp', 'boardCardData: che do barTotal -> bigLabel "Tổng nộp"')
  })
  const bf = boardCardData(team, 'fyc', 10)
  assert.strictEqual(bf.modeLabel, 'FYC tháng', "boardCardData: modeLabel cua fyc")
  const maxFyc = Math.max(...Object.values(snap.data.agents).map((a) => num(a.fyc)))
  assert.ok(Math.abs(bf.rows[0].big - maxFyc) < 1e-6, 'boardCardData: che do fyc -> hang 1 co FYC cao nhat')
  assert.strictEqual(R1(bf.rows[0].big), 44.9, `boardCardData: FYC hang 1 = 44,9 (thuc te ${R1(bf.rows[0].big)})`)
  assert.ok(bf.rows.every((r) => r.bigIsFyc), 'boardCardData: che do fyc -> moi hang bigIsFyc')
  console.log(`=== boardCardData 8.11: ipNet top1 ${b.rows[0].name} · fyc top1 ${bf.rows[0].name} ${R1(bf.rows[0].big)}tr · ${b.rows.length} hang ===`)
}

// ── Helper nho ──
{
  assert.strictEqual(initialsOf('PHẠM THỊ MỸ TRANG'), 'MT', 'initialsOf: 2 tu cuoi cua ten')
  assert.strictEqual(initialsOf(''), '?', 'initialsOf: ten rong -> ?')
  assert.strictEqual(fmtDateVN('2026-11-08'), '08/11/2026', 'fmtDateVN cua shareCard')
  console.log('=== initialsOf / fmtDateVN dung ===')
}

// ── Component ton tai + nut bam o 2 man ──
{
  const share = read('../src/components/ShareCard.jsx')
  assert.ok(share.includes('export function DailyShareCard'), 'ShareCard.jsx: phai co DailyShareCard')
  assert.ok(share.includes('export function BoardShareCard'), 'ShareCard.jsx: phai co BoardShareCard')
  assert.ok(share.includes('export async function captureShareCard'), 'ShareCard.jsx: phai co captureShareCard (html2canvas)')
  assert.ok(share.includes('html2canvas'), 'ShareCard.jsx: phai dung html2canvas')
  assert.ok(share.includes('SharePreviewModal'), 'ShareCard.jsx: phai co modal xem truoc + tai xuong')
  const homNay = read('../src/components/HomNay.jsx')
  assert.ok(homNay.includes('📸 Tạo ảnh bản tin'), 'HomNay: phai co nut Tao anh ban tin')
  assert.ok(homNay.includes('DailyShareCard'), 'HomNay: phai render the anh ban tin an')
  const doiNgu = read('../src/components/DoiNgu.jsx')
  assert.ok(doiNgu.includes('📸 Tạo ảnh Bảng Vàng'), 'DoiNgu: phai co nut Tao anh Bang Vang')
  assert.ok(doiNgu.includes('BoardShareCard'), 'DoiNgu: phai render the anh Bang Vang an')
  console.log('=== ShareCard component + nut anh o Trang Chu/Tinh Anh — co du ===')
}

console.log('\n✅ TAT CA ASSERT DAT (test-share)')
