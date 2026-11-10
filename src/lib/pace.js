// ─────────────────────────────────────────────────────────────
// pace.js — "NHIP DO VE DICH" cho khoi Tien do FYP o Trang Chu
// (10/11/2026). Ham THUAN, test bang node.
//
// Duong THUC TE: moi snapshot Daily cua thang dang xem ma app dang
// co trong bo nho la 1 diem (ngay du lieu cua snapshot, tong FYP
// thang cua chinh snapshot do — snapshot la LUY KE nen tong FYP cua
// snapshot = FYP luy ke toi ngay do). Cong thuc tong FYP KHOP
// HomNay/homeKpi: cong agents[].fyp.
// Duong NHIP CAN THIET: duong thang tu (ngay 0, 0) toi (ngay cuoi
// thang, muc tieu FYP) — tai ngay d can dat target * d / so ngay.
// Thuan hien thi: KHONG doi so KPI o bat ky dau.
// Don vi: trieu dong.
// ─────────────────────────────────────────────────────────────

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const pad2 = (n) => String(n).padStart(2, '0')

/** Tong FYP thang cua 1 snapshot (cong agents[].fyp nhu HomNay). */
export function snapshotFyp(data) {
  return Object.values((data && data.agents) || {}).reduce((s, a) => s + num(a.fyp), 0)
}

/**
 * Diem nhip thuc te cua thang (year, month) tu danh sach snapshots:
 * loc snapshot co id 'yyyy-mm-*' cua dung thang, sap xep theo ngay,
 * tra [{ day, dateId, fyp }] — moi ngay 1 diem (id da duy nhat trong
 * snaps sau merge nen khong trung ngay).
 */
export function pacePoints(snaps, year, month) {
  const prefix = `${year}-${pad2(month)}-`
  return (snaps || [])
    .filter((s) => s && s.id && String(s.id).startsWith(prefix))
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((s) => ({
      day: Number(String(s.id).slice(8, 10)) || 0,
      dateId: String(s.id),
      fyp: snapshotFyp(s.data),
    }))
    .filter((p) => p.day >= 1)
}

/**
 * FYP can dat tai ngay `day` de ve dich dung nhip thang:
 * target * day / daysInMonth. Thieu muc tieu / tham so hong -> null.
 */
export function paceNeededAt(target, day, daysInMonth) {
  const t = Number(target)
  const d = Number(day)
  const dim = Number(daysInMonth)
  if (!Number.isFinite(t) || t <= 0) return null
  if (!Number.isFinite(d) || !Number.isFinite(dim) || dim <= 0) return null
  return (t * Math.min(Math.max(d, 0), dim)) / dim
}

/**
 * Trang thai nhip tai diem cuoi: 'ahead' (FYP >= nhip can) /
 * 'behind' (thap hon) / null (chua co diem hoac chua dat muc tieu).
 */
export function paceStatus(points, target, daysInMonth) {
  if (!points || !points.length) return null
  const last = points[points.length - 1]
  const need = paceNeededAt(target, last.day, daysInMonth)
  if (need === null) return null
  return last.fyp >= need ? 'ahead' : 'behind'
}
