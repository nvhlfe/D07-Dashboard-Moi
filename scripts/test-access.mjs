// Test RULES HIEN THI + DOI TEN (Lan chot 08/11/2026) bang cach doc
// file tinh — node khong render duoc JSX nen assert tren noi dung file.
// Chay: node scripts/test-access.mjs
import { readFileSync } from 'node:fs'
import assert from 'node:assert'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const app = read('../src/App.jsx')
const doiNgu = read('../src/components/DoiNgu.jsx')
const memo = read('../src/components/MemoThuVien.jsx')
const html = read('../index.html')
const fsRules = read('../firestore.rules')
const store = read('../src/lib/store.js')
const fbConfig = read('../src/lib/firebaseConfig.js')
const team = read('../src/lib/team.js')
const parseDaily = read('../src/lib/parseDaily.js')
const napDuLieu = read('../src/components/NapDuLieu.jsx')

// ── Doi ten hien thi ──
console.log('=== doi ten hien thi ===')
assert.ok(app.includes('Trang Chủ'), "App.jsx: nhan tab home phai la 'Trang Chủ'")
assert.ok(app.includes('Tinh Anh'), "App.jsx: nhan tab team phai la 'Tinh Anh'")
assert.ok(app.includes('Prudential Quận 7'), "App.jsx: header phai la 'Prudential Quận 7'")
assert.ok(app.includes('Cùng Học Hỏi – Cùng Phát Triển – Cùng Thành Công'), 'App.jsx: phai co slogan')
assert.ok(html.includes('<title>Prudential Quận 7</title>'), 'index.html: <title> phai la Prudential Quận 7')
assert.ok(!html.includes('Dashboard D07 Mới'), 'index.html: khong con ten cu trong title')
console.log('Trang Chủ / Tinh Anh / Prudential Quận 7 / slogan / title — dung')

// ── Thanh dieu huong loc theo quyen ──
console.log('\n=== tab bar loc theo quyen ===')
assert.ok(app.includes('visibleNav'), 'App.jsx: phai co visibleNav (danh sach tab dang hien)')
assert.ok(app.includes('canViewSalesReport'), 'App.jsx: phai dung canViewSalesReport de loc tab Sales Report')
assert.ok(app.includes('isSuperAdmin'), 'App.jsx: phai dung isSuperAdmin de loc tab Nap')
assert.ok(/n\.id === 'nap'\) return superAdmin/.test(app), 'App.jsx: tab Nap chi hien khi superAdmin')
assert.ok(/n\.id === 'sales'\) return canSR/.test(app), 'App.jsx: tab Sales Report chi hien khi canSR')
assert.ok(app.includes('gridTemplateColumns'), 'App.jsx: so cot tab bar phai theo so tab dang hien')
assert.ok(app.includes("setTab('home')"), 'App.jsx: mat quyen o tab bi an thi tu ve Trang Chu')
console.log('Nap chi Admin thay; Sales Report chi Admin + duoc cap quyen thay; mat quyen -> ve Trang Chu')

// ── DoiNgu: chi mo chi tiet cua chinh minh ──
console.log('\n=== DoiNgu gate chi tiet TVV ===')
assert.ok(doiNgu.includes('Bạn chỉ xem được chi tiết của chính mình (theo MSĐL).'), 'DoiNgu: phai co thong bao chi xem cua chinh minh')
assert.ok(doiNgu.includes('Đăng nhập để xem chi tiết của chính bạn'), 'DoiNgu: phai co thong bao moi dang nhap')
assert.ok(doiNgu.includes('>Bạn<') || doiNgu.includes('Bạn</span>'), "DoiNgu: hang cua chinh minh phai co nhan 'Bạn'")
assert.ok(doiNgu.includes('viewerMsdl'), 'DoiNgu: phai tinh viewerMsdl de doi chieu hang cua minh')
assert.ok(doiNgu.includes('emailToMsdl'), 'DoiNgu: phai suy MSDL tu email tai khoan MSDL')
assert.ok(doiNgu.includes('onOpenLogin'), 'DoiNgu: phai nhan onOpenLogin de mo form dang nhap')
assert.ok(doiNgu.includes('const rowFull = canSeeFull || isMine(a)'), 'DoiNgu: phai tinh rowFull = Admin chinh HOAC hang cua chinh minh')
assert.ok(doiNgu.includes('maskSensitive(pc.policyNum || pc.proposalNum, rowFull)'), 'DoiNgu: so Policy trong chi tiet dung rowFull -> chinh minh xem DAY DU, nguoi khac van che')
console.log('Chua dang nhap -> moi dang nhap; da dang nhap -> chi mo cua chinh minh (MSDL), nhan Bạn; so Policy: chinh minh + Admin thay day du')

// ── Memo: ai cung xem, dang nhap moi tai ──
console.log('\n=== Memo gate tai ve ===')
assert.ok(memo.includes('Đăng nhập để tải về'), "MemoThuVien: chua dang nhap phai hien nut 'Đăng nhập để tải về'")
assert.ok(memo.includes('onOpenLogin'), 'MemoThuVien: phai nhan onOpenLogin')
assert.ok(memo.includes('⬇ Tải về'), 'MemoThuVien: da dang nhap van co nut Tai ve nhu cu')
console.log('Xem public; tai ve can dang nhap')

// ── Cap quyen Sales Report: nhan nut RO CHU trong panel Duyet TK ──
console.log('\n=== panel Duyet TK: nut quyen ro chu ===')
assert.ok(app.includes('Sales Report: '), "App.jsx: nut quyen phai ghi ro chu 'Sales Report: Dang bat/tat' (ban cu ghi tat 'SR' nen kho thay)")
assert.ok(!app.includes('📊 SR:'), "App.jsx: khong con nhan ghi tat '📊 SR:'")
assert.ok(app.includes('adminSetSalesReport'), 'App.jsx: nut Sales Report phai goi adminSetSalesReport')
assert.ok(app.includes('Duyệt TK'), 'App.jsx: phai co nut mo panel Duyet TK tren header')
console.log('Admin: header -> Duyet TK -> muc Da duyet -> nut "Sales Report: Dang bat/tat"')

// ── Quyen xem muc Phong (Unit): store + helper + nut trong panel ──
console.log('\n=== quyen Phong (Unit): store + helper + panel ===')
assert.ok(store.includes('adminSetUnitView'), 'store.js: phai co adminSetUnitView')
assert.ok(store.includes('canViewUnit'), 'store.js: phai co truong canViewUnit')
assert.ok(store.includes('canViewUnit: p.canViewUnit === true'), 'store.js: fetchAllProfiles phai tra canViewUnit (boolean)')
assert.ok(store.includes('cd.canViewUnit === true && !clean.canViewUnit'), 'store.js: saveUserProfile phai khoi phuc canViewUnit tu doc may (khong ghi de mat quyen)')
assert.ok(/canViewUnit: profile\?\.canViewUnit !== undefined/.test(store), 'store.js: saveUserProfile phai GIU canViewUnit khi ghi de (pattern canSalesReport)')
assert.ok(fbConfig.includes('canViewUnitSection'), 'firebaseConfig.js: phai co helper canViewUnitSection')
assert.ok(fbConfig.includes('profile.canViewUnit === true'), 'firebaseConfig.js: canViewUnitSection phai doc profile.canViewUnit')
assert.ok(fbConfig.includes('isLeader === true'), 'firebaseConfig.js: canViewUnitSection phai nhan lop tu dong UM/BM (isLeader)')
assert.ok(app.includes('🏢 Phòng (Unit): '), "App.jsx: tai khoan approved phai co nut 'Phòng (Unit): Dang bat/tat' trong panel Duyet TK")
assert.ok(app.includes('adminSetUnitView'), 'App.jsx: nut Phong phai goi adminSetUnitView')
assert.ok(app.includes('handleAdminUnitView'), 'App.jsx: phai co handler handleAdminUnitView')
console.log('store giu/tra canViewUnit; helper canViewUnitSection (Admin | canViewUnit | isLeader); panel co nut Phong (Unit)')

// ── DoiNgu: muc Phong khoa theo quyen ──
console.log('\n=== DoiNgu: muc Phong (Unit) ===')
assert.ok(doiNgu.includes('canViewUnitSection'), 'DoiNgu: phai dung canViewUnitSection de khoa muc Phong')
assert.ok(doiNgu.includes('isLeader'), 'DoiNgu: phai tinh isLeader (UM/BM) tu snapshot Daily')
assert.ok(doiNgu.includes("lv === 'UM' || lv === 'BM'"), "DoiNgu: nhan dien UM/BM qua AGLevel (sheet Agent)")
assert.ok(doiNgu.includes('leaderCode'), 'DoiNgu: nhan dien leader qua LeaderCode (sheet Leader)')
assert.ok(doiNgu.includes('viewMode'), 'DoiNgu: phai co chuyen che do xem Ca nhan / Phong')
assert.ok(doiNgu.includes('🏢 Phòng'), 'DoiNgu: phai co nut/che do Phong')
assert.ok(doiNgu.includes("mode === 'unit'"), "DoiNgu: che do 'unit' chi hieu luc khi co quyen (mode da gan canUnit)")
assert.ok(doiNgu.includes('canUnit ? ('), 'DoiNgu: thanh chuyen che do chi render khi canUnit (an han nut Phong khi khong co quyen)')
console.log('Phong: chi Admin / duoc cap quyen / UM-BM moi thay; the Unit co FYP, Luot Active, IP phat hanh, pending')

// ── DoiNgu: chinh muc Phong theo chot 09/11/2026 (FYC + loc Leader + Luot Active cot BD, bo MOC) ──
console.log('\n=== DoiNgu: Phong theo sheet Leader + Luot Active (cot BD) ===')
// (2) Danh sach Phong chi gom Unit co trong sheet Leader
assert.ok(parseDaily.includes('leaderUnits'), 'parseDaily: phai tra leaderUnits (UnitCode co trong sheet Leader)')
assert.ok(parseDaily.includes("'#Active Agent (FYC) Unit'"), "parseDaily: phai doc cot '#Active Agent (FYC) Unit' (cot BD sheet Leader)")
assert.ok(parseDaily.includes('activeFycUnit'), 'parseDaily: unit phai co truong activeFycUnit (so hoac null)')
assert.ok(napDuLieu.includes('leaderUnits: parsed.leaderUnits'), 'NapDuLieu: payload luu snapshot phai gom leaderUnits')
assert.ok(napDuLieu.includes('leaderUnits: base.data.leaderUnits'), 'NapDuLieu: luong gop Proposal rieng phai giu leaderUnits cua ban goc')
assert.ok(team.includes('filterLeaderUnits'), 'team.js: phai co helper filterLeaderUnits cho muc Phong')
assert.ok(team.includes('activeFycUnit: u && typeof u.activeFycUnit'), 'team.js: buildTeam phai truyen activeFycUnit vao unitView')
assert.ok(doiNgu.includes('filterLeaderUnits(view.team.units, leaderUnits)'), 'DoiNgu: unitRows phai loc qua filterLeaderUnits theo leaderUnits cua snapshot')
assert.ok(doiNgu.includes('Chỉ gồm các phòng có trong sheet Leader'), 'DoiNgu: dau muc Phong phai ghi ro chi gom phong co trong sheet Leader')
console.log('Phong: loc theo leaderUnits (fallback snapshot cu giu nguyen danh sach — kiem chung o test-team)')
// (3) Luot Active thay MOC o the Unit
assert.ok(doiNgu.includes('Lượt Active'), 'DoiNgu: the Unit phai co nhan Luot Active')
assert.ok(doiNgu.includes('số TVV Active theo FYC của phòng (theo sheet Leader)'), 'DoiNgu: phai co dong nguon giai thich Luot Active lay tu sheet Leader')
assert.ok(doiNgu.includes('phòng hiện “–” là file chưa có số'), 'DoiNgu: dong nguon phai giai thich phong hien "–" la file chua co so')
assert.ok(doiNgu.includes('u.activeFycUnit === null'), 'DoiNgu: activeFycUnit null phai hien "–" (khong hien 0)')
assert.ok(!doiNgu.includes('Đủ MOC'), 'DoiNgu: the Unit KHONG con badge Du MOC')
assert.ok(!doiNgu.includes('lượt Act</span>'), 'DoiNgu: the Unit KHONG con badge Thieu luot Act')
assert.ok(!doiNgu.includes('Lượt Act / MOC'), 'DoiNgu: KHONG con nhan Luot Act / MOC')
assert.ok(!doiNgu.includes('MOC_TARGET'), 'DoiNgu: KHONG con dung MOC_TARGET (moc /6 da bo o muc Phong)')
assert.ok(!doiNgu.includes('số MOC chính thức'), 'DoiNgu: KHONG con ghi chu MOC uoc tinh o muc Phong')
console.log('The Unit: Luot Active = cot BD sheet Leader (null -> "–"); da bo moc /6 + badge MOC + ghi chu uoc tinh')
// (1) Dong TVV trong chi tiet Unit hien FYC thang thay FYP thang
assert.ok(doiNgu.includes('FYC {fmtTr(a.fyc)} tr'), 'DoiNgu: dong TVV chi tiet Unit phai hien FYC thang (fmtTr(a.fyc))')
assert.ok(!doiNgu.includes('FYP {fmtTr(a.fyp)} tr · Case Net'), 'DoiNgu: dong TVV chi tiet Unit KHONG con hien FYP thang')
console.log('Chi tiet Unit: dong TVV hien FYC thang; nhom Active giu chuan Case Net')

// ── Avatar toan cuc cho Admin + chi tiet Unit theo UM ──
console.log('\n=== avatar Admin + drill-down Unit ===')
assert.ok(store.includes('avatarUrl: p.avatarUrl'), 'store.js: fetchAllProfiles phai tra avatarUrl (Admin can de thay avatar moi TVV)')
assert.ok(app.includes('avatarMap'), 'App.jsx: phai xay avatarMap {MSDL -> avatarUrl}')
assert.ok(app.includes('avatarMap={avatarMap}'), 'App.jsx: phai truyen avatarMap xuong DoiNgu')
assert.ok(app.includes('p.avatarUrl'), 'App.jsx: avatarMap cua Admin phai lay avatarUrl tu danh sach profiles')
assert.ok(app.includes('profile?.avatarUrl'), 'App.jsx: avatarMap phai gom avatar cua chinh user (profile.avatarUrl)')
assert.ok(doiNgu.includes('avatarMap'), 'DoiNgu: phai nhan prop avatarMap')
assert.ok(doiNgu.includes('avatarOf'), 'DoiNgu: phai co helper avatarOf(msdl) tra avatar theo MSDL')
assert.ok(doiNgu.includes('avatarOf(a.msdl)'), 'DoiNgu: hang TVV + dong chi tiet Unit phai render avatar qua avatarOf')
assert.ok(team.includes('leaderCode: (u && u.leaderCode)'), 'team.js: buildTeam phai giu leaderCode cua Unit (tu sheet Leader)')
assert.ok(team.includes('caseNet: num(a.caseNet)'), 'team.js: agentView phai co caseNet de chi tiet Unit hien can cu Active')
assert.ok(doiNgu.includes('canOpenUnit'), 'DoiNgu: phai co canOpenUnit (Admin chinh hoac leaderCode trung MSDL)')
assert.ok(doiNgu.includes('isMyUnit'), 'DoiNgu: phai co isMyUnit de danh dau Unit cua chinh UM')
assert.ok(doiNgu.includes('Bạn chỉ xem được chi tiết phòng do mình phụ trách.'), 'DoiNgu: bam Unit khong phai cua minh phai hien thong bao khoa')
assert.ok(doiNgu.includes('✅ Đang Active ('), 'DoiNgu: chi tiet Unit phai co nhom Dang Active kem so dem')
assert.ok(doiNgu.includes('⬜ Chưa Active ('), 'DoiNgu: chi tiet Unit phai co nhom Chua Active kem so dem')
assert.ok(doiNgu.includes('Xem chi tiết'), 'DoiNgu: the Unit mo duoc phai co dau hieu bam duoc (Xem chi tiet)')
console.log('Admin thay avatar moi TVV qua avatarMap; chi tiet Unit: Admin mo tat ca, UM chi mo Unit minh dung dau (leaderCode); 2 nhom Active')

// ── Rules: memos doc cong khai ──
console.log('\n=== firestore.rules memos ===')
const memoBlock = fsRules.slice(fsRules.indexOf('match /memos/'))
assert.ok(memoBlock.includes('allow read: if true;'), 'firestore.rules: memos phai cho doc cong khai (allow read: if true)')
assert.ok(memoBlock.includes("request.auth.token.email == 'admin@d07.com'"), 'firestore.rules: memos ghi/xoa van chi Admin chinh')
console.log('memos: read public, write chi Admin chinh')

console.log('\n✅ TAT CA ASSERT DAT (test-access)')
