// ─────────────────────────────────────────────────────────────
// snapMerge.js — Gop snapshot tren MAY + tren MAY (Firestore) theo id
// (ngay du lieu). Logic THUAN, khong phu thuoc Firebase/DOM de test
// bang node duoc (store.js import Firebase nen khong import truc tiep
// trong test node duoc).
//
// Truoc day ban may THAY THE toan bo ban tren may -> ban vua nap o may
// nay (chua dong bo duoc) bi ban cu tren may de mat, du lieu moi khong thay.
// Quy tac chon khi trung id:
//  1) Ban nao proposalRows co truong apeSub (parser doi moi) thi thang —
//     tranh ban cu thieu APE de ban moi.
//  2) Cung muc day du -> ban luu muon hon (savedAt) thang.
//  3) Hoa nua -> uu tien ban tren may (nguon chia se chung).
// Moi entry ra duoc gan _from: 'local' | 'remote' de UI bao nguon dung.
// ─────────────────────────────────────────────────────────────
export function mergeSnapshots(localList, remoteList) {
  const byId = new Map()
  const completeness = (e) => {
    const rows = e?.data?.proposalRows
    return Array.isArray(rows) && rows.some((r) => r && r.apeSub !== undefined && r.apeSub !== null) ? 1 : 0
  }
  const consider = (entry, from) => {
    if (!entry || !entry.id || !entry.data) return
    const cur = byId.get(entry.id)
    if (!cur) { byId.set(entry.id, { ...entry, _from: from }); return }
    const cNew = completeness(entry); const cCur = completeness(cur)
    let replace = false
    if (cNew !== cCur) replace = cNew > cCur
    else {
      const tNew = String(entry.savedAt || ''); const tCur = String(cur.savedAt || '')
      if (tNew !== tCur) replace = tNew > tCur
      else replace = from === 'remote' && cur._from === 'local'
    }
    if (replace) byId.set(entry.id, { ...entry, _from: from })
  }
  for (const e of localList || []) consider(e, 'local')
  for (const e of remoteList || []) consider(e, 'remote')
  return [...byId.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)))
}
