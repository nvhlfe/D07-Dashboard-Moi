// ─────────────────────────────────────────────────────────────
// parseDaily.js — Parse file Daily Sales (5 sheet) cho Dashboard D07 Moi.
// Port trung thuc tu parseWorkbook cua ban cu
// (d07-manmark-fix/.../src/components/TvvDailyTab.jsx, dong ~19-160).
// Cau truc 2 lop de test bang node duoc:
//   - parseWorkbook(wb): LOI thuan, nhan workbook object cua SheetJS.
//   - parseArrayBuffer(buf): doc ArrayBuffer -> workbook -> parseWorkbook.
// ─────────────────────────────────────────────────────────────
import * as XLSX from 'xlsx'

export const isValidCode = (v) => v !== null && v !== undefined && /^\d+$/.test(String(v).trim())
export const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n }
export const excelDateIntToISO = (v) => {
  if (v === null || v === undefined || v === '') return null
  const s = String(v)
  if (s.length === 8 && /^\d{8}$/.test(s)) return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8)
  return null
}
// Cot YearMonth doi khi bi Excel luu dang text (vd "202609") — ep kieu so de khong rot ca sheet
// (bai hoc ban cu: tung gay loi "0 TVV" o sheet Agent).
export const isYearMonth = (v) => {
  if (v === null || v === undefined || v === '') return false
  const n = Number(v)
  return !isNaN(n) && n > 200000 && n < 300000
}
export const sheetToRows = (wb, name) => {
  if (!wb.SheetNames.includes(name)) return null
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null, raw: true })
}

// ── CHUAN B (Lan chot 10/11/2026): parse GIU NGUYEN MOI DONG Proposal
// nhu file goc cong ty ghi — KHONG khu trung. File that co ho so bi cong ty
// ghi 2 dong cho 2 TVV khac nhau (dong ban/chuyen giao): Trang Chu dem theo
// DONG (chuan B) nen giu ca 2; Sales Report van dem theo ho so duy nhat qua
// buildCases (cases.js tu gop theo caseKey, khong phu thuoc parse).
// Dot khu trung o parse (sang 10/11) da bi bai bo cung ngay theo chuan B.

/** LOI: nhan workbook (SheetJS) -> { sheetStatus, proposalRows, agents, units, leaderUnits, pendingRows, pipelineRows } */
export function parseWorkbook(wb) {
  const sheetStatus = {}
  const proposalName = wb.SheetNames.includes('Proposal') ? 'Proposal' : (wb.SheetNames.includes('Export') ? 'Export' : null)
  const rawProposal = proposalName ? sheetToRows(wb, proposalName) : null
  const rawAgent = sheetToRows(wb, 'Agent')
  const rawLeader = sheetToRows(wb, 'Leader')
  const rawPending = sheetToRows(wb, 'Pending')
  const rawPipeline = sheetToRows(wb, 'Pipeline')
  sheetStatus.proposal = !!rawProposal; sheetStatus.agent = !!rawAgent; sheetStatus.leader = !!rawLeader
  sheetStatus.pending = !!rawPending; sheetStatus.pipeline = !!rawPipeline

  // --- Proposal (line-item) ---
  // Dong TOTAL / dong trong / dong footer ("Applied filters:...", "Total") tu bi loai
  // vi khong co Yearmonth hop le hoac khong co AGCode.
  const proposalRows = []
  for (const r of (rawProposal || [])) {
    if (!isYearMonth(r['Yearmonth']) || !r['AGCode']) continue
    const status = (r['PolicyStatus'] || '').toString().trim().toUpperCase()
    const statusGroup = status === 'IF' ? 'IF' : status === 'PS' ? 'PS' : 'OTHER'
    proposalRows.push({
      unit: r['UnitCode'] || '', msdl: String(r['AGCode']), agName: r['AGName'] || '',
      proposalNum: r['ProposalNum'] ? String(r['ProposalNum']) : '',
      status, statusGroup, statusFull: r['CurrentPolicyStatus'] || '',
      product: r['Remarked_ProductNameVN'] || r['ProductCode'] || '',
      proposalDate: excelDateIntToISO(r['ProposalDate']),
      firstIssuedDate: excelDateIntToISO(r['FirstIssuedDate']),
      caseSub: num(r['Case Sub (IF-PS)']), ipSub: num(r['IP Sub']), ipNet: num(r['IP Net']),
      apeSub: num(r['APE Sub (IF-PS)']), apeNet: num(r['APE Net']),
      policyNum: r['PolicyNum'] ? String(r['PolicyNum']) : '',
    })
  }
  // Dem cIF/cPS/cOther cho Agent o duoi dem theo DONG (chuan B): moi dong
  // Proposal trong file goc tinh 1 lan cho TVV ghi tren dong do.

  // --- Agent (TVV level) ---
  const agents = {}
  for (const r of (rawAgent || [])) {
    if (!isYearMonth(r['YearMonth']) || !r['AGCode']) continue
    const msdl = String(r['AGCode'])
    // TLDTPTT (ty le duy tri): so % TRUC TIEP trong file (vd 93.2 = 93,2%).
    // Nhieu TVV khong co gia tri (file 25.10 chi 106/547) -> giu null de UI
    // hien "—", KHONG ep ve 0 (0% se gay hieu nham la duy tri 0%).
    const rawTldt = r['TLDTPTT']
    const tldtptt = rawTldt !== null && rawTldt !== undefined && rawTldt !== '' && Number.isFinite(Number(rawTldt))
      ? Number(rawTldt)
      : null
    agents[msdl] = {
      unit: r['UnitCode'] || '', leaderCode: r['LeaderCode'] ? String(r['LeaderCode']) : '',
      msdl, agName: r['AGName'] || '', agSeg: r['AGSegName'] || '',
      ipSub: num(r['IP Sub']), caseSub: num(r['Case Sub']), fyp: num(r['FYP']),
      ipNet: num(r['IP Net']), caseNet: num(r['Case Net']), fyc: num(r['FYC']),
      level: r['AGLevel'] || '', apeNet: num(r['APE Net']), netMp: num(r['Net Manpower']),
      actFyc: num(r['Active Net (FYC)']), actCase: num(r['Active Net (Case)']),
      fypYtd: num(r['FYP YTD']), fycYtd: num(r['FYC YTD']),
      fycQtd: num(r['FYC QTD']), fycL12m: num(r['FYC L12M']), tldtptt,
      cIF: 0, cPS: 0, cOther: 0,
    }
  }
  for (const p of proposalRows) {
    if (!agents[p.msdl]) continue
    if (p.statusGroup === 'IF') agents[p.msdl].cIF++
    else if (p.statusGroup === 'PS') agents[p.msdl].cPS++
    else agents[p.msdl].cOther++
  }

  // --- Leader (Unit level) ---
  const units = {}
  // leaderUnits: tap UnitCode CO TRONG sheet Leader (dong hop le) — muc
  // Phong chi liet ke cac Unit nay (Unit co truong phong chinh thuc);
  // Unit chi xuat hien o sheet Agent se bi loc khoi muc Phong.
  const leaderUnits = []
  for (const r of (rawLeader || [])) {
    if (!isYearMonth(r['YearMonth']) || !r['UnitCode']) continue
    const unitCode = r['UnitCode']
    if (!leaderUnits.includes(unitCode)) leaderUnits.push(unitCode)
    // activeFycUnit: cot '#Active Agent (FYC) Unit' (cot BD sheet Leader) —
    // so TVV Active theo FYC cua Unit theo so lieu cong ty. O TRONG trong
    // file (rat pho bien dau thang) -> giu null de UI hien "–", TUYET DOI
    // khong ep ve 0 (0 luot la mot khang dinh khac han "chua co so").
    const rawActFyc = r['#Active Agent (FYC) Unit']
    const activeFycUnit = rawActFyc !== null && rawActFyc !== undefined && rawActFyc !== '' && Number.isFinite(Number(rawActFyc))
      ? Number(rawActFyc)
      : null
    units[unitCode] = {
      unit: unitCode, leaderName: r['LeaderName'] || '',
      // LeaderCode = MSDL cua truong Unit (sheet Leader co cot nay, da doi
      // chieu file that 25.10: 21/21 LeaderCode trung AGCode cua 1 agent
      // co AGLevel UM/BM) — dung nhan dien UM/BM cho quyen xem muc Phong.
      leaderCode: r['LeaderCode'] ? String(r['LeaderCode']) : '',
      agSeg: r['AGSegName'] || '',
      manpower: num(r['#Manpower']),
      caseSubUnit: num(r['Case Sub Unit']), caseNetUnit: num(r['Case Net Unit']),
      apeSubUnit: num(r['APE Sub Unit']), apeNetUnit: num(r['APE Net Unit']),
      activeFycUnit,
      ipSubUnit: 0, ipNetUnit: 0, cIF: 0, cPS: 0, cOther: 0,
    }
  }
  for (const msdl in agents) {
    const a = agents[msdl]
    if (!units[a.unit]) units[a.unit] = { unit: a.unit, leaderName: '', leaderCode: '', agSeg: '', manpower: 0, caseSubUnit: 0, caseNetUnit: 0, apeSubUnit: 0, apeNetUnit: 0, activeFycUnit: null, ipSubUnit: 0, ipNetUnit: 0, cIF: 0, cPS: 0, cOther: 0 }
    const u = units[a.unit]
    u.ipSubUnit += a.ipSub; u.ipNetUnit += a.ipNet
    u.cIF += a.cIF; u.cPS += a.cPS; u.cOther += a.cOther
  }

  // --- Pending (chi tiet ho so PS) ---
  const reqFields = ['Accept Letter', 'Compliance', 'Internal Pending', 'Medical Check', 'Medical Info', 'Personal Info', 'IndependentCall', 'Voice Recording']
  const pendingRows = []
  for (const r of (rawPending || [])) {
    if (!isValidCode(r['AGCode']) || !r['ProposalNum']) continue
    const requirements = reqFields
      .filter((f) => r[f] !== null && r[f] !== undefined && String(r[f]).trim() !== '')
      .map((f) => ({ name: f, detail: String(r[f]).slice(0, 200) }))
    pendingRows.push({
      unit: r['UnitCode'] || '', msdl: String(r['AGCode']), agName: r['AGName'] || '',
      proposalNum: String(r['ProposalNum']), policyNum: r['PolicyNum'] ? String(r['PolicyNum']) : '',
      proposalDate: excelDateIntToISO(r['ProposalDate']),
      product: r['ProductNameVN'] || r['BasicProductCode'] || '', ape: num(r['APE (mil)']),
      poName: r['POName'] || '', description: r['Description'] || '',
      classify: r['Classify'] || '', requirements,
    })
  }

  // --- Pipeline (chua dong phi) ---
  const pipelineRows = []
  for (const r of (rawPipeline || [])) {
    if (!isValidCode(r['AGCode']) || !r['ProposalNum']) continue
    pipelineRows.push({
      unit: r['UnitCode'] || '', msdl: String(r['AGCode']), agName: r['AGName'] || '',
      proposalNum: String(r['ProposalNum']), policyNum: r['PolicyNum'] ? String(r['PolicyNum']) : '',
      proposalDate: excelDateIntToISO(r['ProposalDate']),
      product: r['ProductNameVN'] || r['BasicProductCode'] || '', ape: num(r['APE (mil)']),
      poName: r['PO_Name'] || '', description: r['Description'] || '', classify: r['Classify'] || '',
    })
  }

  return { sheetStatus, proposalRows, agents, units, leaderUnits, pendingRows, pipelineRows }
}

/** Doc ArrayBuffer (trinh duyet / node) -> parse. */
export function parseArrayBuffer(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false })
  return parseWorkbook(wb)
}

/** Suy ngay du lieu tu ten file: Daily_Sales_25.10.xlsx -> { day:25, month:10 } (nam lay theo nam hien tai cua file: dung nam cua ngay snapshot gan nhat — o day tra ve thang/ngay, nam do UI quyet dinh). */
export function inferDateFromFileName(name) {
  const m = String(name || '').match(/(\d{1,2})[.\-_](\d{1,2})(?:[.\-_](\d{2,4}))?/)
  if (!m) return null
  const day = Number(m[1]); const month = Number(m[2])
  if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12)) return null
  let year = m[3] ? Number(m[3]) : new Date().getFullYear()
  if (year < 100) year += 2000
  const p = (n) => String(n).padStart(2, '0')
  return `${year}-${p(month)}-${p(day)}`
}
