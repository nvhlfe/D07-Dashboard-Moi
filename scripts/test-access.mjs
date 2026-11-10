// Test RULES HIEN THI + DOI TEN (Lan chot 08/11/2026) bang cach doc
// file tinh — node khong render duoc JSX nen assert tren noi dung file.
// Chay: node scripts/test-access.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import assert from 'node:assert'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const app = read('../src/App.jsx')
const doiNgu = read('../src/components/DoiNgu.jsx')
const memo = read('../src/components/MemoThuVien.jsx')
const html = read('../index.html')
const fsRules = read('../firestore.rules')
const stRules = read('../storage.rules')
const store = read('../src/lib/store.js')
const fbConfig = read('../src/lib/firebaseConfig.js')
const team = read('../src/lib/team.js')
const parseDaily = read('../src/lib/parseDaily.js')
const napDuLieu = read('../src/components/NapDuLieu.jsx')
const css = read('../src/index.css')
const homNay = read('../src/components/HomNay.jsx')
const salesReport = read('../src/components/SalesReport.jsx')
const caNhan = read('../src/components/CaNhan.jsx')
const snapCache = read('../src/lib/snapCache.js')

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

// ── DoiNgu: chinh trinh bay 10/11/2026 (Can chu y thu gon + 2 khoi mau; moi phong 1 mau) ──
console.log('\n=== DoiNgu: Can chu y thu gon + 2 khoi mau; mau rieng tung phong ===')
assert.ok(doiNgu.includes('attnOpen'), 'DoiNgu: khoi Can chu y phai co state thu gon/mo (attnOpen)')
assert.ok(doiNgu.includes('memo-summary-head attn-head'), 'DoiNgu: hang tieu de Can chu y dung chung mau .memo-summary-head cua Memo')
assert.ok(doiNgu.includes('memo-caret'), 'DoiNgu: hang tieu de Can chu y phai co mui ten .memo-caret giong Memo')
assert.ok(doiNgu.includes('Sắp chạm mốc:') && doiNgu.includes('Chưa có hồ sơ:') && doiNgu.includes('Pending lâu nhất:'), 'DoiNgu: hang thu gon phai hien so luong ca 3 nhom')
assert.ok(doiNgu.includes('attn-block attn-block-warn'), 'DoiNgu: phai co khoi mau CAN XU LY (attn-block-warn)')
assert.ok(doiNgu.includes('attn-block attn-block-opp'), 'DoiNgu: phai co khoi mau CO HOI (attn-block-opp)')
assert.ok(doiNgu.includes('⚠️ Cần xử lý'), 'DoiNgu: khoi canh bao phai co tieu de "Can xu ly"')
assert.ok(doiNgu.includes('🎯 Sắp chạm mốc — cơ hội kéo lên'), 'DoiNgu: khoi co hoi phai co tieu de "Sap cham moc — co hoi keo len"')
assert.ok(doiNgu.includes('attn-empty'), 'DoiNgu: nhom rong trong khoi mau phai hien dong "Khong co" (attn-empty)')
assert.ok(doiNgu.includes("from '../lib/unitColors'"), 'DoiNgu: phai import unitColor tu lib/unitColors')
assert.ok(doiNgu.includes('unitColor(u.unit)'), 'DoiNgu: the phong phai lay mau theo unitColor(u.unit)')
assert.ok(doiNgu.includes('unit-dot'), 'DoiNgu: the phong + tieu de chi tiet phai co cham mau .unit-dot')
assert.ok(doiNgu.includes('unit-detail-title'), 'DoiNgu: tieu de chi tiet phong phai co .unit-detail-title mang mau phong')
assert.ok(css.includes('.attn-block-warn'), 'index.css: phai co nen/vien khoi canh bao (.attn-block-warn)')
assert.ok(css.includes('.attn-block-opp'), 'index.css: phai co nen/vien khoi co hoi (.attn-block-opp)')
assert.ok(css.includes('.attn-card'), 'index.css: phai co .attn-card (bo padding nhu .memo-summary)')
assert.ok(css.includes('.unit-dot'), 'index.css: phai co .unit-dot')
console.log('Can chu y: thu gon mac dinh + 2 khoi mau (Can xu ly / Co hoi keo len); moi phong 1 mau on dinh qua unitColors')

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
assert.ok(doiNgu.includes('FYC <b className="num-fyc">{fmtTr(a.fyc)}</b> tr'), 'DoiNgu: dong TVV chi tiet Unit phai hien FYC thang (fmtTr(a.fyc), to mau num-fyc)')
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

// ── Dot 09/11/2026 (tiep theo): FYC thang cap TVV + loc phong + moc 15tr IP + mau so ──
console.log('\n=== FYC thang cap TVV + loc phong + moc 15tr IP + mau so ===')
// Chip sap xep Bang Vang: FYC thang thay FYP thang (rankAgents co key fyc)
assert.ok(doiNgu.includes("{ id: 'fyc', label: 'FYC tháng' }"), "DoiNgu: chip sap xep phai la FYC thang (id 'fyc')")
assert.ok(!doiNgu.includes("{ id: 'fyp', label: 'FYP tháng' }"), "DoiNgu: KHONG con chip sap xep FYP thang cap TVV")
assert.ok(team.includes('fyc: (a) => num(a.fyc)'), 'team.js: RANK_KEYS phai co key fyc (sap theo FYC thang cua agentView)')
// O loc chon phong: select o dau muc Phong, nhan "UnitCode - LeaderName"
assert.ok(doiNgu.includes('unitFilter'), 'DoiNgu: muc Phong phai co state loc phong (unitFilter)')
assert.ok(doiNgu.includes('activeUnitFilter'), 'DoiNgu: phong dang chon khong con ton tai thi tu ve Tat ca (activeUnitFilter)')
assert.ok(doiNgu.includes('shownUnitRows'), 'DoiNgu: danh sach the Phong phai loc theo phong dang chon (shownUnitRows)')
assert.ok(doiNgu.includes('shownUnitRows.map(renderUnitCard)'), 'DoiNgu: render the Phong phai dung shownUnitRows da loc')
assert.ok(doiNgu.includes('🏢 Tất cả phòng'), 'DoiNgu: select loc phong phai co lua chon Tat ca phong')
assert.ok(doiNgu.includes('`${u.unit} - ${u.leaderName}`'), 'DoiNgu: nhan phong trong select phai dang "UnitCode - LeaderName" (nguyen van leaderName)')
assert.ok(doiNgu.includes('unit-filter-select'), 'DoiNgu: select loc phong phai co id unit-filter-select')
console.log('Muc Phong: o loc chon phong (Tat ca / "TUQ - HOÀNG VĂN HƯNG"...), tu ve Tat ca khi phong chon khong con')
// Moc 15tr IP cho TVV Chua Active trong chi tiet Unit
assert.ok(team.includes('ACTIVE_IP_TARGET = 15'), 'team.js: phai co hang ACTIVE_IP_TARGET = 15 (trieu dong IP)')
assert.ok(doiNgu.includes('ACTIVE_IP_TARGET'), 'DoiNgu: phai dung ACTIVE_IP_TARGET cho nhan moc IP')
assert.ok(doiNgu.includes('ACTIVE_IP_TARGET - issuedOf(a)'), 'DoiNgu: so thieu phai tinh = ACTIVE_IP_TARGET - issuedOf(a) (issuedRow — doi tu ipNet sheet Agent theo chot 10/11/2026: toan Tinh Anh 1 chuan IP phat hanh)')
assert.ok(doiNgu.includes('Thiếu {fmtTr(ipGap)} tr tới mốc Active'), 'DoiNgu: TVV Chua Active thieu IP phai co nhan "Thieu ... tr toi moc Active"')
assert.ok(doiNgu.includes('Đã đạt mốc'), 'DoiNgu: TVV Chua Active nhung ipNet >= 15 phai co nhan "Da dat moc"')
assert.ok(doiNgu.includes('renderUnitMember(a, true)'), 'DoiNgu: chi nhom Chua Active moi truyen co nhan moc IP (renderUnitMember(a, true))')
assert.ok(doiNgu.includes('num-short'), 'DoiNgu: so thieu phai to mau do (num-short)')
console.log('Chi tiet Unit: TVV Chua Active co nhan thieu IP toi moc 15tr (cong thuc kiem chung so that o test-team: TUQ 8.11)')
// Mau sac chu so chinh: bo class .num-* trong index.css + dung o cac vi tri chinh
for (const cls of ['.num-fyp', '.num-fyc', '.num-issued', '.num-pending', '.num-pipe', '.num-active', '.num-short']) {
  assert.ok(css.includes(cls), `index.css: phai co class mau so ${cls}`)
}
assert.ok(css.includes('.num-fyc') && css.includes('var(--green)'), 'index.css: FYC -> xanh la (--green)')
assert.ok(css.includes('.num-issued') && css.includes('var(--violet)'), 'index.css: IP phat hanh -> tim (--violet)')
assert.ok(css.includes('.num-pending') && css.includes('var(--pink)'), 'index.css: Pending -> hong (--pink)')
assert.ok(css.includes('.num-pipe') && css.includes('var(--amber)'), 'index.css: Chua len phi -> ho phach (--amber)')
assert.ok(css.includes('.num-short') && css.includes('var(--red)'), 'index.css: So thieu -> do (--red)')
assert.ok(doiNgu.includes('ms-num num-fyp'), 'DoiNgu: mini-stat FYP the Unit phai to mau navy (num-fyp)')
assert.ok(doiNgu.includes('ms-num num-active'), 'DoiNgu: mini-stat Luot Active the Unit phai to mau xanh la (num-active)')
assert.ok(doiNgu.includes('num-issued'), 'DoiNgu: so IP phat hanh phai to mau tim (num-issued)')
assert.ok(doiNgu.includes('num-pending'), 'DoiNgu: so pending phai to mau hong (num-pending)')
console.log('Mau so: index.css co bo .num-* (FYP navy / FYC+Active xanh la / IP tim / Pending hong / Pipe ho phach / Thieu do); DoiNgu da ap dung')

// ── Dot 09/11/2026: hang Bang Vang — SO TO theo tieu chi sap xep + lam dep CSS he thong ──
// Lan khoanh do so to (tong nop) o ban live e15080ad va chot: che do
// FYC thang thi SO TO ben phai PHAI LA FYC thang; chip duoi chi con
// canh bao thieu khi duoi moc. Che do khac khi do giu nguyen tong nop.
// ── Dot sua 10/11/2026: Lan phan hoi tiep — che do IP phat hanh sap
// theo IP nhung so to lai la tong nop (day so khong giam dan). Chot
// nguyen tac SO TO = DUNG tieu chi dang sap: ipNet -> issuedRow
// (dong IF Proposal, issuedOf) + RANK_KEYS.ipNet doi sang issuedRow;
// barTotal -> tong nop nhu cu.
console.log('\n=== hang Bang Vang: so to theo che do FYC + CSS lam dep ===')
assert.ok(doiNgu.includes("sortKey === 'fyc'"), "DoiNgu: khoi so to + chip canh bao phai re nhanh theo sortKey === 'fyc'")
assert.ok(doiNgu.includes('}>{fmtTr(a.fyc)}</span>'), 'DoiNgu: che do FYC -> SO TO ben phai la FYC thang (fmtTr(a.fyc))')
assert.ok(doiNgu.includes("a.fyc < FYC_FLOOR ? 'num-short' : 'num-fyc'"), 'DoiNgu: so to FYC phai to mau theo moc FYC_FLOOR (duoi moc -> num-short do; dat moc -> num-fyc xanh la)')
assert.ok(doiNgu.includes('FYC tháng · {fmtCaseSub(a.caseSub)} HS'), 'DoiNgu: che do FYC -> dong phu duoi so to ghi "FYC tháng · N HS" (giu thong tin so ho so)')
assert.ok(doiNgu.includes('fmtTr(bar.total)'), 'DoiNgu: che do barTotal SO TO van la TONG NOP (fmtTr(bar.total)) — giu nguyen cach tinh')
assert.ok(doiNgu.includes('fmtTr(issuedOf(a))'), 'DoiNgu: che do ipNet SO TO phai la issuedRow qua issuedOf(a) (dot sua 10/11/2026)')
assert.ok(doiNgu.includes("sortKey === 'ipNet'"), "DoiNgu: khoi so to phai re nhanh rieng cho sortKey === 'ipNet'")
assert.ok(doiNgu.includes('IP phát hành · {fmtCaseSub(a.caseSub)} hồ sơ'), 'DoiNgu: che do ipNet -> dong phu ghi "IP phát hành · N hồ sơ"')
assert.ok(doiNgu.includes('Tổng nộp · {fmtCaseSub(a.caseSub)} hồ sơ'), 'DoiNgu: che do barTotal -> dong phu ghi "Tổng nộp · N hồ sơ"')
assert.ok(team.includes('ipNet: (a) => issuedOf(a)'), 'team.js: RANK_KEYS.ipNet phai xep theo issuedOf (issuedRow) de thu tu khop so to')
assert.ok(team.includes('export function issuedOf'), 'team.js: phai co helper issuedOf (issuedRow, fallback ipNet)')
assert.ok(!doiNgu.includes('FYC tháng: {a.fyc < FYC_FLOOR'), 'DoiNgu: KHONG con dong chip trung so "FYC tháng: X tr" (so to da la FYC)')
console.log('Hang Bang Vang: FYC -> so to = FYC thang; ipNet -> so to = issuedRow (IP phat hanh theo dong); barTotal -> so to = tong nop')
// Moc canh bao FYC toi thieu: chip chi con nhanh canh bao thieu (Lan chot 09/11/2026)
assert.ok(team.includes('export const FYC_FLOOR = 5'), 'team.js: phai co hang FYC_FLOOR = 5 (moc FYC thang toi thieu, trieu dong)')
assert.ok(doiNgu.includes('FYC_FLOOR'), 'DoiNgu: phai dung hang FYC_FLOOR tu lib/team')
assert.ok(doiNgu.includes("sortKey === 'fyc' && a.fyc < FYC_FLOOR"), 'DoiNgu: chip canh bao chi hien khi che do FYC VA fyc < FYC_FLOOR')
assert.ok(doiNgu.includes('className="bv-fyc lack"'), 'DoiNgu: chip canh bao phai dung class bv-fyc lack (tong do)')
assert.ok(doiNgu.includes('Thiếu {fmtTr(FYC_FLOOR - a.fyc)} tr (mốc {FYC_FLOOR}tr FYC)'), 'DoiNgu: phai co nhan thieu theo cong thuc FYC_FLOOR - a.fyc kem moc 5tr FYC')
assert.ok(css.includes('.bv-fyc.lack'), 'index.css: phai co bien the chip canh bao .bv-fyc.lack (tong do nhat)')
assert.ok(css.includes('.bv-total-num.num-fyc') && css.includes('.bv-total-num.num-short'), 'index.css: so to Bang Vang phai nhan mau num-fyc/num-short (selector .bv-total-num.num-*)')
console.log('Moc FYC: fyc < 5tr -> so to to do + chip "Thieu ... tr (moc 5tr FYC)"; >= 5tr so to xanh la, khong chip')
// Viec B: cac lop trinh bay moi chinh trong index.css
assert.ok(css.includes('.bv-fyc'), 'index.css: phai co class .bv-fyc cho dong chip FYC')
assert.ok(css.includes('linear-gradient(180deg, #ffffff 0%, #f6f9fc 100%)'), 'index.css: the .card phai co nen gradient nhe (trang -> xanh xam nhat)')
assert.ok(css.includes('0 10px 28px rgba(8, 36, 64, 0.08)'), 'index.css: --shadow-card phai la bong mem 2 lop moi')
assert.ok(css.includes('linear-gradient(135deg, #fef3c7'), 'index.css: hang 1 Bang Vang phai co nen nhan gradient vang am (.bv-r1)')
assert.ok(css.includes('linear-gradient(135deg, #e2e8f0'), 'index.css: hang 2 Bang Vang phai co nen nhan gradient bac (.bv-r2)')
assert.ok(css.includes('linear-gradient(135deg, #fed7aa'), 'index.css: hang 3 Bang Vang phai co nen nhan gradient dong (.bv-r3)')
assert.ok(css.includes('0 0 0 4px #93c5fd'), 'index.css: avatar Diamond phai co vong ring ngoai cung tong (.bv-av-dia)')
assert.ok(css.includes('0 0 0 4px #fbbf24'), 'index.css: avatar Gold phai co vong ring ngoai cung tong (.bv-av-gold)')
assert.ok(css.includes('linear-gradient(90deg, #6d28d9, #8b5cf6)'), 'index.css: doan thanh Phat hanh phai la gradient tim (.bv-seg-issued/.seg-issued)')
assert.ok(css.includes('linear-gradient(135deg, var(--navy) 0%, #1a56a8 100%)'), 'index.css: chip dang chon (.fchip.active) phai la pill gradient navy')
assert.ok(css.includes('.mini-stat:has(> .ms-num.num-fyc)'), 'index.css: mini-stat chua so FYC phai co dai nhan mau vien tren (:has num-fyc)')
assert.ok(css.includes('.mini-stat:has(> .ms-num.num-issued)'), 'index.css: mini-stat chua so IP phat hanh phai co dai nhan mau vien tren (:has num-issued)')
assert.ok(css.includes('.kpi.blue { border-left-color: #2563eb; }'), 'index.css: KPI phai co dai nhan mau canh trai theo tong the (.kpi.blue...)')
assert.ok(css.includes('.nav-btn.active .ic'), 'index.css: tab day dang chon phai noi icon (.nav-btn.active .ic)')
console.log('CSS lam dep: the gradient + bong 2 lop; top 3 nen huy chuong; avatar ring; thanh gradient; chip gradient navy; mini-stat/KPI dai nhan mau; tab day noi')

// ── Responsive 3 muc thiet bi (Lan yeu cau 09/11/2026) ──
console.log('\n=== responsive: phone giu nguyen / pad 640 / laptop 1024 ===')
const homNayR = read('../src/components/HomNay.jsx')
const salesReportR = read('../src/components/SalesReport.jsx')
const caNhanR = read('../src/components/CaNhan.jsx')
// Phone <640px giu nguyen: rule goc cua khung app KHONG bi sua
assert.ok(css.includes('.app-shell { max-width: 560px; margin: 0 auto; padding: 0 12px 96px; }'), 'index.css: rule goc .app-shell (phone) phai con nguyen, responsive chi them trong media query')
assert.ok(css.includes('@media (min-width: 640px)'), 'index.css: phai co breakpoint pad @media (min-width: 640px)')
assert.ok(css.includes('@media (min-width: 1024px)'), 'index.css: phai co breakpoint laptop @media (min-width: 1024px)')
const tb = css.slice(css.indexOf('@media (min-width: 640px)'), css.indexOf('@media (min-width: 1024px)'))
const dk = css.slice(css.indexOf('@media (min-width: 1024px)'))
// Pad 640–1023: khung ~880px, Unit 2 cot, Memo 3 cot, chi so 3 cot
assert.ok(tb.includes('.app-shell { max-width: 912px'), 'responsive 640: .app-shell phai noi rong toi ~880px noi dung')
assert.ok(tb.includes('.unit-grid { display: grid; grid-template-columns: 1fr 1fr'), 'responsive 640: the Unit phai xep 2 cot (.unit-grid)')
assert.ok(tb.includes('.unit-card:has(.unit-detail)'), 'responsive 640: the Unit dang mo chi tiet phai chiem tron hang (:has .unit-detail)')
assert.ok(tb.includes('.memo-grid { grid-template-columns: repeat(3, 1fr); }'), 'responsive 640: thu vien Memo phai 3 cot')
assert.ok(tb.includes('.bv-ref-grid { grid-template-columns: repeat(3, 1fr); }'), 'responsive 640: luoi chi so phai 3 cot')
// Laptop >=1024: sidebar trai 232px + noi dung 1240px
assert.ok(dk.includes('.app-shell { max-width: 1528px'), 'responsive 1024: .app-shell phai tinh ca sidebar (max-width 1528px)')
assert.ok(dk.includes('width: 232px'), 'responsive 1024: .bottom-nav phai thanh sidebar rong 232px')
assert.ok(dk.includes('.bottom-nav .inner') && dk.includes('display: flex; flex-direction: column'), 'responsive 1024: cac nut dieu huong phai xep doc (.inner flex column)')
assert.ok(dk.includes('.nav-btn') && dk.includes('flex-direction: row'), 'responsive 1024: nut dieu huong phai nam ngang (icon + nhan canh nhau)')
assert.ok(dk.includes('.kpi-grid { grid-template-columns: repeat(4, 1fr); }'), 'responsive 1024: KPI phai 1 hang 4 o')
assert.ok(dk.includes('.home-2col { display: grid'), 'responsive 1024: Top 5 + Nhip nop phai co luoi 2 cot (.home-2col)')
assert.ok(dk.includes('.bv-list { display: grid; grid-template-columns: 1fr 1fr'), 'responsive 1024: Bang Vang phai luoi 2 cot (.bv-list)')
assert.ok(dk.includes(':has(.bv-expand)'), 'responsive 1024: hang Bang Vang dang mo chi tiet phai chiem tron hang (:has .bv-expand)')
assert.ok(dk.includes('minmax(340px, 1fr)'), 'responsive 1024: the Unit phai tu chia 2–3 cot (auto-fill minmax 340px)')
assert.ok(dk.includes('.day-group .day-head { grid-column: 1 / -1; }'), 'responsive 1024: header ngay Sales Report phai chiem tron hang')
assert.ok(dk.includes('.memo-grid { grid-template-columns: repeat(4, 1fr); }'), 'responsive 1024: thu vien Memo phai 4 cot')
assert.ok(dk.includes('.bv-ref-grid { grid-template-columns: repeat(4, 1fr); }'), 'responsive 1024: luoi chi so phai 4 cot')
assert.ok(dk.includes('.me-groups { display: grid; grid-template-columns: repeat(3, 1fr)'), 'responsive 1024: 3 nhom ho so Ca nhan phai xep canh nhau (.me-groups)')
assert.ok(dk.includes('.nap-wrap > .card:first-child { grid-column: 1 / -1; }'), 'responsive 1024: the tai file o tab Nap phai chiem tron hang')
// Wrapper JSX toi thieu (div khoi thuong o phone, chi CSS trong media query moi tao luoi)
assert.ok(homNayR.includes('className="home-2col"'), 'HomNay: phai boc Top 5 + Nhip nop trong .home-2col')
assert.ok(doiNgu.includes('className="bv-list"'), 'DoiNgu: danh sach Bang Vang phai boc trong .bv-list')
assert.ok(doiNgu.includes('className="unit-grid"'), 'DoiNgu: danh sach the Unit phai boc trong .unit-grid')
assert.ok(salesReportR.includes('className="day-group"'), 'SalesReport: nhom ngay phai co class .day-group')
assert.ok(salesReportR.includes('className="sr-flat-grid"'), 'SalesReport: danh sach phang Pending phai boc trong .sr-flat-grid')
assert.ok(caNhanR.includes('className="me-groups"'), 'CaNhan: 3 nhom ho so phai boc trong .me-groups')
assert.ok(napDuLieu.includes('className="nap-wrap"'), 'NapDuLieu: goc phai co class .nap-wrap')
console.log('Responsive: phone giu nguyen (rule goc con nguyen); pad 640 khung 880/Unit 2 cot/Memo 3 cot; laptop 1024 sidebar 232px + KPI 4 o + Bang Vang 2 cot + Unit auto 2–3 cot + SR 2 cot + Memo 4 cot + Ca nhan 3 nhom canh nhau + Nap 2 cot')

// ── Sales Report: che do Theo TVV (phan loai) — PHAN TICH PE da
// CHUYEN SANG TINH ANH (dot chuyen PE 10/11/2026, Lan yeu cau vi
// Sales Report qua nhieu thong tin). Khoa ca 2 chieu: Sales Report
// KHONG con khoi phan tich PE; DoiNgu PHAI co du 4 vi tri PE moi. ──
console.log('\n=== Sales Report: Theo TVV (phan loai) + PE da chuyen sang Tinh Anh ===')
assert.ok(salesReportR.includes("import { segToTier, tierById } from '../lib/pe'"), 'SalesReport: chi con import segToTier/tierById cua lib/pe cho HUY HIEU hang hien tai (nhan phan loai)')
assert.ok(salesReportR.includes("import { issuedOf } from '../lib/team'"), 'SalesReport: IP phat hanh phai dung issuedOf cua team.js (cung dinh nghia Bang Vang)')
assert.ok(salesReportR.includes('📄 Theo hồ sơ') && salesReportR.includes('🧑‍💼 Theo TVV'), 'SalesReport: phai co 2 nut chuyen che do xem')
assert.ok(salesReportR.includes("viewMode === 'cases'"), 'SalesReport: che do Theo ho so phai giu nguyen lam mac dinh')
assert.ok(salesReportR.includes('className="sr-strip"'), 'SalesReport: phai co dai tom tat dau trang')
assert.ok(salesReportR.includes('✓ Đã Active tháng này'), 'SalesReport: dai tom tat GIU phan so Da Active thang nay')
assert.ok(salesReportR.includes('className="sr-agent-grid"'), 'SalesReport: danh sach TVV phai boc trong .sr-agent-grid')
assert.ok(salesReportR.includes('pe-badge'), 'SalesReport: the TVV GIU huy hieu hang hien tai nho (.pe-badge — nhan phan loai)')
// Phan PHAN TICH PE da go khoi Sales Report (khoa khong tai xuat)
assert.ok(!salesReportR.includes('Sắp lên hạng PE'), 'SalesReport: DA GO khoi Sap len hang PE (da chuyen sang Tinh Anh)')
assert.ok(!salesReportR.includes('Đường tới hạng'), 'SalesReport: DA GO khoi Duong toi hang PE trong the TVV')
assert.ok(!salesReportR.includes('Hạng tạm tính'), 'SalesReport: DA GO ghi chu/mo ta hang tam tinh PE')
assert.ok(!salesReportR.includes('nearRankList'), 'SalesReport: DA GO nearRankList (khong con tinh Sap len hang)')
assert.ok(!salesReportR.includes('peStatus'), 'SalesReport: DA GO peStatus (khong con tinh hang tam tinh)')
assert.ok(!salesReportR.includes('quarterMonths'), 'SalesReport: DA GO co che nap snapshots quy (chi phuc vu PE)')
assert.ok(!salesReportR.includes('Kim Cương:'), 'SalesReport: dai tom tat DA GO cac so theo hang (Kim Cuong/Bach Kim/Vang)')
assert.ok(!salesReportR.includes('strip.tiers'), 'SalesReport: dai tom tat DA GO phan dem theo hang (strip.tiers)')
console.log('Sales Report: giu Theo ho so + Theo TVV phan loai (huy hieu hang, loc Active, dai Active); phan tich PE da go sach')
// Tinh Anh (DoiNgu) nhan phan tich PE: 4 vi tri + gate nhu Can chu y
assert.ok(doiNgu.includes("from '../lib/pe'"), 'DoiNgu: phai import lib/pe (peStatus/nearRankList/quarterMonths...)')
assert.ok(doiNgu.includes('nearRankList') && doiNgu.includes('peStatus'), 'DoiNgu: phai dung nearRankList + peStatus cua lib/pe')
assert.ok(doiNgu.includes('Phân hạng PE hiện tại'), 'DoiNgu: the tong quan phai co dai tong quan phan hang PE hien tai')
assert.ok(doiNgu.includes('🎯 Sắp lên hạng PE'), 'DoiNgu: phai co khoi thu gon Sap len hang PE')
assert.ok(doiNgu.includes('peNearOpen'), 'DoiNgu: khoi Sap len hang PE phai co state thu gon/mo (peNearOpen)')
assert.ok(doiNgu.includes('🎯 Đường tới hạng PE'), 'DoiNgu: chi tiet TVV phai co khoi Duong toi hang PE')
assert.ok(doiNgu.includes('Hạng tạm tính theo tiêu chí memo'), 'DoiNgu: khoi Duong toi hang PE phai co ghi chu hang tam tinh theo memo')
assert.ok(doiNgu.includes('PE_BADGE_CLASS') && doiNgu.includes('pe-badge'), 'DoiNgu: hang Bang Vang phai co huy hieu hang hien tai nho (.pe-badge)')
assert.ok(doiNgu.includes('đang tính trên'), 'DoiNgu: khoi Sap len hang PE phai ghi chu so thang co du lieu trong quy khi thieu thang')
assert.ok(css.includes('.sr-strip-item'), 'index.css: phai co style dai tom tat (.sr-strip-item)')
assert.ok(css.includes('.pe-badge-dia') && css.includes('.pe-progress'), 'index.css: phai co style huy hieu PE + thanh tien do (.pe-badge/.pe-progress)')
assert.ok(dk.includes('.sr-agent-grid { display: grid; grid-template-columns: 1fr 1fr'), 'responsive 1024: the TVV phai xep 2 cot (.sr-agent-grid)')
console.log('Tinh Anh PE: dai phan hang o tong quan; khoi Sap len hang (gate Admin/truong phong nhu Can chu y); huy hieu hang tren hang Bang Vang; Duong toi hang PE trong chi tiet TVV')

// ── Rules: memos doc cong khai ──
console.log('\n=== firestore.rules memos ===')
const memoBlock = fsRules.slice(fsRules.indexOf('match /memos/'))
assert.ok(memoBlock.includes('allow read: if true;'), 'firestore.rules: memos phai cho doc cong khai (allow read: if true)')
assert.ok(memoBlock.includes("request.auth.token.email == 'admin@prud07.top'"), 'firestore.rules: memos ghi/xoa van chi Admin chinh')
console.log('memos: read public, write chi Admin chinh')

// ── Rules: daily_sales_tvv DOC cong khai, GHI van khoa (Lan chot 09/11/2026) ──
// Mo xem du lieu Trang Chu / Tinh Anh khong can dang nhap tren domain
// sales.prud07.top — chi noi DUNG 1 khoi nay; cac collection khac
// (dac biet user_profiles) TUYET DOI khong noi theo.
console.log('\n=== firestore.rules daily_sales_tvv + user_profiles ===')
const dailyBlock = fsRules.slice(fsRules.indexOf('match /daily_sales_tvv/'), fsRules.indexOf('match /user_profiles/'))
assert.ok(/allow read:\s+if true;/.test(dailyBlock), 'firestore.rules: daily_sales_tvv phai cho doc cong khai (allow read: if true)')
assert.ok(!/allow read:\s+if request\.auth != null;/.test(dailyBlock), 'firestore.rules: daily_sales_tvv KHONG con khoa doc theo dang nhap')
assert.ok(/allow write:\s+if request\.auth != null;/.test(dailyBlock), 'firestore.rules: daily_sales_tvv GHI van chi user da dang nhap')
assert.ok(!/allow write:\s+if true/.test(dailyBlock), 'firestore.rules: daily_sales_tvv KHONG duoc mo ghi cong khai')
assert.ok(!dailyBlock.includes('allow read, write'), 'firestore.rules: daily_sales_tvv khong gop read,write (doc/ghi phai tach dieu kien)')
console.log('daily_sales_tvv: read public (khach xem duoc), write van auth')
// user_profiles KHONG bi noi: van chi chinh user + Admin chinh
const profilesBlock = fsRules.slice(fsRules.indexOf('match /user_profiles/'), fsRules.indexOf('match /case_adjustments/'))
assert.ok(profilesBlock.includes('request.auth.uid == uid'), 'firestore.rules: user_profiles van chi chinh user (request.auth.uid == uid)')
assert.ok(profilesBlock.includes("request.auth.token.email == 'admin@prud07.top'"), 'firestore.rules: user_profiles van co lop Admin chinh (admin@prud07.top)')
assert.ok(!/allow read:\s+if true/.test(profilesBlock), 'firestore.rules: user_profiles KHONG duoc noi doc cong khai')
assert.ok(!/allow (create, update|write):\s+if true/.test(profilesBlock), 'firestore.rules: user_profiles KHONG duoc noi ghi cong khai')
console.log('user_profiles: giu nguyen — chi minh + Admin chinh, khong doc/ghi cong khai')
// Cac collection cua dashboard cu van khoa theo dang nhap (chot: khong noi khoi nao khac)
const reportsBlock = fsRules.slice(fsRules.indexOf('match /reports/'), fsRules.indexOf('match /tvv_directory/'))
assert.ok(/allow read:\s+if request\.auth != null;/.test(reportsBlock), 'firestore.rules: reports (dashboard cu) van chi user dang nhap moi doc')
assert.ok(!/allow read:\s+if true/.test(reportsBlock), 'firestore.rules: reports KHONG bi noi doc cong khai')
console.log('reports (dashboard cu): giu nguyen khoa dang nhap — chi daily_sales_tvv duoc noi')

// ── Email Admin chinh: admin@prud07.top, email cu da thay han (Lan chot 09/11/2026) ──
// Email cu kiem tra bang chuoi GHEP de chinh file test nay khong chua
// literal email cu — assert nay khoa ca src/ lan 2 file rules.
console.log('\n=== email Admin chinh moi ===')
const OLD_ADMIN = 'admin@' + 'd07.com'
assert.ok(fbConfig.includes("SUPER_ADMIN_EMAILS = ['admin@prud07.top']"), 'firebaseConfig: SUPER_ADMIN_EMAILS phai la admin@prud07.top')
assert.ok(!fbConfig.includes(OLD_ADMIN), 'firebaseConfig: khong con email Admin cu')
assert.ok(stRules.includes("request.auth.token.email == 'admin@prud07.top'"), 'storage.rules: ghi Memo van chi Admin chinh (email moi)')
assert.ok(!stRules.includes(OLD_ADMIN), 'storage.rules: khong con email Admin cu')
assert.ok(!fsRules.includes(OLD_ADMIN), 'firestore.rules: khong con email Admin cu')
assert.ok(!app.includes(OLD_ADMIN), 'App.jsx: khong con email Admin cu (comment/placeholder)')
{
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = new URL(e.name + (e.isDirectory() ? '/' : ''), dir)
    return e.isDirectory() ? walk(p) : [p]
  })
  const srcFiles = walk(new URL('../src/', import.meta.url)).filter((u) => /\.(js|jsx)$/.test(u.pathname))
  assert.ok(srcFiles.length > 0, 'quyet src: phai co file .js/.jsx de quet')
  for (const u of srcFiles) {
    assert.ok(!readFileSync(u, 'utf8').includes(OLD_ADMIN), `src: ${u.pathname.split('/src/')[1]} khong con email Admin cu`)
  }
}
console.log('Admin chinh = admin@prud07.top o code + firestore.rules + storage.rules; email cu khong con o bat ky file src nao')

// ── Toi uu toc do tai du lieu (09/11/2026): chi tai dung doc can ──
console.log('\n=== toi uu tai du lieu ===')
assert.ok(!store.includes("getDocs(collection(fs, 'daily_sales_tvv'))"), 'store: fetchFirestoreSnapshots KHONG con getDocs toan bo collection daily_sales_tvv')
assert.ok(!store.includes('getDocs(query(dailyCol'), 'store: KHONG con bat ky query getDocs nao tren daily_sales_tvv')
// Sua gap 09/11/2026: query sap xep theo __name__ DESC doi composite index
// ma project khong co -> FAILED-PRECONDITION ngay buoc dau, app chi con
// cache may. Khoa che do cu: store KHONG duoc chua lai cac mau query do.
assert.ok(!store.includes('documentId()'), 'store: KHONG con documentId() (query __name__ DESC thieu composite index -> FAILED-PRECONDITION)')
assert.ok(!store.includes("orderBy(documentId()"), "store: KHONG con orderBy(documentId()...) sap xep theo khoa chinh")
assert.ok(!store.includes('limitToLast'), 'store: KHONG con limitToLast (bien the asc cung loi index)')
// Co che thay the: DO DOC bang getDoc theo ngay (id doc = ngay du lieu)
assert.ok(store.includes("getDoc(doc(fs, 'daily_sales_tvv', ymd))"), "store: phai doc tung doc bang getDoc(doc(fs, 'daily_sales_tvv', ymd)) — co che do theo ngay")
assert.ok(store.includes('probeDaysBack') && store.includes('monthProbeDays'), 'store: danh sach ngay do phai sinh tu snapCache (probeDaysBack / monthProbeDays)')
assert.ok(store.includes('localTodayYmd()'), 'store: neo do doc moi nhat la HOM NAY theo gio dia phuong (localTodayYmd)')
assert.ok(store.includes('PROBE_MAX_DAYS = 45'), 'store: tran do doc moi nhat/lien truoc la 45 ngay (PROBE_MAX_DAYS)')
assert.ok(store.includes('fetchMonthSnapshots'), 'store: co fetchMonthSnapshots cho tai LAZY theo thang (Sales Report)')
assert.ok(store.includes('persistentLocalCache') && store.includes('persistentMultipleTabManager'), 'store: Firestore bat persistent cache (IndexedDB) + multiple tab manager')
assert.ok(store.includes('initializeFirestore'), 'store: dung initializeFirestore de cau hinh persistent cache')
assert.ok(store.includes('persistSnapshots'), 'store: co persistSnapshots de luu ban da gop vao cache may sau khi fetch')
assert.ok(app.includes('persistSnapshots(merged)'), 'App: reload luu lai ban merged vao cache may sau khi fetch may')
assert.ok(app.includes('remoteSettled'), 'App: co trang thai remoteSettled cho luot tai dau')
assert.ok(app.includes('ensureMonth'), 'App: co ensureMonth tai lazy thang cho Sales Report')
assert.ok(homNay.includes('remoteSettled') && homNay.includes('Đang tải dữ liệu…'), 'HomNay: chua settled thi hien dang tai, khong hien man rong')
assert.ok(doiNgu.includes('remoteSettled'), 'DoiNgu: nhan remoteSettled cho trang thai tai')
assert.ok(caNhan.includes('remoteSettled'), 'CaNhan: nhan remoteSettled cho trang thai tai')
assert.ok(salesReport.includes('remoteSettled') && salesReport.includes('onNeedMonth'), 'SalesReport: nhan remoteSettled + onNeedMonth (tai lazy thang)')
assert.ok(snapCache.includes('neededSnapIds') && snapCache.includes('pruneSnapshots'), 'snapCache: co neededSnapIds + pruneSnapshots (cat cache theo dung luong)')
console.log('Fetch gioi han + persistent cache + cache theo dung luong + trang thai tai da khoa bang assert')

// ── PWA co ban (10/11/2026): manifest + icons SVG, KHONG service worker ──
// Icon dung SVG (file van ban) vi cong cu push cua du an chi nhan UTF-8,
// khong nhan PNG nhi phan. Danh doi: iOS khong ho tro SVG cho
// apple-touch-icon nen index.html da BO the do (khong con tham chieu PNG).
console.log('\n=== PWA: manifest + icons SVG + khong SW ===')
assert.ok(html.includes('<link rel="manifest" href="/manifest.webmanifest" />'), 'index.html: phai co <link rel="manifest">')
assert.ok(html.includes('name="theme-color"'), 'index.html: phai co meta theme-color')
assert.ok(!html.includes('apple-touch-icon'), 'index.html: da bo apple-touch-icon (iOS khong dung duoc SVG)')
assert.ok(!html.includes('/icons/') || !/\.png/.test(html), 'index.html: khong con tham chieu icon PNG nao')
{
  const manifest = JSON.parse(read('../public/manifest.webmanifest'))
  assert.strictEqual(manifest.name, 'Prudential Quận 7 — Dashboard D07', 'manifest: name day du')
  assert.strictEqual(manifest.short_name, 'D07 Dashboard', 'manifest: short_name')
  assert.strictEqual(manifest.display, 'standalone', 'manifest: display standalone')
  assert.ok(manifest.theme_color && manifest.background_color, 'manifest: co theme_color + background_color')
  const icons = manifest.icons || []
  assert.ok(icons.length >= 2, 'manifest: phai co it nhat 2 icon (any + maskable)')
  assert.ok(icons.some((i) => i.purpose === 'any'), 'manifest: phai co icon purpose "any"')
  assert.ok(icons.some((i) => i.purpose === 'maskable'), 'manifest: phai co icon maskable')
  for (const ic of icons) {
    assert.strictEqual(ic.type, 'image/svg+xml', `manifest: icon ${ic.src} phai la SVG`)
    assert.strictEqual(ic.sizes, 'any', `manifest: icon ${ic.src} phai khai sizes "any"`)
    assert.ok(!String(ic.src).endsWith('.png'), `manifest: icon ${ic.src} khong duoc la PNG`)
    // File icon phai ton tai that trong public/ va la SVG tu chua hop le
    const url = new URL(`../public${ic.src}`, import.meta.url)
    assert.ok(existsSync(url), `public: thieu file icon ${ic.src}`)
    const svg = readFileSync(url, 'utf8')
    assert.ok(svg.includes('<svg') && svg.includes('xmlns="http://www.w3.org/2000/svg"'), `${ic.src}: phai la SVG tu chua hop le`)
    assert.ok(!/href=|xlink:href|url\(http/.test(svg), `${ic.src}: SVG khong duoc tham chieu ngoai`)
  }
  const mask = readFileSync(new URL('../public/icons/icon-maskable.svg', import.meta.url), 'utf8')
  assert.ok(mask.includes('scale(0.56)'), 'icon-maskable.svg: noi dung phai thu vao vung dem an toan (~22%)')
  // TUYET DOI khong service worker (chot an toan: chi cai VO app,
  // khong luu tru du lieu -> khong bao gio hien so cu)
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = new URL(e.name + (e.isDirectory() ? '/' : ''), dir)
    return e.isDirectory() ? walk(p) : [p]
  })
  for (const u of walk(new URL('../src/', import.meta.url))) {
    assert.ok(!readFileSync(u, 'utf8').includes('serviceWorker'), `src: ${u.pathname.split('/src/')[1]} KHONG duoc dang ky service worker`)
  }
  const pubFiles = readdirSync(new URL('../public/', import.meta.url))
  assert.ok(!pubFiles.some((f) => /sw|service-worker/i.test(f)), 'public/: KHONG co file service worker')
}
console.log('PWA: manifest hop le + icons SVG ton tai that + khong SW o ca src lan public')

// ── Dot 10/11/2026: Can chu y + Huy hieu/Tien bo (hien dien o UI);
//    ⑧ Pace DA GO HAN theo chot cua Lan (thay thua) — assert khoa o duoi ──
console.log('\n=== tinh nang ⑥⑦ hien dien o UI (⑧ Pace da go) ===')
const attentionSrc = read('../src/lib/attention.js')
const badgesSrc = read('../src/lib/badges.js')
assert.ok(attentionSrc.includes('export function buildAttentionList'), 'lib/attention.js: phai co buildAttentionList')
assert.ok(doiNgu.includes('buildAttentionList'), 'DoiNgu: phai dung buildAttentionList cho khoi Can chu y')
assert.ok(doiNgu.includes('Cần chú ý hôm nay'), 'DoiNgu: phai co khoi "Can chu y hom nay"')
assert.ok(doiNgu.includes('Sắp chạm mốc'), 'DoiNgu: khoi Can chu y phai co nhom Sap cham moc')
assert.ok(doiNgu.includes('Pending lâu nhất'), 'DoiNgu: khoi Can chu y phai co nhom Pending lau nhat')
assert.ok(badgesSrc.includes('export function agentBadges') && badgesSrc.includes('export function progressRank'), 'lib/badges.js: phai co agentBadges + progressRank')
assert.ok(doiNgu.includes('agentBadges'), 'DoiNgu: hang Bang Vang phai gan huy hieu qua agentBadges')
assert.ok(doiNgu.includes('bv-badges'), 'DoiNgu: hang Bang Vang phai co khoi icon huy hieu .bv-badges')
assert.ok(doiNgu.includes('Tiến bộ nhất'), 'DoiNgu: phai co khoi "Tien bo nhat" duoi Bang Vang')
assert.ok(doiNgu.includes('so với tháng trước'), 'DoiNgu: khoi Tien bo phai ghi chu "so voi thang truoc"')
assert.ok(doiNgu.includes('onNeedMonth'), 'DoiNgu: phai nhan onNeedMonth de tai lazy thang truoc cho hang Tien bo')
assert.ok(app.includes('onNeedMonth={ensureMonth}'), 'App.jsx: phai truyen onNeedMonth (ensureMonth) xuong cac man can tai lazy thang')
assert.ok(caNhan.includes('agentBadges'), 'CaNhan: phai liet ke huy hieu cua chinh minh qua agentBadges')
assert.ok(caNhan.includes('Huy hiệu tháng này'), 'CaNhan: phai co nhan "Huy hieu thang nay" kem chip co chu')
// ⑧ Pace (Nhip do ve dich) — Lan chot GO HAN 10/11/2026: khoa khong cho
// tai xuat o lib / UI / CSS (theo mau assert khoa khong-service-worker).
assert.ok(!existsSync(new URL('../src/lib/pace.js', import.meta.url)), 'lib/pace.js: DA GO — file khong duoc ton tai')
assert.ok(!existsSync(new URL('./test-pace.mjs', import.meta.url)), 'scripts/test-pace.mjs: DA GO — file khong duoc ton tai')
assert.ok(!homNay.includes('PaceChart') && !homNay.includes('Nhịp độ về đích') && !homNay.includes('lib/pace'), 'HomNay: DA GO pace — khong con PaceChart / khoi "Nhip do ve dich" / import lib/pace')
assert.ok(!read('../src/components/Charts.jsx').includes('PaceChart'), 'Charts.jsx: DA GO pace — khong con component PaceChart')
assert.ok(!css.includes('.pace-'), 'index.css: DA GO pace — khong con class .pace-*')
console.log('⑥ Can chu y (chi Admin/truong phong — loc o DoiNgu) · ⑦ huy hieu + Tien bo nhat (lazy thang truoc) · ⑧ Pace DA GO (khoa khong tai xuat)')

console.log('\n✅ TAT CA ASSERT DAT (test-access)')
