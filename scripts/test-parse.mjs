// Test parse bang file Daily Sales THAT (node): chay LOI parseWorkbook tren workbook
// doc bang SheetJS, in so lieu + KPI So San Luong cho file 25.10.
// Chay: node scripts/test-parse.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
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
