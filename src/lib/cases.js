// ─────────────────────────────────────────────────────────────
// cases.js — Sales Report kieu NHAT KY TUNG HO SO (Dashboard D07 Moi).
// Logic THUAN (khong React / DOM / localStorage) de test bang node duoc.
//
// Nguon: snapshot Daily Sales moi nhat cua thang (proposalRows ∪ pendingRows
// ∪ pipelineRows, khoa theo so HSYC proposalNum).
//
// CO CHE CAP NHAT (Lan chot 08/11/2026 — THAY THE lop dieu chinh tay truoc
// day): muon cap nhat trang thai/IP ho so thi DAY FILE MOI (file Daily Sales
// day du, hoac file Proposal rieng) o tab Nap du lieu — nhu Sales Report ban
// cu. Khong con chinh tay tung ho so. Panel "Thay doi so voi ban truoc" o
// Sales Report dung diffCases de thong bao nhung thay doi giua 2 snapshot.
//
// KHOA HO SO: ho so Phat hanh (IF) / Pending (PS) lay theo SO POLICY
// (policyNum) — xem caseKey. Viec doi chieu giua 2 ban (diffCases) cung khop
// theo policyNum truoc, proposalNum sau.
//
// Trang thai (ma noi bo) — truong effective* = base* (khong con ghi de):
//   'IF'       = Phat hanh
//   'PS'       = Pending
//   'PIPELINE' = Chua len phi
//   'OTHER'    = Khac (PO/DC/WD/CF...)
// Don vi tien: trieu dong (nhu du lieu Daily).
// ─────────────────────────────────────────────────────────────

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const str = (v) => (v === null || v === undefined ? '' : String(v))

export const STATUS_CODES = ['IF', 'PS', 'PIPELINE', 'OTHER']
export const STATUS_LABELS = {
  IF: 'Phát hành',
  PS: 'Pending',
  PIPELINE: 'Chưa lên phí',
  OTHER: 'Khác',
}

function daysBetween(isoFrom, isoTo) {
  if (!isoFrom || !isoTo) return null
  const a = new Date(`${isoFrom}T00:00:00`)
  const b = new Date(`${isoTo}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  return Math.round((b - a) / 86400000)
}

export function ageBucketOf(ageDays) {
  if (ageDays === null || ageDays === undefined || !Number.isFinite(ageDays)) return null
  if (ageDays <= 3) return '0–3'
  if (ageDays <= 7) return '4–7'
  if (ageDays <= 14) return '8–14'
  return '>14'
}

/**
 * Khoa dinh danh ho so: ho so Phat hanh (IF) hoac Pending (PS) ma co so
 * Policy thi khoa theo PolicyNumber ('PN:...'); con lai theo so HSYC
 * ('HS:...'). Lan chot: HS phat hanh/Pending lay theo so PolicyNumber.
 */
export function caseKey(c) {
  const pn = str(c?.policyNum).trim()
  if (pn && (c.baseStatus === 'IF' || c.baseStatus === 'PS')) return `PN:${pn}`
  return `HS:${str(c?.proposalNum)}`
}

/**
 * Gop snapshot thanh danh sach HO SO (key = proposalNum).
 * snapshot: { id: 'yyyy-mm-dd', data } (doc daily_sales_tvv) — hoac raw data
 * kem truong snapshotDate.
 * Ho so khong co so HSYC (proposalNum rong) bi bo qua (khong khoa duoc).
 */
export function buildCases(snapshot) {
  const data = (snapshot && snapshot.data) || snapshot || {}
  const asOf = (snapshot && (snapshot.id || snapshot.date)) || data.snapshotDate || null
  const map = new Map()
  const ensure = (proposalNum) => {
    const key = str(proposalNum)
    if (!key) return null
    if (!map.has(key)) {
      map.set(key, {
        proposalNum: key, msdl: '', agName: '', unit: '',
        proposalDate: null, firstIssuedDate: null,
        status: '', statusFull: '', product: '', policyNum: '',
        baseStatus: 'OTHER', ipSub: 0, ipNet: 0, ape: 0,
        pendingReasons: [], reasonDetails: [],
        description: '', classify: '', poName: '',
        inPipeline: false, inPendingSheet: false, inProposal: false,
        ageDays: null, ageBucket: null,
        adjustment: null, adjusted: false, adjustmentStale: false,
        adjNote: '', effectiveStatus: 'OTHER', effectiveIpNet: 0,
      })
    }
    return map.get(key)
  }
  const fillIdentity = (c, r) => {
    if (!c.msdl && r.msdl) c.msdl = str(r.msdl)
    if (!c.agName && r.agName) c.agName = r.agName
    if (!c.unit && r.unit) c.unit = r.unit
    if (!c.product && r.product) c.product = r.product
    if (!c.proposalDate && r.proposalDate) c.proposalDate = r.proposalDate
  }

  // 1) Proposal — nguon trang thai chinh.
  // LUU Y du lieu that (file 25.10): sheet Proposal co 21 so HSYC xuat hien
  // 2 dong TRUNG Y HET (cung trang thai, IP, ngay) — dem theo DONG nhu
  // analyze se trung cac ho so nay. Nhat ky theo HO SO nen chi lay dong
  // dau tien cua moi so HSYC (cac dong trung bo qua, khong cong don IP).
  for (const p of data.proposalRows || []) {
    const c = ensure(p.proposalNum)
    if (!c) continue
    if (c.inProposal) continue // dong trung cua cung 1 ho so
    c.inProposal = true
    fillIdentity(c, p)
    c.status = p.status || ''
    c.statusFull = p.statusFull || ''
    c.policyNum = p.policyNum || ''
    c.firstIssuedDate = p.firstIssuedDate || null
    c.baseStatus = p.statusGroup === 'IF' ? 'IF' : p.statusGroup === 'PS' ? 'PS' : 'OTHER'
    c.ipSub = num(p.ipSub)
    c.ipNet = num(p.ipNet)
  }

  // 2) Sheet Pending — bo sung ly do cho + ho so chi co o sheet nay = PS
  for (const r of data.pendingRows || []) {
    const c = ensure(r.proposalNum)
    if (!c) continue
    c.inPendingSheet = true
    if (!c.policyNum && r.policyNum) c.policyNum = r.policyNum
    fillIdentity(c, r)
    if (!c.inProposal) {
      c.baseStatus = 'PS'
      c.status = 'PS'
      c.ipSub = num(r.ape) // sheet Pending chi co APE (mil) — dung lam IP Sub tham chieu nhu analyze.js
    }
    if ((r.requirements || []).length) {
      c.reasonDetails = r.requirements
      c.pendingReasons = r.requirements.map((x) => x.name)
    }
    if (r.ape) c.ape = num(r.ape)
    if (r.description) c.description = r.description
    if (r.classify) c.classify = r.classify
    if (r.poName) c.poName = r.poName
  }

  // 3) Sheet Pipeline — chua len phi (ho so chi co o day = PIPELINE)
  for (const r of data.pipelineRows || []) {
    const c = ensure(r.proposalNum)
    if (!c) continue
    c.inPipeline = true
    if (!c.policyNum && r.policyNum) c.policyNum = r.policyNum
    fillIdentity(c, r)
    if (!c.inProposal && !c.inPendingSheet) {
      c.baseStatus = 'PIPELINE'
      c.status = 'Pipeline'
    }
    if (r.ape) c.ape = num(r.ape)
    if (!c.description && r.description) c.description = r.description
    if (!c.classify && r.classify) c.classify = r.classify
    if (!c.poName && r.poName) c.poName = r.poName
  }

  // 4) Tuoi ho so. Khong con lop dieu chinh tay: effective* = base*,
  // adjustment/adjusted/adjustmentStale/adjNote giu co dinh de cac noi
  // dang dung cac truong nay khong vo (luon "chua dieu chinh").
  const out = []
  for (const c of map.values()) {
    c.ageDays = daysBetween(c.proposalDate, asOf)
    c.ageBucket = ageBucketOf(c.ageDays)
    c.adjustment = null
    c.adjusted = false
    c.adjustmentStale = false
    c.adjNote = ''
    c.effectiveStatus = c.baseStatus
    c.effectiveIpNet = c.ipNet
    out.push(c)
  }
  // Sap xep mac dinh: ngay nop moi nhat truoc, cung ngay thi theo so HSYC
  out.sort((a, b) => String(b.proposalDate || '').localeCompare(String(a.proposalDate || '')) || a.proposalNum.localeCompare(b.proposalNum))
  return out
}

/**
 * Doi chieu 2 ban ho so (snapshot truoc -> snapshot moi) de bao thay doi.
 * Khop ho so theo POLICY NUMBER truoc (ho so IF/PS co PolicyNum), roi moi
 * den proposalNum (so HSYC). Tra:
 *   added:         ho so chi co o ban MOI
 *   removed:       ho so chi co o ban CU (khong con trong ban moi)
 *   becameIssued:  truoc chua phai IF -> sau la IF
 *   becamePending: truoc chua phai PS -> sau la PS
 *   statusChanged: [{ c, from, to }] doi trang thai con lai (khong tinh 2 nhom tren)
 *   unchanged:     so ho so khop nhau va giu nguyen trang thai (baseStatus)
 */
export function diffCases(prevCases, nextCases) {
  const prev = prevCases || []
  const next = nextCases || []
  const byPolicy = new Map()
  const byProposal = new Map()
  for (const c of next) {
    const pn = str(c.policyNum).trim()
    if (pn && !byPolicy.has(pn)) byPolicy.set(pn, c)
    const hs = str(c.proposalNum)
    if (hs && !byProposal.has(hs)) byProposal.set(hs, c)
  }
  const matched = new Set()
  const added = []
  const removed = []
  const becameIssued = []
  const becamePending = []
  const statusChanged = []
  let unchanged = 0
  for (const p of prev) {
    const pn = str(p.policyNum).trim()
    let n = pn ? byPolicy.get(pn) : undefined
    if (!n) n = byProposal.get(str(p.proposalNum))
    if (!n || matched.has(n)) { removed.push(p); continue }
    matched.add(n)
    const from = p.baseStatus
    const to = n.baseStatus
    if (from === to) unchanged += 1
    else if (to === 'IF') becameIssued.push(n)
    else if (to === 'PS') becamePending.push(n)
    else statusChanged.push({ c: n, from, to })
  }
  for (const n of next) if (!matched.has(n)) added.push(n)
  return { added, removed, becameIssued, becamePending, statusChanged, unchanged }
}

/**
 * Nhat ky 1 ngay: nop hom do / phat hanh hom do / trong so nop hom do dang pending.
 * "Nop" o day = ho so tren sheet Proposal (da len phi IF/PS + nhom khac) — cung
 * tap dong Proposal voi heatmap "Nhip nop theo ngay" o man Hinh Hom Nay (heatmap
 * nay tong APE Sub cua cac dong nay) de 2 man hinh khong lech nhau. Ho so chi co
 * o sheet Pipeline (chua len phi) nop trong ngay duoc tach rieng o
 * submittedPipeline de UI hien bo sung.
 * (Doi chieu file 25.10: ngay 25/10 co 4 Proposal + 4 Pipeline nop moi.)
 */
export function journalForDay(cases, yyyyMmDd) {
  const list = cases || []
  const submitted = list.filter((c) => c.inProposal && c.proposalDate === yyyyMmDd)
  const submittedPipeline = list.filter((c) => !c.inProposal && c.inPipeline && c.proposalDate === yyyyMmDd)
  const issued = list.filter((c) => c.firstIssuedDate === yyyyMmDd && num(c.effectiveIpNet) > 0)
  const submittedPending = submitted.filter((c) => c.effectiveStatus === 'PS')
  return { submitted, submittedPipeline, issued, submittedPending }
}

/** Tong hop theo trang thai HIEU LUC + danh sach pending sap xep cu nhat truoc. */
export function summarizeCases(cases) {
  const byStatus = {}
  for (const code of STATUS_CODES) byStatus[code] = { n: 0, ipNet: 0, ipSub: 0 }
  const list = cases || []
  for (const c of list) {
    const b = byStatus[c.effectiveStatus] || byStatus.OTHER
    b.n += 1
    b.ipNet += num(c.effectiveIpNet)
    b.ipSub += num(c.ipSub)
  }
  const pending = list
    .filter((c) => c.effectiveStatus === 'PS')
    .slice()
    .sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1) || String(a.proposalDate || '').localeCompare(String(b.proposalDate || '')))
  return { total: list.length, byStatus, pending }
}
