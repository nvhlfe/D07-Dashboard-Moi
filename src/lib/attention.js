// ─────────────────────────────────────────────────────────────
// attention.js — Danh sach "CAN CHU Y HOM NAY" o Tinh Anh
// (10/11/2026). Ham THUAN, test bang node tren file Daily that.
// Chi Admin chinh + truong phong xem (loc theo Unit o UI — lib tra
// toan GA, UI cat theo quyen). 3 nhom tu snapshot Daily MOI NHAT:
//
//  (a) near — SAP CHAM MOC: TVV con thieu <= gapMax (mac dinh 2tr)
//      toi moc Active 15tr IP phat hanh (0 < ipNet < 15) HOAC moc
//      FYC thang 5tr (0 < fyc < 5). Nguon: agent.ipNet / agent.fyc
//      o sheet Agent (cung so Bang Vang dang hien). Moi TVV 1 muc,
//      kem marks[] ghi ro thieu bao nhieu toi moc nao; sap theo
//      khoang thieu nho nhat tang dan (sap ve dich nhat len truoc).
//  (b) noCases — CHUA CO HO SO: chi liet ke khi ngay du lieu cua
//      snapshot >= ngay 10 cua thang (dau thang chua voi ket luan).
//      "Chua co ho so" = MSDL khong xuat hien trong BAT KY ho so nao
//      cua buildCases thang nay (Proposal/Pending/Pipeline deu la
//      ho so da nop). Chi TVV co trong sheet Agent cua thang; toi da
//      noCaseLimit nguoi, uu tien TVV co FYP nam (fypYtd) cao hon —
//      TVV co doanh so nam ma thang nay chua ra ho so la dang chu y
//      nhat; hoa thi theo ten.
//  (c) pendingTop — PENDING LAU NHAT: top pendingLimit ho so theo
//      ageDays giam dan, lay tu pendingAll cua analyzeSoSanLuong
//      (cung nguon Trang Chu dang dung cho canh bao pending > 7 ngay).
// Don vi: trieu dong.
// ─────────────────────────────────────────────────────────────

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const up = (v) => String(v || '').trim().toUpperCase()

export const ATTENTION_DEFAULTS = {
  activeTarget: 15,
  fycTarget: 5,
  gapMax: 2,
  noCaseDayMin: 10,
  noCaseLimit: 15,
  pendingLimit: 5,
}

export function buildAttentionList(snapshot, cases, pendingAll, opts = {}) {
  const o = { ...ATTENTION_DEFAULTS, ...(opts || {}) }
  const data = (snapshot && snapshot.data) || {}
  const snapDay = Number(String((snapshot && snapshot.id) || '').slice(8, 10)) || 0
  const agents = Object.values(data.agents || {})

  // (a) Sap cham moc
  const near = []
  for (const a of agents) {
    const marks = []
    const ipNet = num(a.ipNet)
    const fyc = num(a.fyc)
    if (ipNet > 0 && ipNet < o.activeTarget) {
      const gap = o.activeTarget - ipNet
      if (gap <= o.gapMax) marks.push({ kind: 'active', gap, target: o.activeTarget, label: `mốc Active ${o.activeTarget}tr IP` })
    }
    if (fyc > 0 && fyc < o.fycTarget) {
      const gap = o.fycTarget - fyc
      if (gap <= o.gapMax) marks.push({ kind: 'fyc', gap, target: o.fycTarget, label: `mốc ${o.fycTarget}tr FYC` })
    }
    if (marks.length) {
      near.push({
        msdl: up(a.msdl),
        name: a.agName || '',
        unit: a.unit || '',
        ipNet,
        fyc,
        marks,
        minGap: Math.min(...marks.map((m) => m.gap)),
      })
    }
  }
  near.sort((x, y) => x.minGap - y.minGap || y.ipNet - x.ipNet || x.name.localeCompare(y.name, 'vi'))

  // (b) Chua co ho so (chi tu ngay 10 cua thang)
  let noCases = []
  if (snapDay >= o.noCaseDayMin) {
    const withCase = new Set()
    for (const c of cases || []) {
      const key = up(c && c.msdl)
      if (key) withCase.add(key)
    }
    noCases = agents
      .filter((a) => up(a.msdl) && !withCase.has(up(a.msdl)))
      .map((a) => ({
        msdl: up(a.msdl),
        name: a.agName || '',
        unit: a.unit || '',
        fypYtd: num(a.fypYtd),
      }))
      .sort((x, y) => y.fypYtd - x.fypYtd || x.name.localeCompare(y.name, 'vi'))
      .slice(0, Math.max(0, o.noCaseLimit))
  }

  // (c) Pending lau nhat
  const pendingTop = (pendingAll || [])
    .filter((c) => c && c.ageDays !== null && c.ageDays !== undefined && Number.isFinite(Number(c.ageDays)))
    .slice()
    .sort((x, y) => num(y.ageDays) - num(x.ageDays))
    .slice(0, Math.max(0, o.pendingLimit))
    .map((c) => ({
      msdl: up(c.msdl),
      name: c.name || '',
      unit: c.unit || '',
      proposalNum: c.proposalNum || '',
      policyNum: c.policyNum || '',
      ageDays: num(c.ageDays),
      value: num(c.ape) > 0 ? num(c.ape) : num(c.ipSub),
    }))

  return { near, noCases, pendingTop, snapDay }
}
