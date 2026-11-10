// ─────────────────────────────────────────────────────────────
// DoiNgu — Man hinh "Doi Ngu" (SPEC v3, man hinh 3).
// DOT LAM LAI THEO MAU D03 (Lan gui anh Bang Vang + bang chi so TVV,
// 08/11/2026): bo cach hien theo NHOM Unit/xo nhom + MOC, chuyen sang
// DANH SACH TVV XEP HANG kieu BANG VANG:
//  - Moi TVV: avatar (anh that qua avatarMap neu co — Admin chinh thay
//    cua MOI TVV, nguoi thuong chi thay cua chinh minh; chua co anh thi
//    chu cai dau mau theo phan loai AGSeg), huy hieu
//    top 3, ten + "{Unit} · {Phan loai}", THANH XEP CHONG 3 nhom gia tri
//    (Phat hanh tim / Pending hong / Chua len phi xanh duong — tinh bang
//    groupValue cua lib/cases), tong gia tri + so HS (Case Sub) ben phai.
//  - Sap xep: IP phat hanh (mac dinh) / Tong nop / FYC thang + tim kiem.
//  - Bam vao 1 TVV -> mo rong: luoi chi so tham khao (FYP nam, FYC quy,
//    FYC thang, FYC 12 thang, IP nop, IP phat hanh, TLDTPTT) + danh sach
//    HO SO PENDING cua chinh TVV do (so Policy: Admin chinh + hang cua
//    chinh TVV dang dang nhap thi hien DAY DU, con lai che 2 so cuoi;
//    kem ly do + tuoi pending).
// Logic MOC/Unit van con trong lib/team.js (buildTeam).
// DOT 09/11/2026 (Lan yeu cau): them MUC PHONG (Unit) trong cung tab —
// thanh chuyen che do [Ca nhan | Phong]; muc Phong KHOA theo quyen
// (Admin chinh / duoc cap canViewUnit / UM-BM tu nhan dien qua Daily),
// khong co quyen thi an han nut Phong.
// DOT BO SUNG 09/11/2026 (Lan phan hoi ban live): (1) Admin chinh thay
// AVATAR that cua moi TVV o Tinh Anh qua avatarMap (App xay tu
// fetchAllProfiles; ban dau chi hang cua chinh user moi co anh vi chi
// doc duoc profile cua minh). (2) The Unit BAM MO CHI TIET (accordion):
// Admin mo moi Unit; nguoi khac CHI mo Unit minh dung dau (MSDL trung
// leaderCode cua Unit) — trong chi tiet liet ke TVV theo 2 nhom
// Dang Active / Chua Active (Active = caseNet > 0 nhu toan app).
// DOT CHINH PHONG 09/11/2026 (Lan chot sau doi soat 2 file that):
// (1) dong TVV trong chi tiet Unit hien FYC thang thay FYP thang;
// (2) muc Phong CHI liet ke Unit co trong sheet Leader (leaderUnits);
// (3) the Unit BO badge/moc MOC — hien "Luot Active" = cot
// '#Active Agent (FYC) Unit' cua sheet Leader (activeFycUnit),
// chua co so thi hien "–". Nhom Active trong chi tiet GIU chuan
// Case Net nhu cu.
// DOT 09/11/2026 (Lan yeu cau tiep sau ban live f1d3bf57):
// (1) CAP TVV dung FYC THANG thay FYP thang o moi cho: chip sap xep
// Bang Vang 'fyc' (rankAgents da co key fyc trong lib/team.js);
// (2) muc Phong them O LOC chon phong (select "UnitCode - LeaderName");
// (3) TVV CHUA Active trong chi tiet Unit co nhan theo moc 15tr IP
// phat hanh (ACTIVE_IP_TARGET trong lib/team.js): thieu bao nhieu /
// da dat moc — nhom van chia theo Case Net, moc IP chi la nhan phu;
// (4) so chinh duoc to mau theo ngu nghia bang class .num-* (index.css).
// DOT 09/11/2026 (Lan phan hoi ban live d5f78dfc: "data chua lay theo
// FYC thang, van giu giong so IP"): logic sap xep 'fyc' DUNG nhung mat
// thuong khong thay duoc — (a) so TO ben phai hang van la TONG NOP,
// khong phai FYC; (b) o top dau FYC ≈ 26-27% IP nen thu tu theo FYC
// gan nhu trung thu tu theo IP. Ban dau sua TRINH BAY bang dong chip
// "FYC thang: X tr" duoi thanh xep chong; Lan xem ban live e15080ad
// roi KHOANH DO so to va chot tiep: o che do FYC thang, SO TO ben
// phai PHAI LA FYC thang (to num-fyc khi dat moc FYC_FLOOR = 5tr, to
// num-short khi duoi moc), dong phu ghi "FYC thang · N HS", chip
// duoi chi con canh bao "Thieu ... tr (moc 5tr FYC)" khi duoi moc.
// Che do sap khac (ipNet/barTotal) khi do giu so to = tong nop.
// DOT SUA 10/11/2026 (Lan phan hoi ban live 38f86c07: o che do "IP
// phat hanh" hang sap theo IP nhung SO TO lai la tong nop — vd My
// Trang tong nop 370 trong khi IP phat hanh 210,3 — nen day so to
// khong giam dan, nhin lon xon): Lan chot nguyen tac SO TO = DUNG
// tieu chi dang sap xep. Doi lai: 'fyc' -> FYC thang (giu nguyen);
// 'ipNet' -> issuedRow (tong ipNet cac dong IF trong Proposal, dem
// theo dong — CUNG dinh nghia phat hanh cua homeKpi o Trang Chu),
// dong phu "IP phat hanh · N ho so", so to to mau num-issued;
// 'barTotal' -> tong nop bar.total (giu nguyen cach tinh), dong phu
// "Tong nop · N ho so". RANK_KEYS.ipNet (lib/team.js) cung doi sang
// issuedRow (fallback ipNet khi snapshot cu thieu proposalRows) de
// thu tu khop tuyet doi voi so to. Toan Tinh Anh dung chung
// issuedOf(): luoi chi so khi mo chi tiet TVV, dong TVV trong chi
// tiet Unit, nhan thieu toi moc Active 15tr va mini-stat "Tong IP
// phat hanh" deu tinh theo issuedRow — MOT chuan IP phat hanh.
// Cung dot: lam dep giao dien HE THONG bang CSS (the gradient nhe +
// bong mem 2 lop, hang top 3 nen nhan + avatar ring gradient, chip
// pill gradient navy, KPI/mini-stat co dai nhan mau theo ngu nghia,
// tab day noi hon) — chi o index.css, khong doi logic/du lieu.
// DOT CHUYEN PE 10/11/2026 (Lan yeu cau — Sales Report qua nhieu thong
// tin): phan PHAN TICH PE (lib/pe.js, truoc nam o Sales Report) CHUYEN
// VE TINH ANH: (1) dai tong quan phan hang PE hien tai o the tong quan;
// (2) khoi thu gon "Sap len hang PE" — CHI Admin chinh + truong phong
// (cung gate + loc phong minh nhu khoi Can chu y); (3) huy hieu hang
// hien tai nho tren moi hang Bang Vang; (4) khoi "Duong toi hang PE"
// day du trong CHI TIET TVV (von da gate chi chu so huu/Admin mo).
// Sales Report chi con phan loai theo TVV (huy hieu + loc Active).
// DOT LOC PE + DONG LEN HANG 10/11/2026 (Lan yeu cau tiep): (1) moi
// hang Bang Vang co them DONG THONG TIN LEN HANG PE nho (.bv-pe-line)
// duoi dong so lieu — noi dung rut gon tu peStatus, CHI hien khi da
// co du snapshot cac thang da qua trong quy (tranh hien so sai khi
// du lieu quy chua nap xong) va TVV co FYC 12 thang; (2) them hang
// CHIP LOC cho Bang Vang theo hang HIEN TAI + nhom sap len hang
// (nearRankList — cung nguong voi khoi Sap len hang, nhung tinh tren
// toan GA cho moi nguoi loc xem). Cac phan PE dot truoc giu nguyen.
// MO HINH DICH PE 10/11/2026 (Lan lam ro): hang DICH xac dinh thuan
// theo FYC 12 THANG (>= 180tr Kim Cuong / >= 90tr Bach Kim / >= 50tr
// Vang; chua dat Vang thi dich van la Vang) — KHONG ha dich khi thieu
// thang hoat dong. So thang hoat dong trong quy la DIEU KIEN DONG
// HANH de chinh thuc dat dich (Kim Cuong/Bach Kim can 3 thang, Vang
// can 2): vi du TVV FYC L12M > 180tr + 2 thang hoat dong -> "Toi Kim
// Cuong: can them 1 thang hoat dong" (ban cu ghi "Toi Bach Kim" la
// sai dien giai); du 3 thang -> "Dat Kim Cuong (tam tinh)".
// DOT GATE DANG NHAP 10/11/2026 (Lan yeu cau): khach CHUA dang nhap
// bam vao 1 TVV -> MODAL "Can dang nhap de xem thong tin chi tiet"
// (state showLoginGate) + nut Dang nhap noi vao form dang nhap THAT
// cua App qua onOpenLogin; truoc day chi la thanh thong bao inline.
// Nguoi DA dang nhap nhung khong phai chinh minh van giu thong bao
// inline 'own' nhu cu.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildCases } from '../lib/cases'
import { buildTeam, rankAgents, flattenAgents, filterLeaderUnits, issuedOf, ACTIVE_IP_TARGET, FYC_FLOOR } from '../lib/team'
import { maskSensitive, analyzeSoSanLuong } from '../lib/analyze'
import { buildAttentionList } from '../lib/attention'
import { peStatus, segToTier, tierById, quarterMonths, activeMonthsInQuarter, nearRankList } from '../lib/pe'
import { agentBadges, submissionDaysByAgent, topMsdlSet, progressRank } from '../lib/badges'
import { boardCardData } from '../lib/shareCard'
import { unitColor } from '../lib/unitColors'
import { BoardShareCard, SharePreviewModal, captureShareCard } from './ShareCard'
import { isSuperAdmin, emailToMsdl, canViewUnitSection } from '../lib/firebaseConfig'

const fmtTr = (n) => {
  const v = Number(n) || 0
  return (Math.round(v * 10) / 10).toLocaleString('vi-VN')
}
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN')
// Case Sub co the le thap phan (vd 6,5): nguyen thi hien nguyen, le thi
// 1 chu so thap phan voi dau phay Viet.
const fmtCaseSub = (n) => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('vi-VN')
const fmtPct = (n) => `${(Math.round((Number(n) || 0) * 10) / 10).toLocaleString('vi-VN')}%`
const fmtDateVN = (iso) => {
  if (!iso) return '—'
  const p = String(iso).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(iso)
}

const SORTS = [
  { id: 'ipNet', label: 'IP phát hành' },
  { id: 'barTotal', label: 'Tổng nộp' },
  { id: 'fyc', label: 'FYC tháng' },
]
// Chip LOC Bang Vang theo nhom PE (dot loc PE 10/11/2026): diamond /
// platinum / gold / none loc theo hang HIEN TAI (agSeg); 'near' loc
// theo tap sap len hang (nearRankList cua lib/pe — cung nguong voi
// khoi Sap len hang PE ben tren).
const BV_PE_FILTERS = [
  { code: 'ALL', label: 'Tất cả' },
  { code: 'diamond', label: '💎 Kim Cương' },
  { code: 'platinum', label: 'Bạch Kim' },
  { code: 'gold', label: 'Vàng' },
  { code: 'none', label: 'Chưa xếp hạng' },
  { code: 'near', label: '🎯 Sắp lên hạng' },
]
const MEDALS = ['🥇', '🥈', '🥉']
const ROW_BG = ['bv-r1', 'bv-r2', 'bv-r3']

// Phan loai AGSeg trong file that co ca gia tri khong phai hang (SA, M12+,
// Terminated...) — chi 3 hang Diamond/Platinum/Gold moi co mau rieng.
const segKey = (agSeg) => {
  const s = String(agSeg || '').toLowerCase()
  if (s.includes('diamond')) return 'diamond'
  if (s.includes('platinum')) return 'platinum'
  if (s.includes('gold')) return 'gold'
  return 'other'
}
const AVATAR_CLASS = { diamond: 'bv-av-dia', platinum: 'bv-av-pla', gold: 'bv-av-gold', other: 'bv-av-oth' }
// Huy hieu hang PE HIEN TAI nho tren hang Bang Vang: cung bo class
// .pe-badge da dung cho the TVV o Sales Report (dot chuyen PE).
const PE_BADGE_CLASS = { diamond: 'pe-badge-dia', platinum: 'pe-badge-pla', gold: 'pe-badge-gold' }
const SEG_TEXT_CLASS = { diamond: 'bv-seg-dia', platinum: 'bv-seg-pla', gold: 'bv-seg-gold', other: '' }

// Chu cai dau avatar: lay 2 tu cuoi cua ten (ten rieng kieu Viet), vd
// "Nguyen Thi Minh Thai" -> "MT", "Pham Hoang Thai Tai" -> "TT".
const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function DoiNgu({ snaps, loading, remoteSettled = true, onGoNap, onNeedMonth, user, profile, isSuperAdmin: adminProp, onOpenLogin, avatarMap = {} }) {
  // So Policy DAY DU: Admin chinh (moi hang) + CHINH TVV do o hang cua
  // minh (Lan yeu cau 09/11/2026: xem day du so ho so trong data cua
  // minh); cac truong hop con lai che con 2 so cuoi.
  const isAdmin = typeof adminProp === 'boolean' ? adminProp : isSuperAdmin(user)
  const canSeeFull = isAdmin
  const [sortKey, setSortKey] = useState('ipNet')
  const [search, setSearch] = useState('')
  // Loc Bang Vang theo NHOM PE (hang hien tai / sap len hang): state
  // DOC LAP voi sap xep + tim kiem — doi thang/sap xep/tim kiem thi
  // bo loc van ap dung nhat quan (display ben duoi loc ket hop).
  const [peFilter, setPeFilter] = useState('ALL')
  const [openRows, setOpenRows] = useState(() => new Set())
  // Che do xem: 'personal' (Bang Vang TVV — mac dinh) | 'unit' (muc
  // Phong, chi nguoi co quyen moi thay nut chuyen — xem canUnit duoi).
  const [viewMode, setViewMode] = useState('personal')
  // Thong bao khi bam vao TVV ma minh khong co quyen mo chi tiet:
  // gateNotice chi con truong hop 'own' (da dang nhap nhung khong
  // phai chinh minh — thanh thong bao inline nhu cu). Truong hop
  // CHUA DANG NHAP dung MODAL rieng (showLoginGate — Lan yeu cau
  // 10/11/2026): bang "Can dang nhap de xem thong tin chi tiet" +
  // nut Dang nhap mo form dang nhap that cua app.
  const [gateNotice, setGateNotice] = useState('')
  const [showLoginGate, setShowLoginGate] = useState(false)
  // Chi tiet Unit (muc Phong): ma Unit dang mo accordion + co thong bao
  // khi bam vao Unit khong phai phong minh phu trach.
  const [openUnitCode, setOpenUnitCode] = useState('')
  const [unitNotice, setUnitNotice] = useState(false)
  // O loc chon phong o muc Phong: '' = Tat ca phong. Gia tri hieu luc
  // (activeUnitFilter ben duoi) tu ve '' neu phong dang chon khong con
  // trong danh sach (snapshot/leaderUnits doi) — tranh danh sach rong.
  const [unitFilter, setUnitFilter] = useState('')
  // Khoi "Can chu y hom nay": mac dinh THU GON giong khoi "Tom tat &
  // diem can luu y" trong chi tiet Memo (Lan yeu cau 10/11/2026) —
  // chi hien hang tieu de + so luong tung nhom, bam moi xo chi tiet.
  const [attnOpen, setAttnOpen] = useState(false)
  // Khoi "Sap len hang PE" (dot chuyen PE): thu gon mac dinh nhu khoi
  // Can chu y — chi Admin chinh / truong phong moi thay (peNear ben duoi).
  const [peNearOpen, setPeNearOpen] = useState(false)
  // Anh Bang Vang (ShareCard): trang thai tao anh + anh da chup (modal).
  // withAvatars = false sau khi lan chup dau loi (nghi do avatar ngoai
  // CORS) -> the anh dung vong tron chu cai dau nhu giao dien.
  const [shareBusy, setShareBusy] = useState(false)
  const [shareImg, setShareImg] = useState('')
  const [shareErr, setShareErr] = useState('')
  const [withAvatars, setWithAvatars] = useState(true)
  const boardCardRef = useRef(null)
  // Thang truoc cho hang "Tien bo nhat": moi ym chi goi tai lazy 1 lan
  const progReqRef = useRef(new Set())
  // Cac thang trong QUY da xin tai lazy cho so thang hoat dong PE
  // (moi ym chi goi 1 lan — cung mau progReqRef).
  const peReqRef = useRef(new Set())

  // ── Rules mo chi tiet TVV (Lan chot 08/11/2026) ──
  // Chua dang nhap: chi xem danh sach tong quan, khong mo duoc ai.
  // Da dang nhap (khong phai Admin): chi mo duoc CHINH MINH theo MSDL
  // (profile.msdl, hoac suy tu email <msdl>@d07.local cua tai khoan MSDL).
  // Admin chinh: mo duoc tat ca.
  const viewerMsdl = String((profile && profile.msdl) || emailToMsdl(user && user.email) || '').trim().toUpperCase()
  const isMine = (a) => !!viewerMsdl && String(a.msdl || '').trim().toUpperCase() === viewerMsdl
  const canOpenRow = (a) => isAdmin || (!!user && isMine(a))

  // Avatar that theo MSDL (avatarMap do App truyen xuong): Admin chinh
  // co map cua MOI TVV, nguoi thuong chi co cua chinh minh. Khong co
  // trong map -> render chu cai dau nhu truoc.
  const avatarOf = (msdl) => avatarMap[String(msdl || '').trim().toUpperCase()] || ''

  // ── Quyen mo CHI TIET Unit (muc Phong) ──
  // Admin chinh: mo moi Unit. Nguoi khac: CHI Unit minh dung dau —
  // MSDL trung leaderCode cua Unit (sheet Leader). Nguoi co canViewUnit
  // nhung khong dung dau Unit nao thi van xem danh sach the tong quan,
  // bam vao Unit khong phai cua minh se hien thong bao khoa.
  const isMyUnit = (u) => !!viewerMsdl && !!u.leaderCode
    && String(u.leaderCode).trim().toUpperCase() === viewerMsdl
  const canOpenUnit = (u) => isAdmin || isMyUnit(u)
  const handleUnitClick = (u) => {
    if (canOpenUnit(u)) {
      setUnitNotice(false)
      setOpenUnitCode((cur) => (cur === u.unit ? '' : u.unit))
    } else {
      setUnitNotice(true)
    }
  }

  const newest = snaps && snaps.length ? snaps[snaps.length - 1] : null

  const view = useMemo(() => {
    if (!newest) return null
    const [year, month] = newest.id.split('-').map(Number)
    const cases = buildCases(newest)
    const team = buildTeam(newest, cases)
    // pendingAll cua analyze (kem doc thang truoc cho CF lien thang) —
    // phuc vu nhom "Pending lau nhat" cua khoi Can chu y (lib/attention).
    const pm = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
    const p2 = (n) => String(n).padStart(2, '0')
    const prevMonthDocs = (snaps || []).filter((s) => s.id && s.id.startsWith(`${pm.y}-${p2(pm.m)}-`))
    const analysis = analyzeSoSanLuong([newest], prevMonthDocs, { year, month })
    return { year, month, team, cases, pendingAll: analysis.pendingAll || [] }
  }, [newest, snaps])

  // Ngu canh huy hieu (lib/badges): Top 10 theo IP phat hanh + ngay nop
  // ho so theo TVV — tinh 1 lan cho ca bang.
  const badgeCtx = useMemo(() => {
    if (!view) return { topMsdl: new Set(), daysByMsdl: new Map() }
    return { topMsdl: topMsdlSet(view.team, 10), daysByMsdl: submissionDaysByAgent(view.cases) }
  }, [view])

  const ranked = useMemo(
    () => (view ? rankAgents(view.team, sortKey) : []),
    [view, sortKey],
  )

  // ── Quyen xem muc Phong (Unit) — Lan chot 09/11/2026 ──
  // isLeader tu snapshot Daily hien tai, 2 nguon doi chieu file that
  // 25.10 khop nhau: (1) AGLevel cua chinh TVV trong sheet Agent la
  // 'UM'/'BM'; (2) MSDL trung LeaderCode cua 1 Unit trong sheet Leader.
  const isLeader = useMemo(() => {
    if (!viewerMsdl || !view) return false
    const mine = flattenAgents(view.team).find(
      (a) => String(a.msdl || '').trim().toUpperCase() === viewerMsdl,
    )
    const lv = String((mine && mine.level) || '').trim().toUpperCase()
    if (lv === 'UM' || lv === 'BM') return true
    const unitsObj = (newest && newest.data && newest.data.units) || {}
    return Object.values(unitsObj).some(
      (u) => String((u && u.leaderCode) || '').trim().toUpperCase() === viewerMsdl,
    )
  }, [viewerMsdl, view, newest])
  const canUnit = canViewUnitSection(user, profile, isLeader)
  // Khong co quyen thi che do hieu luc luon la Ca nhan (nut Phong an han).
  const mode = viewMode === 'unit' && canUnit ? 'unit' : 'personal'

  // ── Khoi "CAN CHU Y HOM NAY" (lib/attention — 10/11/2026) ──
  // Chi Admin chinh (toan GA) va TRUONG PHONG thay; truong phong CHI
  // thay TVV thuoc Unit minh dung dau (leaderCode trung MSDL cua minh
  // trong sheet Leader). Nguoi thuong/khach khong thay khoi nay.
  const myUnitCodes = useMemo(() => {
    const set = new Set()
    const unitsObj = (newest && newest.data && newest.data.units) || {}
    for (const [code, u] of Object.entries(unitsObj)) {
      if (viewerMsdl && String((u && u.leaderCode) || '').trim().toUpperCase() === viewerMsdl) {
        set.add(String(code || '').trim().toUpperCase())
      }
    }
    return set
  }, [newest, viewerMsdl])

  const attention = useMemo(() => {
    if (!view || !newest || (!isAdmin && !isLeader)) return null
    const all = buildAttentionList(newest, view.cases, view.pendingAll)
    if (isAdmin) return all
    const inMine = (row) => myUnitCodes.has(String(row.unit || '').trim().toUpperCase())
    return {
      ...all,
      near: all.near.filter(inMine),
      noCases: all.noCases.filter(inMine),
      pendingTop: all.pendingTop.filter(inMine),
    }
  }, [view, newest, isAdmin, isLeader, myUnitCodes])

  // ── PHAN TICH PE (lib/pe.js — chuyen tu Sales Report, dot chuyen PE
  // 10/11/2026): du lieu nen dung chung cho dai tong quan phan hang,
  // khoi Sap len hang va khoi Duong toi hang PE trong chi tiet TVV.
  // Hang DICH theo FYC L12M cua thang dang xem; so thang hoat dong
  // (dieu kien dong hanh cua dich) can snapshot cac thang trong CUNG
  // QUY tinh den thang dang xem -> tai LAZY cac thang con thieu qua
  // onNeedMonth (cung co che tai thang truoc cho Tien bo nhat);
  // thang chua co du lieu thi bo qua — UI ghi chu so thang co du
  // lieu va dong PE tren hang chi hien khi quy da du cac thang da qua.
  useEffect(() => {
    if (!newest || !onNeedMonth) return
    const [y, m] = newest.id.split('-').map(Number)
    const curYm = newest.id.slice(0, 7)
    for (const q of quarterMonths(y, m)) {
      if (q.ym >= curYm) continue
      if ((snaps || []).some((s) => s.id && s.id.startsWith(`${q.ym}-`))) continue
      if (peReqRef.current.has(q.ym)) continue
      peReqRef.current.add(q.ym)
      onNeedMonth(q.ym)
    }
  }, [newest, snaps, onNeedMonth])

  const peData = useMemo(() => {
    if (!newest) return null
    const [y, m] = newest.id.split('-').map(Number)
    const curYm = newest.id.slice(0, 7)
    const qElapsed = quarterMonths(y, m).filter((q) => q.ym <= curYm)
    const quarterSnaps = (snaps || []).filter((s) => s.id && qElapsed.some((q) => s.id.startsWith(`${q.ym}-`)))
    const monthsWithData = qElapsed.filter((q) => quarterSnaps.some((s) => s.id.startsWith(`${q.ym}-`))).length
    const agentsObj = (newest.data && newest.data.agents) || {}
    // Phan bo hang HIEN TAI (agSeg) tren toan TVV cua thang dang xem.
    const tiers = { diamond: 0, platinum: 0, gold: 0, none: 0 }
    for (const a of Object.values(agentsObj)) {
      const tid = segToTier(a && a.agSeg)
      if (tid) tiers[tid] += 1
      else tiers.none += 1
    }
    return { quarterSnaps, monthsWithData, qMonths: qElapsed.length, tiers, agents: Object.values(agentsObj) }
  }, [newest, snaps])

  // Danh sach SAP LEN HANG PE: CUNG gate voi khoi Can chu y — chi
  // Admin chinh (toan GA) va TRUONG PHONG thay, truong phong chi thay
  // TVV thuoc Unit minh dung dau (loc theo myUnitCodes nhu attention).
  const peNear = useMemo(() => {
    if (!peData || (!isAdmin && !isLeader)) return null
    const all = nearRankList(peData.agents, peData.quarterSnaps)
    if (isAdmin) return all
    return all.filter((r) => myUnitCodes.has(String(r.unit || '').trim().toUpperCase()))
  }, [peData, isAdmin, isLeader, myUnitCodes])

  // Tap MSDL "SAP LEN HANG" cho CHIP LOC Bang Vang: tinh tren TOAN
  // GA, KHONG gate nhu khoi Sap len hang o tren (chip loc la cong cu
  // xem danh sach cho moi nguoi xem duoc Bang Vang) — nhung CUNG
  // nearRankList + CUNG nguong voi khoi do, dinh nghia nhat quan,
  // khong tinh lai theo cach khac.
  const peNearMsdl = useMemo(() => {
    if (!peData) return new Set()
    return new Set(nearRankList(peData.agents, peData.quarterSnaps).map((r) => String(r.msdl)))
  }, [peData])

  // ── Hang "TIEN BO NHAT THANG" (lib/badges — 10/11/2026) ──
  // Can snapshot moi nhat cua THANG TRUOC: chua co trong snaps thi tai
  // LAZY qua onNeedMonth (co che cua App nhu Sales Report chon thang)
  // — chi chay khi mo Tinh Anh. Chua co du lieu thang truoc thi an
  // khoi, khong loi.
  useEffect(() => {
    if (!newest || !onNeedMonth) return
    const [y, m] = newest.id.split('-').map(Number)
    const pm = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
    const ym = `${pm.y}-${String(pm.m).padStart(2, '0')}`
    if ((snaps || []).some((s) => s.id && s.id.startsWith(`${ym}-`))) return
    if (progReqRef.current.has(ym)) return
    progReqRef.current.add(ym)
    onNeedMonth(ym)
  }, [newest, snaps, onNeedMonth])

  const prevSnap = useMemo(() => {
    if (!newest) return null
    const [y, m] = newest.id.split('-').map(Number)
    const pm = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
    const prefix = `${pm.y}-${String(pm.m).padStart(2, '0')}-`
    const list = (snaps || []).filter((s) => s.id && s.id.startsWith(prefix))
    return list.length ? list[list.length - 1] : null
  }, [newest, snaps])

  const progTop = useMemo(
    () => (newest && prevSnap ? progressRank(newest, prevSnap, 3) : []),
    [newest, prevSnap],
  )

  // Danh sach Unit cho muc Phong: tai dung buildTeam (da co leaderName,
  // agentCount, fyp, activeFycUnit + bar tung TVV), cong don IP phat hanh /
  // gia tri pending theo groupValue, sap xep FYP giam dan.
  // CHI LIET KE Unit co trong sheet Leader (snapshot.data.leaderUnits —
  // Unit co truong phong chinh thuc; Lan chot 09/11/2026). Snapshot cu
  // khong co leaderUnits thi filterLeaderUnits tra nguyen danh sach.
  const unitRows = useMemo(() => {
    if (!view) return []
    const leaderUnits = (newest && newest.data && newest.data.leaderUnits) || null
    return filterLeaderUnits(view.team.units, leaderUnits)
      .map((u) => ({
        ...u,
        ipIssued: u.agents.reduce((s, a) => s + ((a.bar && a.bar.issued) || 0), 0),
        pendValue: u.agents.reduce((s, a) => s + ((a.bar && a.bar.pending) || 0), 0),
      }))
      .sort((x, y) => y.fyp - x.fyp || String(x.unit).localeCompare(String(y.unit)))
  }, [view, newest])

  // Loc phong theo o chon: phong dang chon phai con ton tai trong
  // unitRows (da loc Leader), neu khong thi coi nhu "Tat ca phong".
  const activeUnitFilter = unitFilter && unitRows.some((u) => u.unit === unitFilter) ? unitFilter : ''
  const shownUnitRows = activeUnitFilter
    ? unitRows.filter((u) => u.unit === activeUnitFilter)
    : unitRows

  if (loading) {
    return <div className="card empty"><div className="e-ic">⏳</div>Đang tải dữ liệu…</div>
  }
  if (!newest || !view) {
    if (!remoteSettled) {
      return (
        <div className="card empty">
          <div className="e-ic">⏳</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Đang tải dữ liệu…</div>
          <p>Lần đầu trên thiết bị này có thể mất vài giây — dữ liệu đang được tải về, bạn không cần nạp lại file.</p>
        </div>
      )
    }
    return (
      <div className="card empty">
        <div className="e-ic">📭</div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có dữ liệu Daily Sales</div>
        {isAdmin ? (
          <>
            <p style={{ marginBottom: 14 }}>Hãy nạp file Daily Sales đầu tiên ở tab Nạp — đội ngũ tháng sẽ hiện ngay tại đây.</p>
            <button className="btn-primary" onClick={onGoNap}>📥 Đến tab Nạp dữ liệu</button>
          </>
        ) : (
          <p>Dữ liệu sẽ hiện tại đây sau khi Admin chính nạp file Daily Sales.</p>
        )}
      </div>
    )
  }

  const { year, month } = view

  // Chi TVV co so lieu thang (co gia tri ho so hoac co FYP) moi len bang;
  // so con lai gom 1 dong ghi chu o cuoi.
  const listed = ranked
    .map((a, i) => ({ a, rank: i + 1 }))
    .filter(({ a }) => a.bar.total > 0 || a.fyp > 0)
  const hiddenCount = ranked.length - listed.length

  // Tong IP phat hanh toan GA theo issuedRow (dong IF Proposal) —
  // khop tong phatHanh.ip cua homeKpi o Trang Chu (cung 1 chuan).
  const totalIssued = ranked.reduce((s, a) => s + issuedOf(a), 0)
  const pendCount = ranked.reduce((s, a) => s + a.pendingCases.length, 0)
  const pendValue = ranked.reduce((s, a) => s + a.bar.pending, 0)

  const query = search.trim().toLowerCase()
  // Loc Bang Vang = tim kiem + CHIP PE ket hop: chip loc theo hang
  // HIEN TAI (segToTier cua agSeg; 'none' = chua xep hang PE) hoac
  // tap sap len hang peNearMsdl. Loc chi THU HEP tap hien thi — thu
  // tu cua ranked (theo che do sap xep dang chon) va so to theo che
  // do sap xep giu nguyen khong doi.
  const display = listed.filter(({ a }) => {
    if (query && !(String(a.agName || '').toLowerCase().includes(query) || String(a.msdl || '').toLowerCase().includes(query))) return false
    if (peFilter === 'near') return peNearMsdl.has(String(a.msdl))
    if (peFilter === 'none') return !segToTier(a.agSeg)
    if (peFilter !== 'ALL') return segToTier(a.agSeg) === peFilter
    return true
  })

  // Bam 1 dong o khoi "Can chu y": chi TVV dang co mat trong danh
  // sach Bang Vang (listed) moi mo thang chi tiet duoc — xoa tim kiem,
  // mo hang cua TVV do roi cuon toi hang. TVV chua co so lieu thang
  // (nhom "chua co ho so") khong co hang de mo -> dong tinh.
  const listedMsdl = new Set(listed.map(({ a }) => a.msdl))
  const openFromAttention = (msdl) => {
    if (!listedMsdl.has(msdl)) return
    setSearch('')
    setPeFilter('ALL')
    setViewMode('personal')
    if (!openRows.has(msdl)) toggleRow(msdl)
    setTimeout(() => {
      const el = document.getElementById(`bv-row-${msdl}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  // ── Anh Bang Vang: du lieu tu lib/shareCard (CUNG rankAgents voi
  // man hinh, theo che do sap xep DANG CHON). Loi chup lan dau (nghi
  // do avatar ngoai CORS) -> tu thu lai khong nhung avatar that. ──
  const boardData = boardCardData(view.team, sortKey, 10, FYC_FLOOR)
  const handleShareBoard = async () => {
    if (shareBusy) return
    setShareErr('')
    setShareBusy(true)
    try {
      const url = await captureShareCard(boardCardRef.current)
      setShareImg(url)
    } catch (e1) {
      if (withAvatars) {
        setWithAvatars(false)
        await new Promise((r) => setTimeout(r, 90))
        try {
          const url2 = await captureShareCard(boardCardRef.current)
          setShareImg(url2)
        } catch (e2) {
          setShareErr('Chưa tạo được ảnh lúc này — bạn thử lại sau ít phút nhé.')
        }
      } else {
        setShareErr('Chưa tạo được ảnh lúc này — bạn thử lại sau ít phút nhé.')
      }
    } finally {
      setShareBusy(false)
    }
  }

  const toggleRow = (msdl) => {
    setOpenRows((s) => {
      const next = new Set(s)
      if (next.has(msdl)) next.delete(msdl)
      else next.add(msdl)
      return next
    })
  }

  // Bam vao 1 hang TVV: co quyen thi mo/dong chi tiet; da dang nhap
  // nhung khong phai chinh minh -> thong bao inline 'own' nhu cu;
  // CHUA dang nhap -> MODAL yeu cau dang nhap (showLoginGate).
  const handleRowClick = (a) => {
    if (canOpenRow(a)) { setGateNotice(''); toggleRow(a.msdl); return }
    if (user) setGateNotice('own')
    else setShowLoginGate(true)
  }

  const renderRow = ({ a, rank }) => {
    const open = openRows.has(a.msdl)
    // Huy hieu thanh tich (lib/badges): hang hien toi da 3 icon,
    // title chua ten day du cac huy hieu TVV dang co.
    const rowBadges = agentBadges(a, badgeCtx)
    // Hang cua chinh minh -> so Policy hien DAY DU (khong che).
    const rowFull = canSeeFull || isMine(a)
    const sk = segKey(a.agSeg)
    // Hang PE (lib/pe.js — dot chuyen PE): huy hieu hang HIEN TAI nho
    // canh ten + trang thai PE theo MO HINH DICH cho khoi Duong toi
    // hang PE trong chi tiet (dich theo FYC L12M; so thang hoat dong
    // dem tu peData.quarterSnaps la dieu kien dong hanh cua dich).
    const rowTier = tierById(segToTier(a.agSeg))
    const peSt = peData ? peStatus(a, activeMonthsInQuarter(peData.quarterSnaps, a.msdl)) : null
    const peCur = peSt ? tierById(peSt.current) : null
    const peTgt = peSt ? tierById(peSt.target.tierId) : null
    const pePct = peSt ? Math.min(100, Math.max(0, (peSt.fycL12m / peSt.target.needL12m) * 100)) : 100
    // DONG THONG TIN LEN HANG PE tren hang (.bv-pe-line — dot loc
    // PE): noi dung theo HANG DICH rut gon tu peSt cho moi nguoi xem
    // duoc hang do. CHI hien khi (1) snapshot quy DA DU cac thang da
    // qua trong quy (monthsWithData = qMonths — chua nap xong thi
    // AN, tranh hien so thang hoat dong sai) va (2) TVV co FYC 12
    // thang (co so lieu PE). Du dieu kien -> "Dat {dich} (tam tinh)";
    // thieu FYC va/hoac thieu thang -> ghi ca 2 phan thieu 1 dong.
    let peLine = ''
    if (peSt && peData && peData.qMonths > 0 && peData.monthsWithData >= peData.qMonths && (Number(a.fycL12m) || 0) > 0) {
      if (peSt.qualified) {
        peLine = `${peTgt && peTgt.icon ? `${peTgt.icon} ` : ''}Đạt ${peTgt ? peTgt.label : ''} (tạm tính)`
      } else {
        const parts = []
        if (peSt.target.lackL12m > 0) parts.push(`còn thiếu ${fmtTr(peSt.target.lackL12m)} tr FYC`)
        if (peSt.target.lackMonths > 0) parts.push(`cần thêm ${fmtInt(peSt.target.lackMonths)} tháng hoạt động`)
        peLine = `🎯 Tới ${peTgt ? peTgt.label : ''}: ${parts.join(' · ')}`
      }
    }
    const bar = a.bar
    const pctOf = (v) => (bar.total > 0 ? (v / bar.total) * 100 : 0)
    return (
      <div className={`bv-row ${rank <= 3 ? ROW_BG[rank - 1] : ''}${isMine(a) ? ' bv-mine' : ''}`} key={a.msdl} id={`bv-row-${a.msdl}`}>
        <button type="button" className="bv-head" onClick={() => handleRowClick(a)} aria-expanded={open}>
          <span className={`bv-avatar ${AVATAR_CLASS[sk]}`}>
            {avatarOf(a.msdl)
              ? <img className="bv-avatar-img" src={avatarOf(a.msdl)} alt="" />
              : initials(a.agName)}
            {rank <= 3 ? <span className="bv-medal">{MEDALS[rank - 1]}</span> : null}
          </span>
          <span className="bv-main">
            <span className="bv-name">
              {rank > 3 ? <span className="bv-rank">{rank}</span> : null}
              {a.agName || '—'}
              {rowBadges.length ? (
                <span className="bv-badges" title={rowBadges.map((b) => `${b.icon} ${b.label}`).join(' · ')}>
                  {rowBadges.slice(0, 3).map((b) => <span key={b.id}>{b.icon}</span>)}
                </span>
              ) : null}
              {rowTier ? (
                <span className={`pe-badge ${PE_BADGE_CLASS[rowTier.id]}`} title={`Hạng PE hiện tại: ${rowTier.label}`}>
                  {rowTier.icon ? `${rowTier.icon} ` : ''}{rowTier.label}
                </span>
              ) : null}
              {isMine(a) ? <span className="bv-you">Bạn</span> : null}
            </span>
            <span className="bv-sub">
              {a.unit || '—'}
              {a.agSeg ? <> · <span className={SEG_TEXT_CLASS[sk]}>{a.agSeg}</span></> : null}
            </span>
            {bar.total > 0 ? (
              <>
                <span className="bv-bar">
                  {bar.issued > 0 ? <span className="bv-seg-issued" style={{ width: `${pctOf(bar.issued)}%` }} /> : null}
                  {bar.pending > 0 ? <span className="bv-seg-pending" style={{ width: `${pctOf(bar.pending)}%` }} /> : null}
                  {bar.pipeline > 0 ? <span className="bv-seg-pipeline" style={{ width: `${pctOf(bar.pipeline)}%` }} /> : null}
                </span>
                <span className="bv-nums">
                  {bar.issued > 0 ? <span className="bv-num-issued">Phát hành <b>{fmtTr(bar.issued)}</b></span> : null}
                  {bar.pending > 0 ? <span className="bv-num-pending">Pending <b>{fmtTr(bar.pending)}</b></span> : null}
                  {bar.pipeline > 0 ? <span className="bv-num-pipeline">Chưa lên phí <b>{fmtTr(bar.pipeline)}</b></span> : null}
                </span>
              </>
            ) : null}
            {/* Che do SAP THEO FYC THANG: so TO ben phai (khoi
                .bv-total ben duoi) da LA FYC thang roi nen chip duoi
                nay CHI con canh bao khi duoi moc FYC_FLOOR = 5tr (Lan
                chot 09/11/2026): chip tong do (.lack) + so thieu theo
                cong thuc FYC_FLOOR - a.fyc. Dat moc -> khong hien
                chip nao (tranh trung so voi so to). */}
            {sortKey === 'fyc' && a.fyc < FYC_FLOOR ? (
              <span className="bv-fyc lack">
                <span className="num-short">Thiếu {fmtTr(FYC_FLOOR - a.fyc)} tr (mốc {FYC_FLOOR}tr FYC)</span>
              </span>
            ) : null}
            {/* Dong thong tin len hang PE: ngay duoi dong so lieu
                cua hang, truoc phan chi tiet xo ra ben duoi. */}
            {peLine ? <span className="bv-pe-line">{peLine}</span> : null}
          </span>
          <span className="bv-total">
            {sortKey === 'fyc' ? (
              <>
                <span className={`bv-total-num ${a.fyc < FYC_FLOOR ? 'num-short' : 'num-fyc'}`}>{fmtTr(a.fyc)}</span>
                <span className="bv-total-sub">FYC tháng · {fmtCaseSub(a.caseSub)} HS</span>
              </>
            ) : sortKey === 'ipNet' ? (
              <>
                <span className="bv-total-num num-issued">{fmtTr(issuedOf(a))}</span>
                <span className="bv-total-sub">IP phát hành · {fmtCaseSub(a.caseSub)} hồ sơ</span>
              </>
            ) : (
              <>
                <span className="bv-total-num">{fmtTr(bar.total)}</span>
                <span className="bv-total-sub">Tổng nộp · {fmtCaseSub(a.caseSub)} hồ sơ</span>
              </>
            )}
          </span>
        </button>

        {open ? (
          <div className="bv-expand">
            <div className="bv-ref-grid">
              <div className="bv-ref"><span>FYP năm</span><b className="num-fyp">{fmtTr(a.fypYtd)} tr</b></div>
              <div className="bv-ref"><span>FYC quý</span><b className="num-fyc">{fmtTr(a.fycQtd)} tr</b></div>
              <div className="bv-ref"><span>FYC tháng</span><b className="num-fyc">{fmtTr(a.fyc)} tr</b></div>
              <div className="bv-ref"><span>FYC 12 tháng</span><b className="num-fyc">{fmtTr(a.fycL12m)} tr</b></div>
              <div className="bv-ref"><span>IP nộp</span><b>{fmtTr(a.ipSub)} tr</b></div>
              <div className="bv-ref"><span>IP phát hành</span><b className="num-issued">{fmtTr(issuedOf(a))} tr</b></div>
              <div className="bv-ref"><span>TLDTPTT</span><b>{a.tldtptt === null ? '—' : fmtPct(a.tldtptt)}</b></div>
              <div className="bv-ref"><span>MSĐL · Unit</span><b>{a.msdl} · {a.unit || '—'}</b></div>
            </div>

            {/* DUONG TOI HANG PE (lib/pe.js — chuyen tu Sales Report,
                dot chuyen PE 10/11/2026): nam ngay trong chi tiet TVV
                von da gate chi chu so huu / Admin chinh mo duoc. */}
            {peSt ? (
              <div className="pe-block">
                <div className="bv-pend-title" style={{ marginTop: 2 }}>🎯 Đường tới hạng PE</div>
                <div className="pe-line">
                  Hạng hiện tại: <b>{peCur ? peCur.label : 'Chưa xếp hạng'}</b>
                  {' → '}Hạng đích (theo FYC): <b>{peTgt ? peTgt.label : ''}</b>
                  {peSt.qualified ? <> · <b>✅ Đã đủ điều kiện (tạm tính)</b></> : null}
                </div>
                <div className="pe-progress"><div className="pe-fill" style={{ width: `${pePct}%` }} /></div>
                <div className="pe-line">
                  FYC 12 tháng: <b>{fmtTr(peSt.fycL12m)} tr</b> / {fmtTr(peSt.target.needL12m)} tr ({peTgt ? peTgt.label : ''})
                  {peSt.target.lackL12m > 0
                    ? <> — còn thiếu <b className="num-short">{fmtTr(peSt.target.lackL12m)} tr</b></>
                    : <> — đã đủ FYC</>}
                </div>
                <div className="pe-line">
                  Tháng hoạt động quý này: <b>{fmtInt(peSt.activeMonths)}/{fmtInt(peSt.target.needMonths)}</b>
                  {peSt.target.lackMonths > 0 ? <> — cần thêm {fmtInt(peSt.target.lackMonths)} tháng hoạt động</> : null}
                </div>
                <div className="pe-line">Hạng tạm tính theo tiêu chí memo — kết quả chính thức do công ty xét hàng quý.</div>
              </div>
            ) : null}

            <div className="bv-pend-title">⏳ Hồ sơ pending ({a.pendingCases.length})</div>
            {a.pendingCases.length === 0 ? (
              <div className="muted">Không có hồ sơ pending 🎉</div>
            ) : a.pendingCases.map((pc) => (
              <div className="bv-pend" key={pc.proposalNum}>
                <div className="bv-pend-main">
                  <b>{maskSensitive(pc.policyNum || pc.proposalNum, rowFull)}</b>
                  {pc.policyNum ? null : <span className="muted"> (HSYC)</span>}
                  <span className="pill pill-ps">Pending</span>
                  <span className="bv-pend-val">{fmtTr(pc.value)} tr</span>
                </div>
                <div className="case-meta">
                  {pc.product ? `${pc.product} · ` : ''}Nộp {fmtDateVN(pc.proposalDate)}
                  {pc.ageDays !== null && pc.ageDays !== undefined ? (
                    <> · chờ {pc.ageDays} ngày{pc.ageBucket ? <span className={`age-chip ${pc.ageDays > 7 ? 'hot' : ''}`}>{pc.ageBucket} ngày</span> : null}</>
                  ) : null}
                </div>
                {pc.pendingReasons.length > 0 ? (
                  <div style={{ marginTop: 5 }}>
                    {pc.pendingReasons.map((r) => <span className="reason-chip" key={r}>{r}</span>)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  // 1 dong TVV trong CHI TIET Unit: avatar (anh that neu co trong
  // avatarMap, khong thi chu cai dau) + ten + phan loai + MSDL + FYC
  // thang (Lan chot 09/11/2026: FYC thay FYP o dong nay) + Case Net +
  // IP phat hanh; badge theo isAct (caseNet > 0 — dinh nghia Active
  // dung chung toan app, xem lib/team.js).
  // Rieng nhom CHUA Active (inactive = true): them nhan theo moc
  // ACTIVE_IP_TARGET (15tr IP phat hanh — Lan chot 09/11/2026): con
  // thieu bao nhieu IP nua, hoac "Da dat moc" neu IP phat hanh da
  // >= 15 du van nam nhom Chua Active (nhom chia theo Case Net,
  // khong doi). IP phat hanh o day = issuedOf(a) (issuedRow — dong
  // IF Proposal) nhu toan Tinh Anh tu dot sua 10/11/2026.
  const renderUnitMember = (a, inactive = false) => {
    const ipGap = ACTIVE_IP_TARGET - issuedOf(a)
    return (
    <div className="tvv-row" key={a.msdl}>
      <span className={`bv-avatar unit-av ${AVATAR_CLASS[segKey(a.agSeg)]}`}>
        {avatarOf(a.msdl)
          ? <img className="bv-avatar-img" src={avatarOf(a.msdl)} alt="" />
          : initials(a.agName)}
      </span>
      <span className="tvv-main">
        <span className="tvv-name">
          <span className="nm">{a.agName || '—'}</span>
          {a.agSeg ? <span className="seg-chip">{a.agSeg}</span> : null}
        </span>
        <span className="tvv-nums">
          MSĐL {a.msdl} · FYC <b className="num-fyc">{fmtTr(a.fyc)}</b> tr · Case Net {fmtInt(a.caseNet)} · IP phát hành <b className="num-issued">{fmtTr(issuedOf(a))}</b> tr
        </span>
        {inactive ? (
          ipGap > 0 ? (
            <span className="tvv-short num-short">Thiếu {fmtTr(ipGap)} tr tới mốc Active ({ACTIVE_IP_TARGET}tr IP)</span>
          ) : (
            <span className="tvv-short num-active">Đã đạt mốc {ACTIVE_IP_TARGET}tr IP</span>
          )
        ) : null}
      </span>
      <span className={`act-badge ${a.isAct ? 'ok' : 'no'}`}>{a.isAct ? '✓ Active' : 'Chưa Active'}</span>
    </div>
    )
  }

  // The Unit o muc Phong: chi so tong (nhu ban truoc) + dau the BAM MO
  // CHI TIET khi co quyen mo (canOpenUnit): mo duoc thi co chu
  // "Xem chi tiet", khong mo duoc thi khoa 🔒 o goc phai va bam vao se
  // hien thong bao. Chi tiet: dong tong (% Active, FYP) + 2 nhom
  // Dang Active / Chua Active (agents da sap FYP giam dan o buildTeam).
  const renderUnitCard = (u) => {
    const openable = canOpenUnit(u)
    const open = openable && openUnitCode === u.unit
    const actList = u.agents.filter((a) => a.isAct)
    const inactList = u.agents.filter((a) => !a.isAct)
    const actPct = u.agentCount > 0 ? Math.round((u.actCount / u.agentCount) * 100) : 0
    // Mau rieng cua phong (lib/unitColors — bam on dinh theo Ma
    // phong, Lan yeu cau 10/11/2026): dai mau tren dau the + cham
    // mau canh ten + nen soft rat nhat. Phong cua chinh UM dang
    // nhap giu nen nhan .unit-mine (chi them dai mau + cham mau).
    const uc = unitColor(u.unit)
    const mine = isMyUnit(u)
    return (
      <div
        className={`card unit-card${mine ? ' unit-mine' : ''}`}
        key={u.unit || '—'}
        style={{
          borderTop: `4px solid ${uc.main}`,
          ...(mine ? null : { background: `linear-gradient(180deg, ${uc.soft}80 0%, #ffffff 55%)` }),
        }}
      >
        <button type="button" className="unit-head" onClick={() => handleUnitClick(u)} aria-expanded={open}>
          <span className="unit-main">
            <span className="unit-name">
              <span className="unit-dot" style={{ background: uc.main }} />
              🏢 Unit {u.unit || '—'}
              {mine ? <span className="bv-you">Phòng của bạn</span> : null}
            </span>
            {u.leaderName ? <span className="muted" style={{ display: 'block' }}>Trưởng phòng: {u.leaderName}</span> : null}
          </span>
          <span className="unit-head-right">
            {openable
              ? <span className="unit-open-hint">{open ? 'Thu gọn ▴' : 'Xem chi tiết ▾'}</span>
              : <span className="unit-lock" title="Chỉ Trưởng phòng của Unit này mới xem được chi tiết TVV">🔒</span>}
          </span>
        </button>
        <div className="mini-stats" style={{ margin: '10px 0' }}>
          <div className="mini-stat"><div className="ms-num">{fmtInt(u.agentCount)}</div><div className="ms-label">TVV</div></div>
          <div className="mini-stat"><div className="ms-num num-fyp">{fmtTr(u.fyp)}</div><div className="ms-label">FYP tháng (tr)</div></div>
          <div className="mini-stat"><div className="ms-num num-active">{u.activeFycUnit === null || u.activeFycUnit === undefined ? '–' : fmtInt(u.activeFycUnit)}</div><div className="ms-label">Lượt Active</div></div>
        </div>
        <div className="unit-nums">
          <span>TVV đạt Act: <b><span className="num-active">{fmtInt(u.actCount)}</span>/{fmtInt(u.agentCount)}</b></span>
          <span>IP phát hành: <b className="num-issued">{fmtTr(u.ipIssued)} tr</b></span>
          <span>Đang pending: <b className="num-pending">{fmtTr(u.pendValue)} tr</b></span>
        </div>
        {open ? (
          <div className="unit-detail">
            <div className="unit-detail-title">
              <span className="unit-dot" style={{ background: uc.main }} />
              <span style={{ color: uc.main }}>Chi tiết Unit {u.unit || '—'}</span>
            </div>
            {u.agentCount === 0 ? (
              <div className="muted">Unit chưa có TVV nào trong dữ liệu tháng này.</div>
            ) : (
              <>
                <div className="unit-sum">
                  Tổng: <b>{fmtInt(u.agentCount)} TVV</b> · Đang Active <b><span className="num-active">{fmtInt(u.actCount)} ({actPct}%)</span></b> · FYP <b className="num-fyp">{fmtTr(u.fyp)} tr</b>
                </div>
                <div className="unit-group-title">✅ Đang Active ({actList.length})</div>
                {actList.length === 0
                  ? <div className="muted">Chưa có TVV nào đạt Active trong tháng này.</div>
                  : actList.map(renderUnitMember)}
                <div className="unit-group-title">⬜ Chưa Active ({inactList.length})</div>
                {inactList.length === 0
                  ? <div className="muted">Tất cả TVV trong phòng đều đã Active 🎉</div>
                  : inactList.map((a) => renderUnitMember(a, true))}
              </>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      {/* ── Thanh chuyen che do Ca nhan / Phong ──
          Nut Phong CHI hien khi co quyen (Admin chinh / duoc cap quyen
          canViewUnit / UM-BM theo Daily) — khong quyen thi an han, nhat
          quan voi cach tab Sales Report va tab Nap bi an. */}
      {canUnit ? (
        <div className="chips-row" style={{ marginBottom: 12 }}>
          <button className={`fchip ${mode === 'personal' ? 'active' : ''}`} onClick={() => setViewMode('personal')}>👤 Cá nhân</button>
          <button className={`fchip ${mode === 'unit' ? 'active' : ''}`} onClick={() => setViewMode('unit')}>🏢 Phòng</button>
        </div>
      ) : null}

      {mode === 'unit' ? (
        <>
          {/* ── Muc Phong (Unit): chi so tung Unit, sap xep FYP giam dan ── */}
          <div className="card">
            <h2>🏢 Phòng (Unit) — tháng {month}/{year}</h2>
            <div className="muted">
              Chỉ gồm các phòng có trong sheet Leader (có trưởng phòng).
              Lượt Active: số TVV Active theo FYC của phòng (theo sheet Leader); phòng hiện “–” là file chưa có số.
            </div>
            {unitRows.length > 0 ? (
              <div className="field unit-filter">
                <label htmlFor="unit-filter-select">Chọn phòng</label>
                <select
                  id="unit-filter-select"
                  value={activeUnitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                >
                  <option value="">🏢 Tất cả phòng</option>
                  {unitRows.map((u) => (
                    <option key={u.unit || '—'} value={u.unit}>
                      {u.leaderName ? `${u.unit} - ${u.leaderName}` : (u.unit || '—')}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          {unitNotice ? (
            <div className="msg info" style={{ marginBottom: 12 }}>
              <span>🔒 Bạn chỉ xem được chi tiết phòng do mình phụ trách.</span>
            </div>
          ) : null}
          {unitRows.length === 0 ? (
            <div className="card empty"><div className="e-ic">📭</div>Chưa có Unit nào trong dữ liệu tháng này.</div>
          ) : (<div className="unit-grid">{shownUnitRows.map(renderUnitCard)}</div>)}
        </>
      ) : (
      <>
      {/* ── CAN CHU Y HOM NAY (lib/attention): chi Admin chinh (toan
          GA) / truong phong (chi phong minh) thay — attention = null
          voi nguoi thuong/khach. Bam dong TVV co hang trong Bang
          Vang thi mo thang chi tiet cua TVV do. ── */}
      {attention && (attention.near.length > 0 || attention.noCases.length > 0 || attention.pendingTop.length > 0) ? (
        <div className="card attn-card">
          {/* Hang tieu de THU GON — dung mau tuong tac cua khoi "Tom
              tat & diem can luu y" trong Memo (.memo-summary-head +
              .memo-caret): mac dinh dong, chi hien so luong tung
              nhom; bam vao moi xo chi tiet (Lan yeu cau 10/11/2026). */}
          <button type="button" className="memo-summary-head attn-head" onClick={() => setAttnOpen((o) => !o)} aria-expanded={attnOpen}>
            <span className="attn-head-main">
              <span className="attn-head-title">🔔 Cần chú ý hôm nay</span>
              <span className="attn-head-sum">
                Sắp chạm mốc: {fmtInt(attention.near.length)} · Chưa có hồ sơ: {fmtInt(attention.noCases.length)} · Pending lâu nhất: {fmtInt(attention.pendingTop.length)}
              </span>
              <span className="attn-head-sub">
                {isAdmin ? 'Toàn Quận 7' : 'Chỉ phòng của bạn'} · theo dữ liệu đến {fmtDateVN(newest.id)}
              </span>
            </span>
            <span className="memo-caret">{attnOpen ? '▾' : '▸'}</span>
          </button>
          {attnOpen ? (
            <div className="attn-body">
              {/* KHOI 1 — CAN XU LY (ho phach/do nhat): Chua co ho so +
                  Pending lau nhat. Nhom rong van hien tieu de + dong
                  "Khong co" de cau truc on dinh. */}
              <div className="attn-block attn-block-warn">
                <div className="attn-block-title">⚠️ Cần xử lý</div>
                <div className="attn-group">📭 Chưa có hồ sơ tháng này ({attention.noCases.length})</div>
                {attention.noCases.length > 0 ? attention.noCases.map((r) => (
                  <div className="attn-row static" key={r.msdl}>
                    <span className="attn-name">{r.name || '—'} <span className="attn-unit">· {r.unit || '—'}</span></span>
                    <span className="attn-detail">Chưa có hồ sơ nào trong tháng</span>
                  </div>
                )) : (
                  <div className="attn-empty">Không có — TVV nào cũng đã có hồ sơ trong tháng 🎉</div>
                )}
                <div className="attn-group">⏳ Pending lâu nhất ({attention.pendingTop.length})</div>
                {attention.pendingTop.length > 0 ? attention.pendingTop.map((r) => {
                  const clickable = listedMsdl.has(r.msdl)
                  return (
                    <button type="button" key={r.proposalNum || r.msdl} className={`attn-row${clickable ? '' : ' static'}`} onClick={clickable ? () => openFromAttention(r.msdl) : undefined}>
                      <span className="attn-name">{r.name || '—'} <span className="attn-unit">· {r.unit || '—'}</span></span>
                      <span className="attn-detail">
                        Hồ sơ {maskSensitive(r.policyNum || r.proposalNum, isAdmin)} · chờ <b className="num-pending">{fmtInt(r.ageDays)} ngày</b> · {fmtTr(r.value)} tr
                      </span>
                    </button>
                  )
                }) : (
                  <div className="attn-empty">Không có — không còn hồ sơ pending nào 🎉</div>
                )}
              </div>
              {/* KHOI 2 — CO HOI KEO LEN (xanh la nhat): Sap cham moc. */}
              <div className="attn-block attn-block-opp">
                <div className="attn-block-title">🎯 Sắp chạm mốc — cơ hội kéo lên</div>
                {attention.near.length > 0 ? attention.near.map((r) => {
                  const clickable = listedMsdl.has(r.msdl)
                  return (
                    <button type="button" key={r.msdl} className={`attn-row${clickable ? '' : ' static'}`} onClick={clickable ? () => openFromAttention(r.msdl) : undefined}>
                      <span className="attn-name">{r.name || '—'} <span className="attn-unit">· {r.unit || '—'}</span></span>
                      <span className="attn-detail">{r.marks.map((m) => `Thiếu ${fmtTr(m.gap)} tr tới ${m.label}`).join(' · ')}</span>
                    </button>
                  )
                }) : (
                  <div className="attn-empty">Không có — chưa có TVV nào ở gần mốc tháng này.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── SAP LEN HANG PE (lib/pe.js — chuyen tu Sales Report, dot
          chuyen PE 10/11/2026): khoi THU GON cung mau tuong tac voi
          khoi Can chu y (.memo-summary-head + .memo-caret), dat canh
          khoi Can chu y cho gom nhom quan ly. Gate nhu Can chu y:
          peNear = null voi nguoi thuong/khach; truong phong chi thay
          TVV phong minh (da loc o peNear). ── */}
      {peNear && peNear.length > 0 ? (
        <div className="card attn-card">
          <button type="button" className="memo-summary-head attn-head" onClick={() => setPeNearOpen((o) => !o)} aria-expanded={peNearOpen}>
            <span className="attn-head-main">
              <span className="attn-head-title">🎯 Sắp lên hạng PE ({fmtInt(peNear.length)} người)</span>
              <span className="attn-head-sum">Còn thiếu ≤ 20tr FYC 12 tháng tới hạng đích, hoặc đã đủ FYC và chỉ thiếu 1 tháng hoạt động</span>
              <span className="attn-head-sub">
                {isAdmin ? 'Toàn Quận 7' : 'Chỉ phòng của bạn'} · Tính đến tháng {month}/{year}
                {peData && peData.monthsWithData < 3 ? ` · đang tính trên ${fmtInt(peData.monthsWithData)}/3 tháng có dữ liệu trong quý` : ''}
              </span>
            </span>
            <span className="memo-caret">{peNearOpen ? '▾' : '▸'}</span>
          </button>
          {peNearOpen ? (
            <div className="attn-body">
              {peNear.map((r) => {
                const nt = tierById(r.target.tierId)
                return (
                  <div className="attn-row static" key={r.msdl}>
                    <span className="attn-name">{r.agName || '—'} <span className="attn-unit">· {r.unit || '—'}</span></span>
                    <span className="attn-detail">
                      → {nt ? nt.label : ''}
                      {r.target.lackL12m > 0 ? <> · còn thiếu <b className="num-short">{fmtTr(r.target.lackL12m)} tr</b> FYC</> : <> · đã đủ FYC</>}
                      {r.target.lackMonths > 0 ? <> · thiếu {fmtInt(r.target.lackMonths)} tháng hoạt động</> : null}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Tong quan doi ngu thang ── */}
      <div className="card">
        <h2>🌟 Tinh Anh — tháng {month}/{year}</h2>
        <div className="mini-stats" style={{ marginBottom: 0 }}>
          <div className="mini-stat"><div className="ms-num">{fmtInt(listed.length)}</div><div className="ms-label">TVV có số liệu tháng</div></div>
          <div className="mini-stat"><div className="ms-num num-issued">{fmtTr(totalIssued)}</div><div className="ms-label">Tổng IP phát hành (tr)</div></div>
          <div className="mini-stat"><div className="ms-num">{fmtInt(pendCount)}</div><div className="ms-label">Hồ sơ pending · {fmtTr(pendValue)} tr</div></div>
        </div>
        {/* Dai TONG QUAN PHAN HANG PE HIEN TAI (theo agSeg cua thang
            dang xem — dot chuyen PE): hien cho moi nguoi xem Tinh Anh. */}
        {peData ? (
          <div style={{ fontSize: 13.5, marginTop: 10 }}>
            Phân hạng PE hiện tại: 💎 Kim Cương <b>{fmtInt(peData.tiers.diamond)}</b>
            {' · '}Bạch Kim <b>{fmtInt(peData.tiers.platinum)}</b>
            {' · '}Vàng <b>{fmtInt(peData.tiers.gold)}</b>
            {' · '}Chưa xếp hạng <b>{fmtInt(peData.tiers.none)}</b>
          </div>
        ) : null}
      </div>

      {/* ── Tim kiem + sap xep ── */}
      <div className="search-row">
        <div className="field">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔎 Tìm TVV theo tên hoặc MSĐL…" />
        </div>
      </div>
      <div className="chips-row">
        {SORTS.map((s) => (
          <button key={s.id} className={`fchip ${sortKey === s.id ? 'active' : ''}`} onClick={() => setSortKey(s.id)}>{s.label}</button>
        ))}
      </div>
      {/* ── Loc Bang Vang theo NHOM PE (dot loc PE): hang HIEN TAI +
          nhom sap len hang. Dat ngay duoi hang chip sap xep, gon 1
          hang chip nho; loc doc lap voi sap xep/tim kiem. ── */}
      <div className="chips-row">
        {BV_PE_FILTERS.map((f) => (
          <button key={f.code} className={`fchip sm ${peFilter === f.code ? 'active' : ''}`} onClick={() => setPeFilter(f.code)}>{f.label}</button>
        ))}
      </div>

      {/* ── Thong bao gate khi TVV DA dang nhap bam TVV khong phai
          cua minh (truong hop chua dang nhap dung MODAL showLoginGate
          o cuoi file) ── */}
      {gateNotice === 'own' ? (
        <div className="msg info" style={{ marginBottom: 12 }}>
          <span>Bạn chỉ xem được chi tiết của chính mình (theo MSĐL).</span>
        </div>
      ) : null}

      {/* ── Bang Vang TVV ── */}
      <div className="card bv-card">
        <h2>🏆 Bảng Vàng — tháng {month}/{year}</h2>
        <div className="share-btn-row" style={{ marginTop: 0, marginBottom: 8 }}>
          <button type="button" className="btn-ghost" disabled={shareBusy || !boardData.rows.length} onClick={handleShareBoard}>
            {shareBusy ? 'Đang tạo ảnh…' : '📸 Tạo ảnh Bảng Vàng'}
          </button>
          {shareErr ? <div className="msg error" style={{ marginTop: 8 }}>{shareErr}</div> : null}
        </div>
        {query ? <div className="muted" style={{ marginBottom: 4 }}>Kết quả tìm “{search.trim()}”: {display.length} TVV</div> : null}
        {!query && peFilter !== 'ALL' ? <div className="muted" style={{ marginBottom: 4 }}>Đang lọc theo nhóm PE: {display.length} TVV</div> : null}
        {display.length === 0 ? (
          <div className="muted" style={{ padding: '10px 0' }}>
            {query || peFilter !== 'ALL' ? 'Không thấy TVV nào khớp bộ lọc.' : 'Chưa có TVV nào có số liệu trong tháng này.'}
          </div>
        ) : (<div className="bv-list">{display.map(renderRow)}</div>)}
        {!query && peFilter === 'ALL' && hiddenCount > 0 ? (
          <div className="muted" style={{ paddingTop: 10 }}>… và {fmtInt(hiddenCount)} TVV chưa có số liệu tháng này</div>
        ) : null}
      </div>

      {/* ── TIEN BO NHAT THANG (lib/badges progressRank): IP phat
          hanh thang nay tru thang truoc tang nhieu nhat. Chi hien
          khi da co snapshot thang truoc (tai lazy qua onNeedMonth);
          chua co du lieu thang truoc thi an khoi, khong loi. ── */}
      {progTop.length > 0 ? (
        <div className="card">
          <h2>📈 Tiến bộ nhất — tháng {month}/{year}</h2>
          <div className="muted" style={{ marginBottom: 6 }}>IP phát hành tăng nhiều nhất so với tháng trước</div>
          {progTop.map((r, i) => (
            <div className="top-row" key={r.msdl}>
              {i < 3 ? <span className="medal">{MEDALS[i]}</span> : <span className="rank">{i + 1}</span>}
              <div className="who"><div className="nm">{r.name || '—'}</div><div className="un">{r.unit || ''}</div></div>
              <div style={{ textAlign: 'right' }}>
                <div className="ip num-active">+{fmtTr(r.delta)} tr</div>
                <div className="muted" style={{ fontSize: 12 }}>{fmtTr(r.prev)} → {fmtTr(r.cur)} tr</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      </>
      )}

      {/* ── The anh Bang Vang render AN ngoai man hinh de html2canvas
          chup + modal xem truoc anh ── */}
      {boardData.rows.length > 0 ? (
        <div className="share-offscreen" aria-hidden="true">
          <BoardShareCard data={boardData} month={month} year={year} avatarMap={avatarMap} withAvatars={withAvatars} cardRef={boardCardRef} />
        </div>
      ) : null}
      {/* ── MODAL yeu cau dang nhap khi KHACH bam vao 1 TVV (Lan yeu
          cau 10/11/2026): noi dung can dang nhap + nut Dang nhap DONG
          modal nay roi GOI onOpenLogin (form dang nhap THAT do App
          quan ly — khong dung form thu hai). Bam ra ngoai hoac nut
          "De sau" chi dong modal. ── */}
      {showLoginGate ? (
        <div className="modal-overlay" onClick={() => setShowLoginGate(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">🔒 Cần đăng nhập</div>
            <p className="muted" style={{ marginBottom: 12 }}>
              Cần đăng nhập để xem thông tin chi tiết của tư vấn viên — mỗi TVV đăng nhập bằng MSĐL của mình để xem chi tiết của chính mình.
            </p>
            <button type="button" className="btn-primary" onClick={() => { setShowLoginGate(false); if (onOpenLogin) onOpenLogin() }}>
              Đăng nhập
            </button>
            <button type="button" className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowLoginGate(false)}>Để sau</button>
          </div>
        </div>
      ) : null}
      <SharePreviewModal
        imgUrl={shareImg}
        fileName={`bang-vang-d07-${year}-${String(month).padStart(2, '0')}.png`}
        title="📸 Ảnh Bảng Vàng"
        onClose={() => setShareImg('')}
      />
    </div>
  )
}
