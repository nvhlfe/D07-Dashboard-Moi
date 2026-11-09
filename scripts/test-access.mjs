// Test RULES HIEN THI + DOI TEN (Lan chot 08/11/2026) bang cach doc
// file tinh — node khong render duoc JSX nen assert tren noi dung file.
// Chay: node scripts/test-access.mjs
import { readFileSync, readdirSync } from 'node:fs'
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
assert.ok(doiNgu.includes('ACTIVE_IP_TARGET - (Number(a.ipNet) || 0)'), 'DoiNgu: so thieu phai tinh = ACTIVE_IP_TARGET - ipNet')
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
// canh bao thieu khi duoi moc. Che do khac giu nguyen tong nop.
console.log('\n=== hang Bang Vang: so to theo che do FYC + CSS lam dep ===')
assert.ok(doiNgu.includes("sortKey === 'fyc'"), "DoiNgu: khoi so to + chip canh bao phai re nhanh theo sortKey === 'fyc'")
assert.ok(doiNgu.includes('}>{fmtTr(a.fyc)}</span>'), 'DoiNgu: che do FYC -> SO TO ben phai la FYC thang (fmtTr(a.fyc))')
assert.ok(doiNgu.includes("a.fyc < FYC_FLOOR ? 'num-short' : 'num-fyc'"), 'DoiNgu: so to FYC phai to mau theo moc FYC_FLOOR (duoi moc -> num-short do; dat moc -> num-fyc xanh la)')
assert.ok(doiNgu.includes('FYC tháng · {fmtCaseSub(a.caseSub)} HS'), 'DoiNgu: che do FYC -> dong phu duoi so to ghi "FYC tháng · N HS" (giu thong tin so ho so)')
assert.ok(doiNgu.includes('fmtTr(bar.total)'), 'DoiNgu: che do sap khac (ipNet/barTotal) SO TO van la TONG NOP (fmtTr(bar.total)) — giu nguyen 100%')
assert.ok(!doiNgu.includes('FYC tháng: {a.fyc < FYC_FLOOR'), 'DoiNgu: KHONG con dong chip trung so "FYC tháng: X tr" (so to da la FYC)')
console.log('Hang Bang Vang: che do FYC -> so to = FYC thang + dong phu "FYC tháng · N HS"; che do khac -> so to = tong nop nhu cu')
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

console.log('\n✅ TAT CA ASSERT DAT (test-access)')
