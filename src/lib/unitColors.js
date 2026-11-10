// ─────────────────────────────────────────────────────────────
// unitColors.js — MAU RIENG cho tung Phong (Unit) o muc Phong
// (Tinh Anh), Lan yeu cau 10/11/2026: "moi phong 1 mau de de theo
// doi". Ham THUAN, test bang node (scripts/test-unitcolors.mjs).
//
// Nguyen tac gan mau: BAM XAC DINH tren Ma phong da chuan hoa
// (trim + viet hoa) -> chi so trong bang 24 cap mau. Ham bam:
// djb2 (seed khoi tao co dinh) + tron cuoi splitmix32. Ly do chon
// bo nay: ma phong chi co 3 ky tu rat giong nhau, cac ham bam
// don gian (FNV-1a/djb2 thuan) mod 24 chi ra ~14 mau phan biet
// cho 20 phong T11; bo djb2+splitmix voi seed da chon ra 19/20
// mau phan biet (kiem chung trong test-unitcolors).
// Cung 1 ma phong LUON ra cung 1 mau o moi lan tai, moi thang,
// moi may — KHONG dua vao danh sach phong cua thang (danh sach
// doi theo thang se lam mau nhay). Ma trong/khong biet -> mau
// mac dinh xam navy nhat o cuoi ham.
//
// Bang mau: 24 cap { main, soft } — main du dam de lam dai mau/
// cham mau/tieu de, soft la nen nhat tuong ung. Chon o vung bao
// hoa trung binh, tranh do/xanh qua choi, hop palette sang cua app.
// ─────────────────────────────────────────────────────────────

export const UNIT_COLOR_PALETTE = [
  { main: '#2563eb', soft: '#dbeafe' }, // 0 xanh duong
  { main: '#7c3aed', soft: '#ede9fe' }, // 1 tim violet
  { main: '#db2777', soft: '#fce7f3' }, // 2 hong dam
  { main: '#059669', soft: '#d1fae5' }, // 3 xanh la emerald
  { main: '#d97706', soft: '#fef3c7' }, // 4 ho phach
  { main: '#0891b2', soft: '#cffafe' }, // 5 xanh cyan
  { main: '#65a30d', soft: '#ecfccb' }, // 6 xanh lime
  { main: '#9333ea', soft: '#f3e8ff' }, // 7 tim purple
  { main: '#e11d48', soft: '#ffe4e6' }, // 8 do hong rose
  { main: '#0d9488', soft: '#ccfbf1' }, // 9 xanh teal
  { main: '#ea580c', soft: '#ffedd5' }, // 10 cam
  { main: '#4f46e5', soft: '#e0e7ff' }, // 11 cham indigo
  { main: '#0284c7', soft: '#e0f2fe' }, // 12 xanh sky
  { main: '#a16207', soft: '#fef9c3' }, // 13 vang dam
  { main: '#16a34a', soft: '#dcfce7' }, // 14 xanh la green
  { main: '#c026d3', soft: '#fae8ff' }, // 15 tim fuchsia
  { main: '#b91c1c', soft: '#fee2e2' }, // 16 do tram (chi lam dai/cham)
  { main: '#57534e', soft: '#f5f5f4' }, // 17 xam stone
  { main: '#1e40af', soft: '#e3ebfb' }, // 18 xanh duong dam
  { main: '#6d28d9', soft: '#e9e4fb' }, // 19 tim violet dam
  { main: '#9d174d', soft: '#fbdce9' }, // 20 hong dam sau
  { main: '#065f46', soft: '#cdefe0' }, // 21 xanh emerald dam
  { main: '#92400e', soft: '#fbeed3' }, // 22 nau ho phach dam
  { main: '#155e75', soft: '#d7f0f5' }, // 23 xanh cyan dam
]

// Mau mac dinh khi khong co ma phong (the phong la "—").
export const UNIT_COLOR_DEFAULT = { main: '#63768c', soft: '#eef3f9' }

const normCode = (v) => String(v || '').trim().toUpperCase()

// Seed co dinh cua djb2 — da chon bang kiem chung phan bo mau
// tren 20 ma phong that T11 (19/20 mau phan biet). DOI seed nay
// la doi mau cua moi phong, chi doi kem cap nhat test.
const UNIT_HASH_SEED = 848

// djb2 + tron cuoi splitmix32: on dinh tuyet doi giua cac lan chay.
function hashCode(s) {
  let h = (5381 ^ UNIT_HASH_SEED) >>> 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0
  }
  h = (h + 0x9e3779b9) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad)
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97)
  return (h ^ (h >>> 15)) >>> 0
}

/**
 * unitColor(unitCode) -> { main, soft } — on dinh theo ma phong.
 */
export function unitColor(unitCode) {
  const code = normCode(unitCode)
  if (!code || code === '—') return UNIT_COLOR_DEFAULT
  const idx = hashCode(code) % UNIT_COLOR_PALETTE.length
  return UNIT_COLOR_PALETTE[idx]
}
