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
