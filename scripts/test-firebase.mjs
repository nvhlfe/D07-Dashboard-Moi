// Smoke test ket noi Firebase THAT bang config nhung san — trang thai
// SAU dot mo xem cong khai (Lan chot 09/11/2026, domain sales.prud07.top):
//  - DOC daily_sales_tvv khi CHUA dang nhap:
//      + doc duoc  -> ban firestore.rules MOI (read: if true) DA publish.
//      + permission-denied -> ban CU van con hieu luc (Lan chua publish
//        ban moi) — khong phai loi config, test bao ro trang thai nay.
//  - GHI khi CHUA dang nhap: o MOI trang thai deu phai bi chan — day la
//    bat bien an toan cua dot nay (chi noi DOC). Probe bang DELETE 1 doc
//    khong ton tai (xoa doc khong co that la no-op nen khong sua du lieu
//    that ke ca khi rules loi mo ghi). Neu ghi duoc -> FAIL ngay.
// CHI in MA LOI / trang thai — tuyet doi khong in gia tri config / URL chua project.
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, limit, getDocsFromServer } from 'firebase/firestore'
import { EMBEDDED_FIREBASE_CONFIG } from '../src/lib/firebaseConfig.js'
import { probeDaysBack, localTodayYmd } from '../src/lib/snapCache.js'

const pid = EMBEDDED_FIREBASE_CONFIG.projectId
const dbName = `projects/${pid}/databases/(default)`
const base = `https://firestore.googleapis.com/v1/${dbName}/documents`

// ── 1) Doc qua SDK (ep hoi thang may chu) ──
let readState = '' // 'public' | 'auth-only'
let sdkCode = '(none)'
try {
  const app = initializeApp(EMBEDDED_FIREBASE_CONFIG)
  const fs = getFirestore(app)
  await getDocsFromServer(query(collection(fs, 'daily_sales_tvv'), limit(1)))
  readState = 'public'
} catch (e) {
  sdkCode = e?.code || '(unknown)'
  if (sdkCode === 'permission-denied') readState = 'auth-only'
}
console.log('SDK read code:', sdkCode)

// ── 2) SDK khong ket luan duoc (vd 'unavailable' do moi truong chay chan
// kenh WebChannel) -> doi chieu bang REST thuong ──
if (!readState) {
  try {
    const r = await fetch(`${base}/daily_sales_tvv?pageSize=1`)
    const body = await r.json().catch(() => ({}))
    const status = body?.error?.status || '(none)'
    console.log(`REST read cross-check: HTTP ${r.status} | status: ${status}`)
    if (r.status === 200) readState = 'public'
    else if (r.status === 403 && status === 'PERMISSION_DENIED') readState = 'auth-only'
    else if (status === 'NOT_FOUND' || r.status === 404) {
      console.log('❌ Project/collection khong ton tai — config nhung co the tro sai project.')
      process.exit(1)
    }
  } catch (e) {
    console.log('REST read cross-check loi mang:', e.cause?.code || e.message)
    process.exit(1)
  }
}
if (!readState) {
  console.log('⚠️ Khong xac dinh duoc trang thai doc — can kiem tra lai.')
  process.exit(1)
}

// ── 3) Probe GHI khi chua dang nhap: DELETE 1 doc khong ton tai ──
// (allow write bao gom ca delete; doc khong ton tai nen ke ca khi rules
// loi mo ghi thi thao tac nay van la no-op — khong tao/sua du lieu that.
// Luu y: id dang "__...__" bi Firestore cam vi la id du tru, nen dung
// id thuong "guest-write-probe-000".)
let writeDenied = false
try {
  const r = await fetch(`${base}/daily_sales_tvv/guest-write-probe-000`, { method: 'DELETE' })
  const body = await r.json().catch(() => ({}))
  const status = body?.error?.status || '(none)'
  console.log(`REST write probe: HTTP ${r.status} | status: ${status}`)
  if (r.status === 200) {
    console.log('❌ NGUY HIEM: user CHUA dang nhap GHI duoc daily_sales_tvv — rules bi noi qua muc, phai khoa lai ngay (write van phai request.auth != null).')
    process.exit(1)
  }
  writeDenied = r.status === 403 && status === 'PERMISSION_DENIED'
} catch (e) {
  console.log('REST write probe loi mang:', e.cause?.code || e.message)
  process.exit(1)
}
if (!writeDenied) {
  console.log('⚠️ Probe ghi tra trang thai la (khong phai 403/PERMISSION_DENIED, khong phai 200) — can kiem tra lai.')
  process.exit(1)
}

// ── 4) Kiem chung CO CHE DO DOC cua store.js tren du lieu THAT ──
// store.js khong con dung query sap xep __name__ (thieu composite
// index -> FAILED-PRECONDITION) ma DO bang getDoc theo ngay. O day mo
// phong dung co che do: GET REST tung doc = getDoc tuong duong, ngay
// ung vien sinh bang CHINH helper thuan snapCache (probeDaysBack tu
// localTodayYmd) ma store dung. Chi chay khi doc cong khai (public);
// auth-only thi bo qua vi GET se bi 403 o ngay dau tien.
// Khong thay doc trong 45 ngay -> chi CANH BAO (du lieu that co the
// cu hon tran do neu Lan nghi nap dai ngay), khong fail smoke test.
if (readState === 'public') {
  let probedId = ''
  let probeNote = ''
  for (const ymd of probeDaysBack(localTodayYmd(), 45)) {
    try {
      const r = await fetch(`${base}/daily_sales_tvv/${ymd}`)
      if (r.status === 200) { probedId = ymd; break }
      if (r.status === 403) { probeNote = 'bi 403 giua chung — rules vua doi?'; break }
      if (r.status !== 404) { probeNote = `HTTP ${r.status}`; break }
    } catch (e) {
      probeNote = `loi mang: ${e.cause?.code || e.message}`
      break
    }
  }
  if (probedId) {
    console.log(`✅ Do doc theo ngay (co che store.js) tren project that: trung doc moi nhat ${probedId} — getDoc theo ngay chay, khong can index.`)
  } else {
    console.log(`⚠️ Do 45 ngay tu hom nay khong trung doc nao (${probeNote || 'du lieu moi nhat co the cu hon 45 ngay'}) — kiem tra lai neu Lan van dang nap hang ngay.`)
  }
} else {
  console.log('ℹ️ Bo qua kiem chung do doc: rules doc cong khai chua publish (auth-only).')
}

// ── Ket luan ──
if (readState === 'public') {
  console.log('✅ Rules MOI da hieu luc tren project that: khach doc duoc daily_sales_tvv (Trang Chu/Tinh Anh khong can dang nhap); ghi van khoa theo dang nhap.')
} else {
  console.log('✅ Config dung project that + ghi van khoa. LUU Y: rules MOI chua publish — doc van chi user dang nhap; Lan publish firestore.rules (ban trong repo) la khach xem duoc ngay.')
}
process.exit(0)
