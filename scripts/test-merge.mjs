// Test: mergeSnapshots (gop snapshot tren may + tren may theo id).
// Import tu module thuan snapMerge.js (store.js re-export ham nay nhung
// keo theo Firebase SDK nen khong import truc tiep trong node duoc).
const { mergeSnapshots } = await import('../src/lib/snapMerge.js')

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1) } console.log('ok -', msg) }

const rowsOld = [{ proposalNum: 'A1' }] // khong co apeSub (parser cu)
const rowsNew = [{ proposalNum: 'A1', apeSub: 10 }] // co apeSub (parser moi)

// 1) id chi co o 1 phia -> giu ca hai, sap xep tang dan
const m1 = mergeSnapshots(
  [{ id: '2026-10-05', data: { proposalRows: rowsNew }, savedAt: '2026-10-05T01:00:00Z' }],
  [{ id: '2026-10-25', data: { proposalRows: rowsOld }, savedAt: '2026-10-25T01:00:00Z' }],
)
assert(m1.length === 2 && m1[0].id === '2026-10-05' && m1[1].id === '2026-10-25', 'giu id rieng cua ca 2 phia, sap xep tang dan')
assert(m1[0]._from === 'local' && m1[1]._from === 'remote', 'gan _from dung phia')

// 2) Trung id: ban co apeSub thang ban cu, du ban cu luu muon hon
const m2 = mergeSnapshots(
  [{ id: '2026-10-25', data: { proposalRows: rowsNew }, savedAt: '2026-10-25T01:00:00Z' }],
  [{ id: '2026-10-25', data: { proposalRows: rowsOld }, savedAt: '2026-10-26T01:00:00Z' }],
)
assert(m2.length === 1 && m2[0]._from === 'local', 'trung id: ban co APE (may nay) thang ban cu tren may')

// 3) Trung id, ca hai co APE: ban luu muon hon thang
const m3 = mergeSnapshots(
  [{ id: '2026-10-25', data: { proposalRows: rowsNew }, savedAt: '2026-10-25T01:00:00Z' }],
  [{ id: '2026-10-25', data: { proposalRows: rowsNew }, savedAt: '2026-10-25T02:00:00Z' }],
)
assert(m3.length === 1 && m3[0]._from === 'remote', 'trung id cung day du: ban luu muon hon (may) thang')

// 4) Trung id, hoa het: uu tien ban tren may
const m4 = mergeSnapshots(
  [{ id: '2026-10-25', data: { proposalRows: rowsNew }, savedAt: null }],
  [{ id: '2026-10-25', data: { proposalRows: rowsNew }, savedAt: null }],
)
assert(m4.length === 1 && m4[0]._from === 'remote', 'hoa het -> uu tien ban tren may')

// 5) Dau vao rong/null khong crash
assert(mergeSnapshots([], null).length === 0 && mergeSnapshots(null, []).length === 0, 'rong/null -> []')

// 6) Remote IT doc hon local (fetch gio chi tra TAP DOC CAN): cac doc chi
// co o local (cache may) PHAI duoc giu nguyen — merge khong duoc lam mat.
const localMany = [
  { id: '2026-09-30', data: { proposalRows: rowsNew }, savedAt: '2026-09-30T01:00:00Z' },
  { id: '2026-10-25', data: { proposalRows: rowsNew }, savedAt: '2026-10-25T01:00:00Z' },
  { id: '2026-11-05', data: { proposalRows: rowsNew }, savedAt: '2026-11-05T01:00:00Z' },
  { id: '2026-11-08', data: { proposalRows: rowsNew }, savedAt: '2026-11-08T01:00:00Z' },
  { id: '2026-11-09', data: { proposalRows: rowsNew }, savedAt: '2026-11-09T01:00:00Z' },
]
const remoteFew = [
  { id: '2026-11-08', data: { proposalRows: rowsNew }, savedAt: '2026-11-09T02:00:00Z' },
  { id: '2026-11-09', data: { proposalRows: rowsNew }, savedAt: '2026-11-09T02:00:00Z' },
]
const m6 = mergeSnapshots(localMany, remoteFew)
assert(m6.length === 5, 'remote it doc hon: merged giu du 5 id (khong mat doc cache)')
assert(m6.map((e) => e.id).join(',') === '2026-09-30,2026-10-25,2026-11-05,2026-11-08,2026-11-09', 'remote it doc hon: thu tu + id day du')
assert(m6[0]._from === 'local' && m6[3]._from === 'remote', 'remote it doc hon: doc trung lay ban may moi hon, doc rieng giu ban may nay')

console.log('✅ TAT CA ASSERT DAT (test-merge)')
