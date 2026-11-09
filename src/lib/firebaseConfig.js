// Cau hinh Firebase cua project D07 (nhung san de app chay tren moi thiet bi,
// khong can dan cau hinh tung may). Day la khoa web cong khai cua ung dung web
// Firebase — bao mat nam o Firestore Rules + dang nhap, khong nam o khoa nay.
// Nguon: file goc cua Lan (cac trang legacy cua dashboard cu dung chung config nay).
// KHONG ghi gia tri nay vao chat/memory/bao cao.

export const EMBEDDED_FIREBASE_CONFIG = {
  "apiKey": "AIzaSyASY63DlWIkvjybM1enPIpdZkxXJjrStQA",
  "authDomain": "d07-sales-dashboard.firebaseapp.com",
  "projectId": "d07-sales-dashboard",
  "storageBucket": "d07-sales-dashboard.firebasestorage.app",
  "messagingSenderId": "820808715064",
  "appId": "1:820808715064:web:62865b8b03b18b6a670fcd"
};

// Tai khoan admin chinh (super admin): dang nhap bang email nay thi so ho so
// hien DAY DU, khong che. Danh sach nay sua duoc tai day.
export const SUPER_ADMIN_EMAILS = ['admin@d07.com'];

// Thu tu uu tien cau hinh: nguoi dung dan tay (fb_config, de thu project khac)
// -> cau hinh nhung san o tren.
export function resolveFirebaseConfig() {
  try {
    const raw = localStorage.getItem('fb_config');
    if (raw) { const c = JSON.parse(raw); if (c && c.apiKey) return c; }
  } catch { /* bo qua */ }
  return EMBEDDED_FIREBASE_CONFIG;
}

export function isSuperAdmin(user) {
  return !!user && !!user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// ── Tai khoan TVV tu dang ky: ten dang nhap la MSDL (ma so dai ly) ──
// Firebase Auth chi nhan email nen MSDL duoc anh xa thanh email noi bo
// dang "<msdl>@d07.local" (khong phai hop thu that — TVV quen mat khau thi
// Admin xoa tai khoan tren Firebase Console de TVV tao lai).
export const MSDL_EMAIL_DOMAIN = 'd07.local';

export function msdlToEmail(msdl) {
  return `${String(msdl || '').trim().toLowerCase()}@${MSDL_EMAIL_DOMAIN}`;
}

export function emailToMsdl(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e.endsWith(`@${MSDL_EMAIL_DOMAIN}`)) return '';
  return e.slice(0, e.length - MSDL_EMAIL_DOMAIN.length - 1).toUpperCase();
}

export function isMsdlAccount(user) {
  return !!emailToMsdl(user?.email);
}

// O dang nhap chap nhan ca email (tai khoan quan tri/cu) lan MSDL (TVV).
export function resolveLoginEmail(identifier) {
  const s = String(identifier || '').trim();
  return s.includes('@') ? s : msdlToEmail(s);
}

// ── Quyen xem Sales Report ──
// Mac dinh chi Admin chinh xem duoc Sales Report. Admin chinh cap quyen
// cho tung tai khoan bang truong canSalesReport=true trong user_profiles
// (nut bat/tat nam trong panel Duyet TK cua Admin chinh).
export function canViewSalesReport(user, profile) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return !!profile && profile.canSalesReport === true;
}

// ── Quyen xem muc Phong (Unit) trong tab Tinh Anh ──
// Khoa mac dinh: chi Admin chinh, tai khoan duoc Admin cap quyen
// (truong canViewUnit trong user_profiles), hoac UM/BM moi vao duoc.
// isLeader do UI tinh tu snapshot Daily hien tai: AGLevel cua chinh TVV
// la 'UM'/'BM' (sheet Agent) hoac MSDL trung LeaderCode cua 1 Unit
// (sheet Leader) — da doi chieu file that 25.10: 2 nguon nay khop nhau.
export function canViewUnitSection(user, profile, isLeader) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!!profile && profile.canViewUnit === true) return true;
  return isLeader === true;
}
