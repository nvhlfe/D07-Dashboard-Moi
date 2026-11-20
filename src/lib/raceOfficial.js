// ─────────────────────────────────────────────────────────────
// raceOfficial.js — KET QUA CHINH THUC 2 chuong trinh thang
// 11/2026 theo BANG THEO DOI CUA CONG TY trong file Excel
// Memo_18.11.xlsx Lan gui ngay 20/11/2026:
//  - Memo 00211/AD/2026 (Thi dua Thang 11/2026) — sheet
//    'Thi dua 00211': Tong IP nop va phat hanh, IP ban cung +
//    ty le ban cung cua tung TVV.
//  - Memo 00311/AD/2026 (Kickoff 2027) — sheet 'Thi dua 00311':
//    IP thuan, ty le duy tri phi tai tuc ca nhan va SO VE TAM
//    DAT cong ty da tinh san cho tung TVV.
// File doi chieu: scripts/memo-1811-extract.json; kiem tra cheo
// bang scripts/test-raceofficial.mjs. Don vi: DONG.
// App KHONG tu tinh lai 2 chuong trinh nay tu Daily Sales nua
// (giong chuong trinh iPhone 00210 tu 14/11/2026): cach tinh cua
// cong ty gom ca IP nop + phat hanh nen khac du lieu Daily.
// ─────────────────────────────────────────────────────────────

// ── Memo 00211 — Thi dua Thang 11/2026 ──────────────────────
export const NOV_OFFICIAL = {
  updatedLabel: 'Cập nhật theo bảng công ty ngày 18/11/2026',
  rows: [
  { msdl: '60556971', name: 'Phạm Thị Mỹ Trang', unit: 'TUQ', total: 452107000, week1: 222664000, crossIp: 56816000, crossRatio: 0.12566936588020092 },
  { msdl: '60776590', name: 'Phạm Hoàng Huân', unit: 'TCG', total: 183835000, week1: 118732500, crossIp: 59995000, crossRatio: 0.3263524356080181 },
  { msdl: '60797524', name: 'Nguyễn Hoàng Quân', unit: '9HA', total: 118460500, week1: 33680500, crossIp: 26648500, crossRatio: 0.22495684215413578 },
  { msdl: '60178139', name: 'Hồ Tú Quyên', unit: 'G4D', total: 111177000, week1: 52744000, crossIp: 22093000, crossRatio: 0.19871915953839372 },
  { msdl: '60789834', name: 'Nguyễn Thanh Phương', unit: 'VA9', total: 74493500, week1: 7486500, crossIp: 14696000, crossRatio: 0.19727895722445582 },
  { msdl: '60651685', name: 'Đào Mỹ Tuyên', unit: 'GB4', total: 74317100, week1: 41473100, crossIp: 12740100, crossRatio: 0.17142891743622934 },
  { msdl: '60206189', name: 'Trần Thị Đoan Trâm', unit: 'FTK', total: 73744000, week1: 34384000, crossIp: 8964000, crossRatio: 0.12155565198524626 },
  { msdl: '60525315', name: 'Phạm Thị Mỹ Xuân', unit: '9CJ', total: 66629900, week1: 25648000, crossIp: 12563400, crossRatio: 0.18855498807592388 },
  { msdl: '60733154', name: 'Lê Hoàng Việt', unit: 'PRH', total: 58650600, week1: 41943000, crossIp: 9618600, crossRatio: 0.1639983222678029 },
  { msdl: '60337183', name: 'Trần Thị Ngọc Phương', unit: 'PKA', total: 47568000, week1: 38062000, crossIp: 19973000, crossRatio: 0.4198831146989573 },
  { msdl: '60386685', name: 'Hồ Hoàng Quyên', unit: 'G4D', total: 45092000, week1: 14050000, crossIp: 5756000, crossRatio: 0.12765013749667348 },
  { msdl: '60187605', name: 'Nguyễn Thị Sửu', unit: 'VA9', total: 40911500, week1: 29054500, crossIp: 10878000, crossRatio: 0.2658910086406023 },
  { msdl: '60721271', name: 'Nguyễn Thị Ngọc Hân', unit: 'SWZ', total: 38702000, week1: 0, crossIp: 13386000, crossRatio: 0.3458735982636556 },
  { msdl: '60709108', name: 'Trần Thị Tuyết Nhung', unit: '9EB', total: 32282500, week1: 32282500, crossIp: 6092500, crossRatio: 0.18872454116007126 },
  { msdl: '60637083', name: 'Trần Thị Tường Vi', unit: 'SWZ', total: 30583000, week1: 22605000, crossIp: 3090500, crossRatio: 0.10105287251087205 },
  { msdl: '60704793', name: 'Lê Hoàng Thắng', unit: 'SWZ', total: 24226000, week1: 8687000, crossIp: 6100000, crossRatio: 0.2517955915132502 },
  { msdl: '60615819', name: 'Trương Thị Kim Chúc', unit: 'GB4', total: 22313000, week1: 22313000, crossIp: 4944000, crossRatio: 0.22157486666965445 },
  { msdl: '60709669', name: 'Huỳnh Ngọc Vinh', unit: 'PKA', total: 21859500, week1: 12875500, crossIp: 3046500, crossRatio: 0.13936732313181913 },
  { msdl: '60801160', name: 'Tô Nhựt Anh', unit: 'PKA', total: 20851000, week1: 0, crossIp: 6531000, crossRatio: 0.3132223874154717 },
  { msdl: '60806792', name: 'Đỗ Ngọc Thảo', unit: '9HA', total: 19310000, week1: 19310000, crossIp: 7790000, crossRatio: 0.4034179181771103 },
  { msdl: '60790852', name: 'Đào Thanh Duy', unit: 'UVC', total: 16044000, week1: 16044000, crossIp: 1218000, crossRatio: 0.07591623036649214 },
  { msdl: '60804993', name: 'Trần Thị Kim Phượng', unit: 'UVC', total: 15588000, week1: 0, crossIp: 3466000, crossRatio: 0.22235052604567615 },
  { msdl: '60807682', name: 'Nguyễn Trung Hậu', unit: 'UVC', total: 12342500, week1: 12342500, crossIp: 3942500, crossRatio: 0.31942475187360747 },
  { msdl: '60351587', name: 'Nguyễn Đình Huy', unit: 'PKA', total: 11442000, week1: 0, crossIp: 522000, crossRatio: 0.04562139486103828 },
  { msdl: '60710504', name: 'Nguyễn Viết Vinh', unit: 'PKA', total: 8990000, week1: 8990000, crossIp: 2796000, crossRatio: 0.3110122358175751 },
  { msdl: '60774698', name: 'Tăng Thùy Nhựt', unit: 'SWZ', total: 8990000, week1: 8990000, crossIp: 2796000, crossRatio: 0.3110122358175751 },
  { msdl: '60711571', name: 'Hoàng Mai Trang', unit: 'PKA', total: 8984000, week1: 0, crossIp: 1984000, crossRatio: 0.22083704363312556 },
  { msdl: '60734793', name: 'Nguyễn Thị Chuyền', unit: '9CF', total: 8105000, week1: 0, crossIp: 1477500, crossRatio: 0.1822948797038865 },
  { msdl: '60732652', name: 'Nguyễn Thị Hoàng Oanh', unit: 'GB4', total: 7978000, week1: 0, crossIp: 1350500, crossRatio: 0.16927801453998495 },
  ],
}

// Bac thuong 00211 (don vi dong): 18tr->1,5tr; 25tr->2,5tr;
// 50tr->5,0tr; tu 100tr->8% IP. Thuong CHINH nhan doi (x2) khi
// ty le IP ban cung >= 40%. Tong thuong toi da 100tr/TVV.
export const NOV_OFFICIAL_TIERS = [
  { min: 100000000, label: 'Từ 100tr — thưởng 8% IP', bonus: (ip) => ip * 0.08 },
  { min: 50000000, label: '50–<100tr — thưởng 5,0tr', bonus: () => 5000000 },
  { min: 25000000, label: '25–<50tr — thưởng 2,5tr', bonus: () => 2500000 },
  { min: 18000000, label: '18–<25tr — thưởng 1,5tr', bonus: () => 1500000 },
]
export const NOV_OFFICIAL_CAP = 100000000
export const NOV_CROSS_DOUBLE_RATIO = 0.4

export function novOfficialTier(total, crossRatio) {
  const v = Number(total) || 0
  const ratio = Number(crossRatio) || 0
  let tier = null
  for (const t of NOV_OFFICIAL_TIERS) if (v >= t.min) { tier = t; break }
  if (!tier) {
    return { tier: null, bonusBase: 0, doubled: false, bonus: 0, lackToFirst: 18000000 - v }
  }
  const bonusBase = tier.bonus(v)
  const doubled = ratio >= NOV_CROSS_DOUBLE_RATIO
  const bonus = Math.min(bonusBase * (doubled ? 2 : 1), NOV_OFFICIAL_CAP)
  return { tier, bonusBase, doubled, bonus, lackToFirst: 0 }
}

export function novOfficialSummary(rows) {
  const list = rows || NOV_OFFICIAL.rows
  const byTier = [0, 0, 0, 0]
  let achieved = 0
  let totalBonus = 0
  let doubles = 0
  for (const r of list) {
    const t = novOfficialTier(r.total, r.crossRatio)
    if (t.tier) {
      achieved += 1
      totalBonus += t.bonus
      if (t.doubled) doubles += 1
      const idx = NOV_OFFICIAL_TIERS.indexOf(t.tier)
      if (idx >= 0) byTier[idx] += 1
    }
  }
  return { total: list.length, achieved, byTier, totalBonus, doubles }
}

// ── Memo 00311 — Kickoff 2027 ───────────────────────────────
export const KICKOFF_OFFICIAL = {
  updatedLabel: 'Cập nhật theo bảng công ty ngày 18/11/2026',
  rows: [
  { msdl: '60556971', name: 'Phạm Thị Mỹ Trang', unit: 'TUQ', title: 'AG', ipNet: 452281000, retention: 0.94, isManager: false, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60776590', name: 'Phạm Hoàng Huân', unit: 'TCG', title: 'AG', ipNet: 183835000, retention: 0.8079999999999999, isManager: false, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60797524', name: 'Nguyễn Hoàng Quân', unit: '9HA', title: 'UM', ipNet: 144448500, retention: 0.807, isManager: true, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60178139', name: 'Hồ Tú Quyên', unit: 'G4D', title: 'UM', ipNet: 124558000, retention: 0.9309999999999999, isManager: true, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60789834', name: 'Nguyễn Thanh Phương', unit: 'VA9', title: 'AG', ipNet: 110686500, retention: 0.8370000000000001, isManager: false, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60651685', name: 'Đào Mỹ Tuyên', unit: 'GB4', title: 'AG', ipNet: 74317100, retention: 0.897, isManager: false, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60206189', name: 'Trần Thị Đoan Trâm', unit: 'FTK', title: 'UM', ipNet: 73744000, retention: 0.7759999999999999, isManager: true, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60525315', name: 'Phạm Thị Mỹ Xuân', unit: '9CJ', title: 'UM', ipNet: 72921400, retention: 0.893, isManager: true, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60733154', name: 'Lê Hoàng Việt', unit: 'PRH', title: 'AG', ipNet: 58650600, retention: 0.899, isManager: false, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60804993', name: 'Trần Thị Kim Phượng', unit: 'UVC', title: 'AG', ipNet: 51171000, retention: 0.8690000000000001, isManager: false, isReferrer: false, tickets: 1, ticketsStd: 1, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60386685', name: 'Hồ Hoàng Quyên', unit: 'G4D', title: 'AG', ipNet: 45092000, retention: 0.9079999999999999, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60187605', name: 'Nguyễn Thị Sửu', unit: 'VA9', title: 'BM', ipNet: 40911500, retention: 0.7659999999999999, isManager: true, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60709669', name: 'Huỳnh Ngọc Vinh', unit: 'PKA', title: 'AG', ipNet: 40603000, retention: 0.929, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60721271', name: 'Nguyễn Thị Ngọc Hân', unit: 'SWZ', title: 'AG', ipNet: 38702000, retention: 0.892, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60709108', name: 'Trần Thị Tuyết Nhung', unit: '9EB', title: 'UM', ipNet: 32282500, retention: 0.772, isManager: true, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60704793', name: 'Lê Hoàng Thắng', unit: 'SWZ', title: 'UM', ipNet: 32136000, retention: 0.846, isManager: true, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60637083', name: 'Trần Thị Tường Vi', unit: 'SWZ', title: 'AG', ipNet: 30583000, retention: 0.914, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60337183', name: 'Trần Thị Ngọc Phương', unit: 'PKA', title: 'AG', ipNet: 29899000, retention: 0.9259999999999999, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60734793', name: 'Nguyễn Thị Chuyền', unit: '9CF', title: 'UM', ipNet: 24284000, retention: 0.852, isManager: true, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60615819', name: 'Trương Thị Kim Chúc', unit: 'GB4', title: 'AG', ipNet: 22313000, retention: 1, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60801160', name: 'Tô Nhựt Anh', unit: 'PKA', title: 'AG', ipNet: 20851000, retention: 0.711, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60697369', name: 'Lê Minh Thanh', unit: 'PRH', title: 'UM', ipNet: 19503000, retention: 0.924, isManager: true, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60806792', name: 'Đỗ Ngọc Thảo', unit: '9HA', title: 'AG', ipNet: 19310000, retention: 0.8190000000000001, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60806558', name: 'Nguyễn Trần Anh', unit: 'VA9', title: 'AG', ipNet: 16844000, retention: null, isManager: false, isReferrer: true, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60790852', name: 'Đào Thanh Duy', unit: 'UVC', title: 'AG', ipNet: 16044000, retention: 0.9359999999999999, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60807682', name: 'Nguyễn Trung Hậu', unit: 'UVC', title: 'AG', ipNet: 12342500, retention: 1, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60351587', name: 'Nguyễn Đình Huy', unit: 'PKA', title: 'AG', ipNet: 11442000, retention: 0.888, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60533962', name: 'Lê Quang Liêm', unit: 'M1G', title: 'UM', ipNet: 10211000, retention: 0.768, isManager: true, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60710504', name: 'Nguyễn Viết Vinh', unit: 'PKA', title: 'AG', ipNet: 8990000, retention: 0.77, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60774698', name: 'Tăng Thùy Nhựt', unit: 'SWZ', title: 'AG', ipNet: 8990000, retention: 0.6970000000000001, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60711571', name: 'Hoàng Mai Trang', unit: 'PKA', title: 'AG', ipNet: 8984000, retention: 1, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60732652', name: 'Nguyễn Thị Hoàng Oanh', unit: 'GB4', title: 'AG', ipNet: 7978000, retention: 0.894, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  { msdl: '60235941', name: 'Nguyễn Hoàng Minh', unit: 'B51', title: 'AG', ipNet: 7625000, retention: null, isManager: false, isReferrer: false, tickets: 0, ticketsStd: 0, ticketsNew: 0, ticketsRef: 0, ticketsMgr: 0 },
  ],
}

// Tat ca TVV trong bang 18/11 deu thuoc doi tuong TVV thuong
// (cong ty khong danh dau TVV nao la TVV moi co hoat dong trong
// bang nay) nen moc ve chung la IP thuan tu 50tr.
export const KICKOFF_OFFICIAL_TARGET = 50000000

export function kickoffOfficialSummary(rows) {
  const list = rows || KICKOFF_OFFICIAL.rows
  let achievers = 0
  let totalTickets = 0
  for (const r of list) {
    totalTickets += Number(r.tickets) || 0
    if ((Number(r.tickets) || 0) > 0) achievers += 1
  }
  return { total: list.length, achievers, totalTickets }
}
