// Test parse bang file Daily Sales THAT (node): chay LOI parseWorkbook tren workbook
// doc bang SheetJS, in so lieu + KPI So San Luong cho file 25.10.
// Chay: node scripts/test-parse.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { analyzeSoSanLuong } from '../src/lib/analyze.js'

function loadAndParse(path) {
  const buf = readFileSync(path)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false })
  return parseWorkbook(wb)
}

function summarize(label, path, snapDate) {
  const p = loadAndParse(path)
  const agents = Object.values(p.agents)
  const fypTotal = agents.reduce((s, a) => s + (a.fyp || 0), 0)
  console.log(`\n=== ${label} (${path}) ===`)
  console.log('Sheets:', JSON.stringify(p.sheetStatus))
  console.log(`TVV (agents): ${agents.length}`)
  console.log(`Units: ${Object.keys(p.units).length}`)
  console.log(`Proposal rows: ${p.proposalRows.length}`)
  console.log(`Pending rows: ${p.pendingRows.length}`)
  console.log(`Pipeline rows: ${p.pipelineRows.length}`)
  console.log(`Tong FYP (agents): ${Math.round(fypTotal * 10) / 10} tr`)
  // APE Sub/Net tren Proposal + PolicyNum tren Pending/Pipeline (dot chieu 08/11)
  const apeSubTotal = p.proposalRows.reduce((s, r) => s + (Number(r.apeSub) || 0), 0)
  const pendWithPolicy = p.pendingRows.filter((r) => r.policyNum).length
  const pipeWithPolicy = p.pipelineRows.filter((r) => r.policyNum).length
  console.log(`Tong APE Sub (Proposal): ${Math.round(apeSubTotal * 10) / 10} tr · Pending co PolicyNum: ${pendWithPolicy}/${p.pendingRows.length} · Pipeline co PolicyNum: ${pipeWithPolicy}/${p.pipelineRows.length}`)
  assert.ok(p.proposalRows.every((r) => typeof r.apeSub === 'number' && typeof r.apeNet === 'number'), 'proposalRows phai co apeSub/apeNet la so')
  assert.ok(p.pendingRows.every((r) => typeof r.policyNum === 'string') && p.pipelineRows.every((r) => typeof r.policyNum === 'string'), 'pendingRows/pipelineRows phai co truong policyNum (string)')
  if (label.includes('25.10')) {
    assert.ok(apeSubTotal > 0, 'Tong APE Sub file 25.10 phai > 0')
    assert.ok(pendWithPolicy > 0, 'Pending file 25.10 phai co dong co PolicyNum')
    // LUU Y du lieu that 25.10: sheet Pipeline CO cot PolicyNum nhung TRONG
    // toan bo (29/29 dong tho) — ho so chua len phi chua co so Policy.
    // Chi assert truong ton tai, khong assert > 0 cho Pipeline o file nay.
    assert.strictEqual(pipeWithPolicy, 0, 'Pipeline file 25.10: cot PolicyNum ton tai nhung chua co gia tri (khop du lieu tho)')
  }
  if (snapDate) {
    const [y, m] = snapDate.split('-').map(Number)
    const doc = { id: snapDate, data: { agents: p.agents, units: p.units, proposalRows: p.proposalRows, pendingRows: p.pendingRows, pipelineRows: p.pipelineRows } }
    const r = analyzeSoSanLuong([doc], [], { year: y, month: m })
    const t = r.totals
    console.log(`-- KPI So San Luong thang ${m}/${y} (snapshot ${snapDate}, khong co thang truoc de tru CF) --`)
    console.log(`Nop: ${t.nopN} HS · ${(Math.round((t.subIp + t.pipeApe) * 10) / 10)} tr (da len phi ${t.subN} HS/${Math.round(t.subIp * 10) / 10} tr + chua len phi ${t.pipeN} HS/${Math.round(t.pipeApe * 10) / 10} tr)`)
    console.log(`Phat hanh gop: ${t.issN} HD · ${Math.round(t.issIp * 10) / 10} tr | Rong: ${t.netN} HD · ${Math.round(t.netIp * 10) / 10} tr`)
    console.log(`Pending: ${t.pendN} HS · ${Math.round(t.pendIp * 10) / 10} tr`)
    console.log(`IF: ${t.ifN} · PS: ${t.psN} · Khac: ${t.otherN}`)
    console.log(`Ty le phat hanh: ${t.rate === null ? '—' : Math.round(t.rate * 100) + '%'}`)
    console.log('Top phat hanh rong:', r.topNet.map((a) => `${a.name} (${a.unit}) ${Math.round(a.netIp * 10) / 10}tr`).join(' | ') || '(khong co)')
    const heat = {}
    p.proposalRows.forEach((r2) => { if (r2.proposalDate) heat[r2.proposalDate] = (heat[r2.proposalDate] || 0) + 1 })
    console.log('Nop theo ngay (proposalDate):', Object.entries(heat).sort().map(([d, c]) => `${d}:${c}`).join(' '))
  }
  return p
}

summarize('Daily 25.10', process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx', '2026-10-25')
summarize('Daily 11.10', process.env.HOME + '/workspace/user/files/Daily_Sales_11.10.xlsx', null)
