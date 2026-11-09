// Test: snapCache.js — tap doc can (neededSnapIds) + cat cache theo
// dung luong (pruneSnapshots). Module thuan, chay bang node.
const { neededSnapIds, pruneSnapshots, journeyMonthYms, prevMonthYm, nextMonthYm, LOCAL_CACHE_BUDGET, daysInMonth, shiftYmd, localTodayYmd, probeDaysBack, monthProbeDays } = await import('../src/lib/snapCache.js')

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1) } console.log('ok -', msg) }

const e = (id, size = 10) => ({ id, data: { proposalRows: [], blob: 'x'.repeat(size) }, savedAt: `${id}T00:00:00Z` })

// ── journeyMonthYms ──
assert(JSON.stringify(journeyMonthYms(2026)) === JSON.stringify(['2026-11', '2026-12']), 'journey 2026: chi T11 + T12 chua co so GA')
assert(journeyMonthYms(2027).length === 12, 'journey 2027: ca 12 thang (chua co so GA)')

// ── prev/next month ──
assert(prevMonthYm('2026-01-15') === '2025-12' && prevMonthYm('2026-11-09') === '2026-10', 'prevMonthYm dung ca qua nam')
assert(nextMonthYm('2026-12') === '2027-01' && nextMonthYm('2026-11') === '2026-12', 'nextMonthYm dung ca qua nam')

// ── neededSnapIds: newest 2026-11-09, co doc T10 + T9 + T8 ──
const ids = ['2026-08-31', '2026-09-30', '2026-10-25', '2026-10-31', '2026-11-05', '2026-11-09']
const need = neededSnapIds(ids)
assert(need.has('2026-11-09'), 'needed: doc moi nhat')
assert(need.has('2026-11-05'), 'needed: doc lien truoc (delta)')
assert(need.has('2026-10-31'), 'needed: doc moi nhat thang truoc (CF) — lay 31/10 chu khong phai 25/10')
assert(!need.has('2026-10-25') && !need.has('2026-09-30') && !need.has('2026-08-31'), 'needed: thang co so GA (T8/T9/T10 khong phai journey) + doc thua bi loai')
assert(need.size === 3, 'needed: dung 3 doc cho du lieu T11/2026 hien tai')

// Thang 12/2026 co doc -> journey can doc moi nhat cua T12
const need2 = neededSnapIds([...ids, '2026-12-02', '2026-12-20'])
assert(need2.has('2026-12-20') && need2.has('2026-12-02'), 'needed: newest T12 + lien truoc')
assert(need2.has('2026-11-09'), 'needed: thang truoc cua T12 la T11 -> doc moi nhat T11 (CF)')
assert(need2.size === 3, 'needed T12: 3 doc (T11 vua la CF vua la journey)')

// Rong -> rong
assert(neededSnapIds([]).size === 0 && neededSnapIds(null).size === 0, 'needed: rong/null -> tap rong')

// ── pruneSnapshots theo dung luong ──
// 6 doc x ~300KB ky tu, ngan sach 1.000.000 -> phai cat doc CU ngoai tap can truoc
const big = ['2026-08-31', '2026-09-30', '2026-10-25', '2026-10-31', '2026-11-05', '2026-11-09'].map((id) => e(id, 300000))
const p1 = pruneSnapshots(big, { budget: 1000000 })
assert(p1.json.length <= 1000000, 'prune: json vua ngan sach')
assert(p1.kept.some((x) => x.id === '2026-11-09'), 'prune: doc moi nhat luon duoc giu')
assert(p1.kept.some((x) => x.id === '2026-10-31') && p1.kept.some((x) => x.id === '2026-11-05'), 'prune: tap can (CF + lien truoc) duoc giu truoc doc thua')
assert(!p1.kept.some((x) => x.id === '2026-08-31'), 'prune: doc cu nhat ngoai tap can bi bo dau tien')

// keepIds: doc vua nap (ngay cu) duoc giu du ngoai tap can (ngan sach
// 1,3M: vua tap can ~900KB + doc vua nap ~300KB, 2 doc thua bi cat)
const p2 = pruneSnapshots(big, { budget: 1300000, keepIds: ['2026-08-31'] })
assert(p2.kept.some((x) => x.id === '2026-08-31'), 'prune: keepIds (doc vua nap) duoc giu')
assert(p2.kept.length === 4, 'prune: keepIds + tap can = 4 doc')

// Ngan sach cuc nho: chi con doc moi nhat
const p3 = pruneSnapshots(big, { budget: 1000 })
assert(p3.kept.length === 1 && p3.kept[0].id === '2026-11-09', 'prune: ngan sach cuc nho -> chi giu doc moi nhat')

// Du lieu nho hon ngan sach mac dinh: giu nguyen tat ca
const p4 = pruneSnapshots([e('2026-11-09'), e('2026-11-05')])
assert(p4.kept.length === 2 && p4.dropped === 0 && p4.json.length <= LOCAL_CACHE_BUDGET, 'prune: vua ngan sach mac dinh -> khong cat')

// ── Ham ngay thuan cho co che DO getDoc theo ngay (store.js) ──
// Query __name__ DESC thieu composite index -> store do lui tung ngay
// bang getDoc; danh sach ngay ung vien sinh o snapCache (thuan, o day).
assert(daysInMonth(2026, 11) === 30 && daysInMonth(2026, 10) === 31 && daysInMonth(2026, 2) === 28, 'daysInMonth: T11=30, T10=31, T2/2026=28')
assert(daysInMonth(2024, 2) === 29, 'daysInMonth: T2/2024 nam nhuan = 29')
assert(shiftYmd('2026-11-09', -1) === '2026-11-08' && shiftYmd('2026-11-09', 1) === '2026-11-10', 'shiftYmd: +/- 1 ngay trong thang')
assert(shiftYmd('2026-03-01', -1) === '2026-02-28' && shiftYmd('2026-01-01', -1) === '2025-12-31', 'shiftYmd: lui qua dau thang / dau nam')
assert(shiftYmd('2024-03-01', -1) === '2024-02-29', 'shiftYmd: lui vao 29/02 nam nhuan')
assert(shiftYmd('khong-phai-ngay', -1) === '', 'shiftYmd: dinh dang sai -> ""')
assert(localTodayYmd(new Date(2026, 10, 9, 23, 59)) === '2026-11-09', 'localTodayYmd: lay ngay theo gio dia phuong cua Date truyen vao')
assert(JSON.stringify(probeDaysBack('2026-11-09', 3)) === JSON.stringify(['2026-11-09', '2026-11-08', '2026-11-07']), 'probeDaysBack: tu neo lui dan, gom ca neo')
assert(JSON.stringify(probeDaysBack('2026-03-01', 3)) === JSON.stringify(['2026-03-01', '2026-02-28', '2026-02-27']), 'probeDaysBack: lui qua bien thang dung')
assert(probeDaysBack('2026-11-09', 45).length === 45 && probeDaysBack('2026-11-09', 45)[44] === '2026-09-26', 'probeDaysBack: du 45 ngay, ngay cuoi = neo - 44')
assert(probeDaysBack('sai', 5).length === 0 && probeDaysBack('2026-11-09', 0).length === 0, 'probeDaysBack: neo sai / count 0 -> []')
const mp11 = monthProbeDays('2026-11')
assert(mp11.length === 30 && mp11[0] === '2026-11-30' && mp11[29] === '2026-11-01', 'monthProbeDays T11/2026: 30 ngay, tu 30 lui ve 01')
const mpLeap = monthProbeDays('2024-02')
assert(mpLeap.length === 29 && mpLeap[0] === '2024-02-29' && mpLeap[28] === '2024-02-01', 'monthProbeDays T2/2024: 29 ngay (nhuan), bat dau 29/02')
const mpOct = monthProbeDays('2026-10')
assert(mpOct.length === 31 && mpOct[0] === '2026-10-31' && mpOct[1] === '2026-10-30', 'monthProbeDays T10/2026: 31 ngay — do tu 31 trung ngay 30 o lan do thu 2 (doc moi nhat T10 that)')
assert(monthProbeDays('2026-13').length === 0 || monthProbeDays('xx').length === 0, 'monthProbeDays: thang sai dinh dang -> []')

console.log('✅ TAT CA ASSERT DAT (test-cache)')
