// ─────────────────────────────────────────────────────────────
// iphoneOfficial.js — KET QUA CHINH THUC Memo 00210/AD/2026
// (thuong iPhone Quy 4/2026) theo BANG THEO DOI CUA CONG TY.
// Du lieu TRICH NGUYEN VAN tu anh bang Excel "MEMO THEO DOI
// THUONG IPHONE" (Nguon: Memo 00210) Lan gui ngay 13/11/2026 —
// file doi chieu: scripts/iphone-official-extract.json, kiem tra
// cheo bang scripts/test-iphone.mjs (tong = co so + cong them
// T10 + cong them T11; so con thieu = moc - tong).
// Don vi: DONG (nhu bang goc). App KHONG tu tinh lai chuong
// trinh nay tu Daily Sales nua (cach tinh cua cong ty gom ca
// IP nop + phat hanh va IP ho tro dac biet — khac du lieu Daily).
// ─────────────────────────────────────────────────────────────

export const IPHONE_PROMAX_GOAL = 600000000 // 600tr -> iPhone 18 Pro Max 256GB
export const IPHONE_DUO_GOAL = 900000000 // 900tr -> iPhone Duo 256GB

export const IPHONE_OFFICIAL = {
  updatedLabel: 'Cập nhật theo bảng công ty ngày 13/11/2026',
  // rows da sap san theo total giam dan nhu bang goc.
  rows: [
  { msdl: '60556971', name: 'Phạm Thị Mỹ Trang', unit: 'TUQ', base: 1067536400, bonus10: 479007500, bonus11: 32248500, total: 1578792400 },
  { msdl: '60789834', name: 'Nguyễn Thanh Phương', unit: 'VA9', base: 365315400, bonus10: 224693900, bonus11: 34712500, total: 624721800 },
  { msdl: '60178139', name: 'Hồ Tú Quyên', unit: 'G4D', base: 208643500, bonus10: 76911000, bonus11: 51692000, total: 337246500 },
  { msdl: '60801160', name: 'Tô Nhựt Anh', unit: 'PKA', base: 164688100, bonus10: 124025100, bonus11: 0, total: 288713200 },
  { msdl: '60776590', name: 'Phạm Hoàng Huân', unit: 'TCG', base: 194804200, bonus10: 41827700, bonus11: 51855750, total: 288487650 },
  { msdl: '60206189', name: 'Trần Thị Đoan Trâm', unit: 'FTK', base: 120562000, bonus10: 102546000, bonus11: 0, total: 223108000 },
  { msdl: '60733154', name: 'Lê Hoàng Việt', unit: 'PRH', base: 125502500, bonus10: 55564900, bonus11: 20971500, total: 202038900 },
  { msdl: '60797524', name: 'Nguyễn Hoàng Quân', unit: '9HA', base: 137424500, bonus10: 47041000, bonus11: 12496750, total: 196962250 },
  { msdl: '60651685', name: 'Đào Mỹ Tuyên', unit: 'GB4', base: 112190600, bonus10: 62555000, bonus11: 11360000, total: 186105600 },
  { msdl: '60525315', name: 'Phạm Thị Mỹ Xuân', unit: '9CJ', base: 118965000, bonus10: 45949000, bonus11: 0, total: 164914000 },
  { msdl: '60337183', name: 'Trần Thị Ngọc Phương', unit: 'PKA', base: 83507000, bonus10: 28435000, bonus11: 19031000, total: 130973000 },
  { msdl: '60704793', name: 'Lê Hoàng Thắng', unit: 'SWZ', base: 78601500, bonus10: 45503500, bonus11: 0, total: 124105000 },
  { msdl: '60351587', name: 'Nguyễn Đình Huy', unit: 'PKA', base: 77942500, bonus10: 35992500, bonus11: 0, total: 113935000 },
  { msdl: '60637083', name: 'Trần Thị Tường Vi', unit: 'SWZ', base: 74897500, bonus10: 27660000, bonus11: 11302500, total: 113860000 },
  { msdl: '60615819', name: 'Trương Thị Kim Chúc', unit: 'GB4', base: 72551300, bonus10: 27755300, bonus11: 11156500, total: 111463100 },
  { msdl: '60709108', name: 'Trần Thị Tuyết Nhung', unit: '9EB', base: 67774700, bonus10: 27043200, bonus11: 16141250, total: 110959150 },
  { msdl: '60804993', name: 'Trần Thị Kim Phượng', unit: 'UVC', base: 74592200, bonus10: 29998700, bonus11: 0, total: 104590900 },
  { msdl: '60187605', name: 'Nguyễn Thị Sửu', unit: 'VA9', base: 71769000, bonus10: 0, bonus11: 28142000, total: 99911000 },
  { msdl: '60386685', name: 'Hồ Hoàng Quyền', unit: 'G4D', base: 86883000, bonus10: 12841000, bonus11: 0, total: 99724000 },
  { msdl: '60697369', name: 'Lê Minh Thanh', unit: 'PRH', base: 80542000, bonus10: 10912000, bonus11: 0, total: 91454000 },
  { msdl: '60792098', name: 'Huỳnh Thanh Thảo', unit: 'UVC', base: 54594500, bonus10: 32292000, bonus11: 0, total: 86886500 },
  { msdl: '60721271', name: 'Nguyễn Thị Ngọc Hân', unit: 'SWZ', base: 57680000, bonus10: 0, bonus11: 19351000, total: 77031000 },
  { msdl: '60810772', name: 'Đỗ Thị Thúy', unit: 'FTK', base: 36712300, bonus10: 36712300, bonus11: 0, total: 73424600 },
  { msdl: '60533962', name: 'Lê Quang Liêm', unit: 'M1G', base: 44323300, bonus10: 28760300, bonus11: 0, total: 73083600 },
  { msdl: '60010902', name: 'Nguyễn Trang Thùy', unit: 'FTK', base: 35114000, bonus10: 35114000, bonus11: 0, total: 70228000 },
  { msdl: '60188196', name: 'Nguyễn Thị Kiều Hạnh', unit: 'P3G', base: 24203000, bonus10: 24203000, bonus11: 0, total: 48406000 },
  { msdl: '60807682', name: 'Nguyễn Trung Hậu', unit: 'UVC', base: 30626000, bonus10: 10321000, bonus11: 6171250, total: 47118250 },
  { msdl: '60790852', name: 'Đào Thanh Duy', unit: 'UVC', base: 35396000, bonus10: 11150000, bonus11: 0, total: 46546000 },
  { msdl: '60810465', name: 'Bùi Thị Thu Trang', unit: '9CJ', base: 22904000, bonus10: 22904000, bonus11: 0, total: 45808000 },
  { msdl: '60806058', name: 'Hà Ngọc Bích', unit: 'FTK', base: 20344000, bonus10: 20344000, bonus11: 0, total: 40688000 },
  { msdl: '60732652', name: 'Nguyễn Thị Hoàng Oanh', unit: 'GB4', base: 39850300, bonus10: 0, bonus11: 0, total: 39850300 },
  { msdl: '60711571', name: 'Hoàng Mai Trang', unit: 'PKA', base: 26849950, bonus10: 8906000, bonus11: 0, total: 35755950 },
  { msdl: '60760962', name: 'Huỳnh Quốc Vinh', unit: 'PKA', base: 26921450, bonus10: 0, bonus11: 0, total: 26921450 },
  { msdl: '60804265', name: 'Ngô Thị Thái Duyên', unit: 'VA9', base: 22488500, bonus10: 0, bonus11: 0, total: 22488500 },
  { msdl: '60798302', name: 'Đặng Thị Tuyết Hạnh', unit: 'UVC', base: 11150000, bonus10: 11150000, bonus11: 0, total: 22300000 },
  { msdl: '60000607', name: 'Trương Thị Phi Nga', unit: 'B51', base: 19401800, bonus10: 0, bonus11: 0, total: 19401800 },
  { msdl: '60792131', name: 'Lưu Yến Nhi', unit: 'V5W', base: 19235200, bonus10: 0, bonus11: 0, total: 19235200 },
  { msdl: '60807770', name: 'Nguyễn Thanh Liêm', unit: 'GB4', base: 18399000, bonus10: 0, bonus11: 0, total: 18399000 },
  { msdl: '60251991', name: 'Trịnh Hoàng Bích Hằng', unit: 'GB4', base: 18185000, bonus10: 0, bonus11: 0, total: 18185000 },
  { msdl: '60144587', name: 'Lưu Thị Xuân Trang', unit: 'GB4', base: 18042000, bonus10: 0, bonus11: 0, total: 18042000 },
  { msdl: '60734793', name: 'Nguyễn Thị Chuyển', unit: '9CF', base: 10998000, bonus10: 2796000, bonus11: 0, total: 13794000 },
  { msdl: '60555448', name: 'Trần Thị Hồng Cúc', unit: 'GB4', base: 9464000, bonus10: 0, bonus11: 0, total: 9464000 },
  { msdl: '60710504', name: 'Nguyễn Viết Vinh', unit: 'PKA', base: 8990000, bonus10: 0, bonus11: 0, total: 8990000 },
  { msdl: '60774698', name: 'Tăng Thúy Nhựt', unit: 'SWZ', base: 8990000, bonus10: 0, bonus11: 0, total: 8990000 },
  ],
}

/** Trang thai 1 moc qua: { reached, lack } (lack = so dong con thieu, 0 khi da dat). */
export function iphoneGoalStatus(total, goal) {
  const t = Number(total) || 0
  const g = Number(goal) || 0
  return t >= g ? { reached: true, lack: 0 } : { reached: false, lack: g - t }
}

/** Trang thai ca 2 moc cua 1 dong: { promax: {...}, duo: {...} }. */
export function iphoneRowStatus(row) {
  return {
    promax: iphoneGoalStatus(row && row.total, IPHONE_PROMAX_GOAL),
    duo: iphoneGoalStatus(row && row.total, IPHONE_DUO_GOAL),
  }
}

/** Tong ket: { total, datPromax, datDuo }. */
export function iphoneSummary(rows) {
  const list = rows || IPHONE_OFFICIAL.rows
  let datPromax = 0
  let datDuo = 0
  for (const r of list) {
    const st = iphoneRowStatus(r)
    if (st.promax.reached) datPromax += 1
    if (st.duo.reached) datDuo += 1
  }
  return { total: list.length, datPromax, datDuo }
}
