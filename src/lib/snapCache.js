// ─────────────────────────────────────────────────────────────
// snapCache.js — Logic THUAN cho CACHE snapshot Daily tren may:
//   1) neededSnapIds: tap doc THAT SU can cho cac man hinh —
//        - doc moi nhat (HomNay / DoiNgu / CaNhan / SalesReport thang moi)
//        - doc lien truoc doc moi nhat (doi chieu delta)
//        - doc moi nhat cua thang truoc thang cua doc moi nhat (CF lien
//          thang trong analyzeSoSanLuong — chi dung latestDailyDoc cua
//          thang truoc nen 1 doc la du)
//        - doc moi nhat cua tung thang trong NAM cua doc moi nhat ma
//          thang do KHONG co so GA trong gaHistory.js (buildYearJourney
//          chi can doc moi nhat cua cac thang nay; thang co so GA thi
//          khong dung snapshot Daily).
//   2) pruneSnapshots: cat danh sach snapshot de JSON luu localStorage
//      vua NGAN SACH KY TU (localStorage ~5MB/origin, con cac key khac) —
//      bo doc CU NHAT khong thuoc tap can truoc; chi khi chinh tap can
//      da vuot ngan sach moi bo tiep (van giu doc moi nhat bang moi gia).
// Dung chung boi store.js (fetch/luu) va cac test node. Dinh dang entry:
// { id: 'yyyy-mm-dd', data, savedAt, fileName? } — id la ngay du lieu.
// ─────────────────────────────────────────────────────────────
import { GA_HISTORY } from './gaHistory.js'

// Ngan sach ky tu cho key d07moi_snapshots trong localStorage.
export const LOCAL_CACHE_BUDGET = 4000000

const pad2 = (n) => String(n).padStart(2, '0')

/** 'yyyy-mm' cua thang truoc thang chua ngay 'yyyy-mm-dd'. */
export function prevMonthYm(ymd) {
  const [y, m] = String(ymd || '').split('-').map(Number)
  if (!y || !m) return ''
  return m === 1 ? `${y - 1}-12` : `${y}-${pad2(m - 1)}`
}

/** 'yyyy-mm' cua thang sau thang 'yyyy-mm' (moc < doc id cho range query). */
export function nextMonthYm(ym) {
  const [y, m] = String(ym || '').split('-').map(Number)
  if (!y || !m) return ''
  return m === 12 ? `${y + 1}-01` : `${y}-${pad2(m + 1)}`
}

/**
 * Cac thang (yyyy-mm) cua 1 nam MA buildYearJourney can snapshot Daily:
 * thang khong co trong GA_HISTORY[year]. Nam chua co so GA -> ca 12 thang.
 */
export function journeyMonthYms(year) {
  const ga = GA_HISTORY[year] || {}
  const out = []
  for (let m = 1; m <= 12; m++) {
    if (!ga[m]) out.push(`${year}-${pad2(m)}`)
  }
  return out
}

const latestIdOfMonth = (sortedIds, ym) => {
  let best = ''
  for (const id of sortedIds) if (id.startsWith(`${ym}-`) && id > best) best = id
  return best
}

/**
 * Tap id doc can giu/tai cho hien thi, tinh tu danh sach id (hoac entries
 * co truong id) da biet. Tra ve Set<string> cac doc id.
 */
export function neededSnapIds(list) {
  const ids = [...new Set((list || []).map((e) => (typeof e === 'string' ? e : e?.id)).filter(Boolean))].sort()
  const out = new Set()
  if (!ids.length) return out
  const newest = ids[ids.length - 1]
  out.add(newest)
  if (ids.length > 1) out.add(ids[ids.length - 2]) // lien truoc (delta)
  const prevLatest = latestIdOfMonth(ids, prevMonthYm(newest))
  if (prevLatest) out.add(prevLatest) // CF lien thang
  const year = Number(newest.slice(0, 4))
  const newestYm = newest.slice(0, 7)
  for (const ym of journeyMonthYms(year)) {
    if (ym > newestYm) continue // thang tuong lai chua co doc
    const latest = latestIdOfMonth(ids, ym)
    if (latest) out.add(latest) // Hanh trinh nam
  }
  return out
}

/** Serialize danh sach entries thanh dung dinh dang luu localStorage. */
export function serializeSnapCache(entries) {
  const obj = {}
  for (const e of entries || []) {
    if (!e || !e.id || !e.data) continue
    obj[e.id] = { date: e.id, fileName: e.fileName || '', savedAt: e.savedAt || null, data: e.data }
  }
  return JSON.stringify(obj)
}

/**
 * Cat danh sach entries cho vua ngan sach ky tu. Thu tu uu tien bo:
 *   1) doc cu nhat KHONG thuoc tap can (neededSnapIds + keepIds truyen them,
 *      vd doc vua nap) — bo dan tu cu nhat.
 *   2) neu van vuot (chinh tap can da qua lon so voi ngan sach): bo doc cu
 *      nhat khong phai doc moi nhat; doc moi nhat LUON duoc giu.
 * Tra ve { kept, json, dropped } — kept sap xep tang dan theo ngay.
 */
export function pruneSnapshots(entries, { budget = LOCAL_CACHE_BUDGET, keepIds = [] } = {}) {
  const sorted = [...(entries || [])]
    .filter((e) => e && e.id && e.data)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
  const keep = neededSnapIds(sorted)
  for (const id of keepIds || []) if (id) keep.add(id)
  const newestId = sorted.length ? sorted[sorted.length - 1].id : ''
  let dropped = 0
  let json = serializeSnapCache(sorted)
  const dropIdx = (idx) => { sorted.splice(idx, 1); dropped += 1; json = serializeSnapCache(sorted) }
  while (json.length > budget && sorted.length > 1) {
    const idx = sorted.findIndex((e) => !keep.has(e.id))
    if (idx >= 0) { dropIdx(idx); continue }
    const idx2 = sorted.findIndex((e) => e.id !== newestId)
    if (idx2 < 0) break
    dropIdx(idx2)
  }
  return { kept: sorted, json, dropped }
}
