// ─────────────────────────────────────────────────────────────
// homeKpi.js — KPI Trang Chu theo CHUAN B (Lan chot 10/11/2026):
// tinh theo FILE GOC — DEM THEO DONG nhu cong ty ghi, tren snapshot
// Daily moi nhat (data cua 1 doc daily_sales_tvv). Ham thuan, khong
// phu thuoc React/Firebase de test bang node.
//
// Dinh nghia (don vi: trieu dong, nhu du lieu Daily da parse):
//  - FYP thang  = tong agents[].fyp (giu nguyen nhu truoc — Lan xac
//    nhan dung).
//  - NOP        = MOI dong proposalRows + MOI dong pipelineRows.
//      Tien IP  = tong proposalRows.ipSub + tong pipelineRows.ape
//                 (Pipeline khong co ipSub — phan IP cua Pipeline lay
//                 APE cua no; day la cach Lan tu tinh tren file goc
//                 9.11: IP 1.840,5tr / APE 1.849,1tr).
//      Tien APE = tong proposalRows.apeSub + tong pipelineRows.ape.
//                 (APE cua Nop chi giu de doi soat — Trang Chu CHI
//                 HIEN Nop theo IP, Lan chot dut diem 10/11/2026;
//                 Phat hanh theo IP Net, Pending + Chua len phi APE.)
//  - PHAT HANH  = dong statusGroup 'IF': tien = tong ipNet. KHONG loc
//    ngay phat hanh, KHONG tru CF lien thang (bo cach "phat hanh
//    rong" cua analyzeSoSanLuong o Trang Chu).
//  - PENDING    = dong statusGroup 'PS': tien APE = tong apeSub
//    (dong nao apeSub trong/0 thi dung ipSub cua dong do).
//  - CHUA LEN PHI = dong pipelineRows: tien APE = tong pipelineRows.ape.
//
// He qua da duoc Lan chap nhan: Trang Chu (theo dong) lech Sales
// Report (theo ho so duy nhat qua buildCases) dung o cac ho so bi
// cong ty ghi 2 dong cho 2 TVV.
// ─────────────────────────────────────────────────────────────

const n = (v) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}
const sum = (rows, f) => (rows || []).reduce((s, r) => s + f(r), 0)

/** KPI Trang Chu tu data cua 1 snapshot (moi nhat). */
export function homeKpi(data) {
  const d = data || {}
  const prop = d.proposalRows || []
  const pipe = d.pipelineRows || []
  const agents = Object.values(d.agents || {})
  const pipeApe = sum(pipe, (r) => n(r.ape))
  const ifRows = prop.filter((r) => r.statusGroup === 'IF')
  const psRows = prop.filter((r) => r.statusGroup === 'PS')
  return {
    fyp: sum(agents, (a) => n(a.fyp)),
    nop: {
      n: prop.length + pipe.length,
      ip: sum(prop, (r) => n(r.ipSub)) + pipeApe,
      ape: sum(prop, (r) => n(r.apeSub)) + pipeApe,
    },
    phatHanh: {
      n: ifRows.length,
      ip: sum(ifRows, (r) => n(r.ipNet)),
    },
    pending: {
      n: psRows.length,
      ape: sum(psRows, (r) => (n(r.apeSub) > 0 ? n(r.apeSub) : n(r.ipSub))),
    },
    chuaLenPhi: {
      n: pipe.length,
      ape: pipeApe,
    },
  }
}

/**
 * Xep hang phat hanh CHUAN B theo tung TVV: tong ipNet cua cac dong IF
 * (dem theo dong) gom theo msdl, giam dan. Tra [{ msdl, name, unit, ip }]
 * — chi TVV co ip > 0.
 */
export function topIssuedByRow(data, limit = 5) {
  const d = data || {}
  const prop = d.proposalRows || []
  const agents = d.agents || {}
  const byMsdl = new Map()
  for (const r of prop) {
    if (r.statusGroup !== 'IF') continue
    const key = String(r.msdl || '')
    if (!key) continue
    const cur = byMsdl.get(key) || { msdl: key, name: '', unit: '', ip: 0 }
    cur.ip += n(r.ipNet)
    if (!cur.name) cur.name = r.agName || ''
    if (!cur.unit) cur.unit = r.unit || ''
    byMsdl.set(key, cur)
  }
  return [...byMsdl.values()]
    .map((a) => {
      const ag = agents[a.msdl]
      return {
        msdl: a.msdl,
        name: a.name || ag?.agName || '',
        unit: a.unit || ag?.unit || '',
        ip: a.ip,
      }
    })
    .filter((a) => a.ip > 0)
    .sort((x, y) => y.ip - x.ip)
    .slice(0, limit)
}
