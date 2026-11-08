// ─────────────────────────────────────────────────────────────
// cases.js — Sales Report kieu NHAT KY TUNG HO SO (Dashboard D07 Moi).
// Logic THUAN (khong React / DOM / localStorage) de test bang node duoc.
//
// Nguon: snapshot Daily Sales moi nhat cua thang (proposalRows ∪ pendingRows
// ∪ pipelineRows, khoa theo so HSYC proposalNum) + LOP DIEU CHINH rieng
// (adjustments: { [proposalNum]: { status, ipNet, note, updatedAt, updatedBy } }).
//
// Trang thai (ma noi bo):
//   'IF'       = Phat hanh
//   'PS'       = Pending
//   'PIPELINE' = Chua len phi
//   'OTHER'    = Khac (PO/DC/WD/CF...)
//
// Dieu chinh: chi ghi de khi CHUA "stale". Dieu chinh stale = snapshot goc
// da cap nhat khop dung gia tri da chinh (he thong da theo kip) → khong
// con ghi de nua, UI bao "He thong da cap nhat khop" thay vi "Da chinh tay".
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

/** Chuan hoa trang thai trong adjustment (chap nhan ca ma 'IF' lan nhan tieng Viet). */
export function normalizeAdjStatus(s) {
  if (!s) return null
  const v = String(s).trim()
  if (STATUS_CODES.includes(v)) return v
  const found = Object.entries(STATUS_LABELS).find(([, label]) => label === v)
  return found ? found[0] : null
}

/**
 * Xet dieu chinh cua 1 ho so voi gia tri GOC trong snapshot.
 * Tra { adjusted, stale, adjStatus, adjIpNet }.
 * - overrideFields: cac truong dieu chinh thuc su ghi de gia tri (status / ipNet).
 * - stale: co override, va MOI override deu da bang gia tri goc hien tai.
 * - note-only: ghi chu nhat ky, khong ghi de gia tri → khong bao gio stale.
 */
export function evaluateAdjustment(adj, baseStatus, baseIpNet) {
  if (!adj || typeof adj !== 'object') {
    return { adjusted: false, stale: false, adjStatus: null, adjIpNet: null }
  }
  const adjStatus = normalizeAdjStatus(adj.status)
  const hasIp = adj.ipNet !== null && adj.ipNet !== undefined && adj.ipNet !== '' && Number.isFinite(Number(adj.ipNet))
  const adjIpNet = hasIp ? Number(adj.ipNet) : null
  const overrides = []
  if (adjStatus) overrides.push(adjStatus === baseStatus)
  if (hasIp) overrides.push(adjIpNet === num(baseIpNet))
  const stale = overrides.length > 0 && overrides.every(Boolean)
  const hasAny = !!adjStatus || hasIp || (adj.note !== null && adj.note !== undefined && String(adj.note).trim() !== '')
  return { adjusted: hasAny, stale, adjStatus, adjIpNet }
}

/**
 * Gop snapshot thanh danh sach HO SO (key = proposalNum).
 * snapshot: { id: 'yyyy-mm-dd', data } (doc daily_sales_tvv) — hoac raw data
 * kem truong snapshotDate. adjustments: { [proposalNum]: {...} }.
 * Ho so khong co so HSYC (proposalNum rong) bi bo qua (khong khoa duoc).
 */
export function buildCases(snapshot, adjustments = {}) {
  const data = (snapshot && snapshot.data) || snapshot || {}
  const asOf = (snapshot && (snapshot.id || snapshot.date)) || data.snapshotDate || null
  const adjs = adjustments && typeof adjustments === 'object' ? adjustments : {}
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

  // 4) Tuoi ho so + ap lop dieu chinh
  const out = []
  for (const c of map.values()) {
    c.ageDays = daysBetween(c.proposalDate, asOf)
    c.ageBucket = ageBucketOf(c.ageDays)
    const adj = adjs[c.proposalNum] || null
    c.adjustment = adj
    const ev = evaluateAdjustment(adj, c.baseStatus, c.ipNet)
    c.adjusted = ev.adjusted
    c.adjustmentStale = ev.stale
    c.adjNote = adj && adj.note ? String(adj.note) : ''
    if (adj && !ev.stale) {
      c.effectiveStatus = ev.adjStatus || c.baseStatus
      c.effectiveIpNet = ev.adjIpNet !== null ? ev.adjIpNet : c.ipNet
    } else {
      c.effectiveStatus = c.baseStatus
      c.effectiveIpNet = c.ipNet
    }
    out.push(c)
  }
  // Sap xep mac dinh: ngay nop moi nhat truoc, cung ngay thi theo so HSYC
  out.sort((a, b) => String(b.proposalDate || '').localeCompare(String(a.proposalDate || '')) || a.proposalNum.localeCompare(b.proposalNum))
  return out
}

/**
 * Nhat ky 1 ngay: nop hom do / phat hanh hom do / trong so nop hom do dang pending.
 * "Nop" o day = ho so tren sheet Proposal (da len phi IF/PS + nhom khac) — KHOP
 * voi heatmap "Nhip nop theo ngay" o man Hinh Hom Nay (cung dem Proposal) de 2
 * man hinh khong lech nhau. Ho so chi co o sheet Pipeline (chua len phi) nop
 * trong ngay duoc tach rieng o submittedPipeline de UI hien bo sung.
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
