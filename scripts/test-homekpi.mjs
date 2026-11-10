// Test lib/homeKpi.js (CHUAN B — Lan chot 10/11/2026) bang file Daily Sales THAT:
// parse bang parseDaily (SAU khi go khu trung o parse) -> homeKpi dem theo DONG
// -> so voi so neo tinh DOC LAP bang openpyxl doc thang file Excel tho
// (cong tho theo dung dinh nghia chuan B, lam tron 0,1tr):
//   8.11 : Proposal 58 dong · Pipeline 23 dong · FYP 768,3
//          Nop 81 HS / IP 1.688,3 / APE 1.697,0 · Phat hanh 37 HD / 735,8
//          Pending 21 HS / APE 337,5 · Chua len phi 23 HS / APE 615,0
//   25.10: Proposal 182 dong · Pipeline 27 dong · FYP 1.761,6
//          Nop 209 HS / IP 3.236,5 / APE 2.826,2 · Phat hanh 113 HD / 1.695,0
//          Pending 50 HS / APE 780,1 · Chua len phi 27 HS / APE 295,0
// Chay: node scripts/test-homekpi.mjs
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { parseWorkbook } from '../src/lib/parseDaily.js'
import { homeKpi, topIssuedByRow } from '../src/lib/homeKpi.js'

const R1 = (x) => Math.round(x * 10) / 10

function loadAndParse(path) {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
  return parseWorkbook(wb)
}

function check(label, path, exp) {
  const p = loadAndParse(path)
  assert.strictEqual(p.proposalRows.length, exp.propRows, `${label}: proposalRows sau parse (chuan B, giu moi dong) phai = ${exp.propRows}`)
  assert.strictEqual(p.pipelineRows.length, exp.pipeRows, `${label}: pipelineRows phai = ${exp.pipeRows}`)
  const k = homeKpi(p)
  assert.strictEqual(R1(k.fyp), exp.fyp, `${label}: FYP phai = ${exp.fyp}tr (thuc te ${R1(k.fyp)})`)
  assert.strictEqual(k.nop.n, exp.nop.n, `${label}: Nop so HS phai = ${exp.nop.n}`)
  assert.strictEqual(R1(k.nop.ip), exp.nop.ip, `${label}: Nop IP phai = ${exp.nop.ip}tr (thuc te ${R1(k.nop.ip)})`)
  assert.strictEqual(R1(k.nop.ape), exp.nop.ape, `${label}: Nop APE phai = ${exp.nop.ape}tr (thuc te ${R1(k.nop.ape)})`)
  assert.strictEqual(k.phatHanh.n, exp.phatHanh.n, `${label}: Phat hanh so HD phai = ${exp.phatHanh.n}`)
  assert.strictEqual(R1(k.phatHanh.ip), exp.phatHanh.ip, `${label}: Phat hanh IP Net phai = ${exp.phatHanh.ip}tr (thuc te ${R1(k.phatHanh.ip)})`)
  assert.strictEqual(k.pending.n, exp.pending.n, `${label}: Pending so HS phai = ${exp.pending.n}`)
  assert.strictEqual(R1(k.pending.ape), exp.pending.ape, `${label}: Pending APE phai = ${exp.pending.ape}tr (thuc te ${R1(k.pending.ape)})`)
  assert.strictEqual(k.chuaLenPhi.n, exp.chuaLenPhi.n, `${label}: Chua len phi so HS phai = ${exp.chuaLenPhi.n}`)
  assert.strictEqual(R1(k.chuaLenPhi.ape), exp.chuaLenPhi.ape, `${label}: Chua len phi APE phai = ${exp.chuaLenPhi.ape}tr (thuc te ${R1(k.chuaLenPhi.ape)})`)
  // Top phat hanh theo dong: giam dan, ip > 0, nguoi dung dau khop cong tay
  // tu chinh proposalRows (tong ipNet cac dong IF cua TVV do).
  const top = topIssuedByRow(p, 5)
  assert.ok(top.length >= 1 && top.length <= 5, `${label}: top phat hanh phai co 1-5 TVV`)
  assert.ok(top.every((a) => a.ip > 0), `${label}: top phat hanh: moi TVV phai co ip > 0`)
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1].ip >= top[i].ip, `${label}: top phat hanh phai sap giam dan`)
  const manualTop1 = p.proposalRows
    .filter((r) => r.statusGroup === 'IF' && String(r.msdl) === top[0].msdl)
    .reduce((s, r) => s + (Number(r.ipNet) || 0), 0)
  assert.ok(Math.abs(manualTop1 - top[0].ip) < 1e-6, `${label}: top 1 phat hanh phai = tong ipNet IF cua TVV do`)
  console.log(`=== ${label}: Nop ${k.nop.n} HS · IP ${R1(k.nop.ip)} / APE ${R1(k.nop.ape)} tr · PH ${k.phatHanh.n} HD / ${R1(k.phatHanh.ip)} tr · Pend ${k.pending.n} HS / ${R1(k.pending.ape)} tr · Pipe ${k.chuaLenPhi.n} HS / ${R1(k.chuaLenPhi.ape)} tr · Top1: ${top[0].name} ${R1(top[0].ip)}tr ===`)
}

check('Daily 8.11', process.env.HOME + '/workspace/user/files/Daily_Sales_8.11.xlsx', {
  propRows: 58, pipeRows: 23, fyp: 768.3,
  nop: { n: 81, ip: 1688.3, ape: 1697.0 },
  phatHanh: { n: 37, ip: 735.8 },
  pending: { n: 21, ape: 337.5 },
  chuaLenPhi: { n: 23, ape: 615.0 },
})
check('Daily 25.10', process.env.HOME + '/workspace/user/files/Daily_Sales_25.10.xlsx', {
  propRows: 182, pipeRows: 27, fyp: 1761.6,
  nop: { n: 209, ip: 3236.5, ape: 2826.2 },
  phatHanh: { n: 113, ip: 1695.0 },
  pending: { n: 50, ape: 780.1 },
  chuaLenPhi: { n: 27, ape: 295.0 },
})

// Du lieu rong/thieu -> 0 het, khong nem loi
{
  const k = homeKpi(null)
  assert.deepStrictEqual(k, { fyp: 0, nop: { n: 0, ip: 0, ape: 0 }, phatHanh: { n: 0, ip: 0 }, pending: { n: 0, ape: 0 }, chuaLenPhi: { n: 0, ape: 0 } })
  assert.deepStrictEqual(topIssuedByRow(null), [])
  console.log('=== homeKpi/topIssuedByRow voi data null -> 0/rong, khong loi ===')
}

console.log('\n✅ homeKpi CHUAN B khop so neo doc lap (openpyxl) tren ca 2 file that')
