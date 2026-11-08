// Smoke test ket noi Firebase THAT bang config nhung san:
// doc Firestore daily_sales_tvv (limit 1) khi CHUA dang nhap.
// Ky vong: 'permission-denied' — chung to config tro dung project that
// va Rules dang bat (chi user dang nhap moi doc duoc).
// CHI in MA LOI — tuyet doi khong in gia tri config / URL chua project.
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, limit, getDocsFromServer } from 'firebase/firestore'
import { EMBEDDED_FIREBASE_CONFIG } from '../src/lib/firebaseConfig.js'

let sdkCode = '(none)'
try {
  const app = initializeApp(EMBEDDED_FIREBASE_CONFIG)
  const fs = getFirestore(app)
  // FromServer: ep hoi thang may chu (getDocs thuong co the tra cache offline
  // va "thanh cong" rong khi mat mang — khong chung minh duoc gi).
  await getDocsFromServer(query(collection(fs, 'daily_sales_tvv'), limit(1)))
} catch (e) {
  sdkCode = e?.code || '(unknown)'
}
console.log('SDK error code:', sdkCode)

if (sdkCode === 'permission-denied') {
  console.log('✅ DUNG KY VONG: config tro dung project that, Rules dang chan user chua dang nhap.')
  process.exit(0)
}
if (sdkCode === '(none)') {
  console.log('⚠️ Doc duoc khi chua dang nhap?! Kiem tra lai Rules.')
  process.exit(2)
}

// SDK tra 'unavailable' thuong do moi truong chay chan kenh WebChannel cua
// Firestore (khong phai loi config). Kiem chung lai bang REST API thuong:
// request khong dang nhap toi cung collection — Rules dung se tra 403 PERMISSION_DENIED.
try {
  const url = `https://firestore.googleapis.com/v1/projects/${EMBEDDED_FIREBASE_CONFIG.projectId}/databases/(default)/documents/daily_sales_tvv?pageSize=1`
  const r = await fetch(url)
  const body = await r.json().catch(() => ({}))
  const status = body?.error?.status || '(none)'
  console.log(`REST cross-check: HTTP ${r.status} | status: ${status}`)
  if (r.status === 403 && status === 'PERMISSION_DENIED') {
    console.log('✅ DUNG KY VONG (qua REST): project that ton tai, Rules dang chan user chua dang nhap. SDK unavailable chi la gioi han kenh truyen cua moi truong chay test.')
    process.exit(0)
  }
  console.log('⚠️ REST tra ket qua khac 403/PERMISSION_DENIED — can kiem tra lai.')
  process.exit(1)
} catch (e) {
  console.log('REST cross-check loi mang:', e.cause?.code || e.message)
  process.exit(1)
}
