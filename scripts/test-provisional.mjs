// Test lib/raceProvisional.js — SO TAM TINH tu Daily cho 00211 +
// 00210 (them 25/11/2026 theo yeu cau Lan; so chinh thuc van la
// bang cong ty). Snapshot TONG HOP nho tu dung theo format
// parseDaily (proposalRows/agents), khong dung file that —
// kiem chung tren Daily that 18/11 + bang cong ty da lam o dot
// kiem chung 25/11 (Nov khop 23/29, iPhone trang thai moc
// trung 44/45) va script phat trien chay lai dung 2 con so do.
// Cong thuc khoa o day:
//  - 00211: tong ipSub dong IF (bo qua PS/OTHER), bac + thuong
//    novTier, KHONG ×2 ban cung.
//  - 00210: bonus10 loai dong Vung Tien ipNet < 20tr; bonus11
//    TA9 cong them he so 1,0 (khac 0,5 ho so thuong); bonus12
//    chi TA9; base = ipNet sheet Agent cong don cac thang;
//    moc 600/900tr dung iphoneRowStatus (ca bien dung moc).
// Chay: node scripts/test-provisional.mjs
import assert from 'node:assert'
import { provisionalNov, provisionalIphone, isVungTienRow, isYenTamRow } from '../src/lib/raceProvisional.js'
import { iphoneRowStatus } from '../src/lib/iphoneOfficial.js'

const row = (msdl, agName, unit, statusGroup, product, ipSub, ipNet) => ({
  msdl, agName, unit, status: statusGroup, statusGroup, product,
  ipSub, ipNet, proposalNum: '', policyNum: '',
})
const agent = (msdl, agName, unit, ipNet) => ({ msdl, agName, unit, ipNet })
const snap = (id, proposalRows, agents) => ({
  id,
  data: { proposalRows, agents, units: {}, leaderUnits: [], pendingRows: [], pipelineRows: [] },
})

// ═══ Nhan dien san pham ═══
assert.ok(isVungTienRow({ product: 'PRU-Đầu Tư Vững Tiến' }))
assert.ok(isVungTienRow({ product: 'UR9' }))
assert.ok(!isVungTienRow({ product: 'PRUBảo Vệ Tối Đa 2.0' }))
assert.ok(isYenTamRow({ product: 'PRUYên Tâm Vui Khỏe' }))
assert.ok(isYenTamRow({ product: 'TA9' }))
assert.ok(!isYenTamRow({ product: 'PRU-Đầu Tư Vững Tiến' }))
console.log('Nhan dien UR9/TA9: khop ca ten tieng Viet lan ma san pham')

// ═══ (1) 00211 tam tinh ═══
console.log('\n=== 00211 tam tinh: Σ ipSub dong IF + bac thuong ===')
const snapNov = snap('2026-11-18', [
  row('001', 'An', 'AAA', 'IF', 'PRU-Đầu Tư Vững Tiến', 60, 60),
  row('001', 'An', 'AAA', 'IF', 'PRUBảo Vệ Tối Đa 2.0', 50, 50),
  row('001', 'An', 'AAA', 'PS', 'PRU-Đầu Tư Vững Tiến', 999, 0), // PS: bo qua
  row('001', 'An', 'AAA', 'OTHER', 'PRU-Đầu Tư Vững Tiến', 999, 0), // OTHER: bo qua
  row('002', 'Bình', 'BBB', 'IF', 'PRUBảo Vệ Tối Đa 2.0', 20, 20),
  row('003', 'Chi', 'CCC', 'IF', 'PRUBảo Vệ Tối Đa 2.0', 10, 10),
  row('004', 'Dũng', 'DDD', 'IF', 'PRUBảo Vệ Tối Đa 2.0', 2, 2),
], {})
const nov = provisionalNov([snapNov])
assert.strictEqual(nov.dataDate, '2026-11-18')
assert.strictEqual(nov.counts.total, 2, 'chi 001 + 002 dat bac')
assert.deepStrictEqual(nov.counts.byTier, [1, 0, 0, 1], '1 TVV bac >=100, 1 TVV bac 18')
assert.strictEqual(nov.achieved[0].msdl, '001')
assert.strictEqual(nov.achieved[0].value, 110, 'tong ipSub IF cua 001 = 110 (khong tinh PS/OTHER)')
assert.strictEqual(nov.achieved[0].bonus, 8.8, 'bac 100tr: thuong 8% IP = 8,8tr')
assert.strictEqual(nov.achieved[1].msdl, '002')
assert.strictEqual(nov.achieved[1].bonus, 1.5, 'bac 18tr: thuong 1,5tr (khong ×2 ban cung)')
assert.strictEqual(nov.totalBonus, 10.3)
assert.strictEqual(nov.near.length, 1)
assert.strictEqual(nov.near[0].msdl, '003', '003 thieu 8tr <= nguong 10tr -> sap dat; 004 thieu 16tr -> khong')
assert.strictEqual(provisionalNov([]).dataDate, null, 'chua co Daily T11 -> dataDate null')
console.log('00211: achieved 2 (110tr->8,8tr; 20tr->1,5tr), near 1, totalBonus 10,3tr — DAT')

// ═══ (2) 00210 tam tinh ═══
console.log('\n=== 00210 tam tinh: base Agent + bonus10/11/12 theo he so ===')
const snapOct = snap('2026-10-30', [
  row('101', 'Nguyễn Văn X', 'AAA', 'IF', 'PRU-Đầu Tư Vững Tiến', 15, 15), // UR9 <20tr: loai khoi bonus10
  row('101', 'Nguyễn Văn X', 'AAA', 'IF', 'PRU-Đầu Tư Vững Tiến', 25, 25), // UR9 >=20tr: tinh
  row('101', 'Nguyễn Văn X', 'AAA', 'IF', 'PRUBảo Vệ Tối Đa 2.0', 10, 10),
  row('101', 'Nguyễn Văn X', 'AAA', 'PS', 'PRUBảo Vệ Tối Đa 2.0', 999, 999), // PS: bo qua
  row('102', 'Trần Thị Y', 'BBB', 'IF', 'PRU-Đầu Tư Vững Tiến', 19.9, 19.9), // loai
  row('102', 'Trần Thị Y', 'BBB', 'IF', 'PRUBảo Vệ Tối Đa 2.0', 30, 30),
], {
  '101': agent('101', 'Nguyễn Văn X', 'AAA', 100),
  '102': agent('102', 'Trần Thị Y', 'BBB', 500),
  '104': agent('104', 'Phạm Văn W', 'DDD', 900),
})
const snapNovIp = snap('2026-11-18', [
  row('101', 'Nguyễn Văn X', 'AAA', 'IF', 'PRUYên Tâm Vui Khỏe', 40, 40), // TA9: cong them 1,0×
  row('101', 'Nguyễn Văn X', 'AAA', 'IF', 'PRUBảo Vệ Tối Đa 2.0', 20, 20), // thuong: 0,5×
  row('101', 'Nguyễn Văn X', 'AAA', 'IF', 'PRU-Đầu Tư Vững Tiến', 10, 10), // UR9 <20tr: loai
  row('102', 'Trần Thị Y', 'BBB', 'IF', 'PRUBảo Vệ Tối Đa 2.0', 200, 200),
  row('102', 'Trần Thị Y', 'BBB', 'IF', 'UR9', 8, 8), // ma UR9 <20tr: loai
], {
  '101': agent('101', 'Nguyễn Văn X', 'AAA', 200),
  '102': agent('102', 'Trần Thị Y', 'BBB', 100),
  '103': agent('103', 'Lê Thị Z', 'CCC', 600),
})
const snapDec = snap('2026-12-05', [
  row('101', 'Nguyễn Văn X', 'AAA', 'IF', 'TA9', 30, 30), // TA9 T12: cong them 1,0×
  row('101', 'Nguyễn Văn X', 'AAA', 'IF', 'PRUBảo Vệ Tối Đa 2.0', 500, 500), // thuong T12: cong them 0
], {
  '101': agent('101', 'Nguyễn Văn X', 'AAA', 50),
})
const ip = provisionalIphone([snapOct, snapNovIp, snapDec])
assert.strictEqual(ip.dataDate, '2026-12-05', 'dataDate = snapshot moi nhat trong cac thang da dung')
const byMsdl = new Map(ip.rows.map((r) => [r.msdl, r]))
const x = byMsdl.get('101')
assert.strictEqual(x.base, 350000000, 'X base = Agent ipNet (100 + 200 + 50)tr')
assert.strictEqual(x.bonus10, 35000000, 'X bonus10 = 25 + 10 (loai UR9 15tr <20tr, bo qua PS)')
assert.strictEqual(x.bonus11, 50000000, 'X bonus11 = TA9 40×1,0 + thuong 20×0,5 (loai UR9 10tr)')
assert.strictEqual(x.bonus12, 30000000, 'X bonus12 = TA9 30×1,0 (ho so thuong T12 cong them 0)')
assert.strictEqual(x.total, 465000000)
const y = byMsdl.get('102')
assert.strictEqual(y.base, 600000000)
assert.strictEqual(y.bonus10, 30000000, 'Y bonus10 = 30 (loai UR9 19,9tr)')
assert.strictEqual(y.bonus11, 100000000, 'Y bonus11 = 200×0,5 (loai UR9 ma UR9 8tr)')
assert.strictEqual(y.total, 730000000)
assert.deepStrictEqual(ip.rows.map((r) => r.msdl), ['104', '102', '103', '101'], 'sap giam dan theo total')
assert.strictEqual(ip.summary.datPromax, 3, 'W 900 + Y 730 + Z 600 (dung moc) dat Pro Max')
assert.strictEqual(ip.summary.datDuo, 1, 'chi W dung moc 900 dat Duo')
assert.deepStrictEqual(iphoneRowStatus(byMsdl.get('103')), {
  promax: { reached: true, lack: 0 },
  duo: { reached: false, lack: 300000000 },
}, 'Z dung moc 600tr: Pro Max dat, Duo thieu 300tr')
assert.strictEqual(provisionalIphone([]).dataDate, null, 'chua co Daily T10/T11 -> dataDate null')
assert.deepStrictEqual(provisionalIphone([]).summary, { total: 0, datPromax: 0, datDuo: 0 })
console.log('00210: X 465tr (base 350 + b10 35 + b11 50 + b12 30); Y 730tr; moc bien 600/900 dung — DAT')

console.log('\n✅ test-provisional: TAT CA KHAI BAO DAT')
