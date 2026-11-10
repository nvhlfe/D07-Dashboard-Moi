// ─────────────────────────────────────────────────────────────
// NapDuLieu — Man hinh "Nap du lieu" (MVP):
//  - Keo tha / chon file Daily Sales .xlsx -> parse 5 sheet -> xem tom tat
//  - Hoac file CHI CO sheet Proposal: gop vao snapshot Daily day du moi nhat
//    cung thang (thay proposalRows + dem lai cIF/cPS/cOther), luu thanh
//    snapshot moi theo ngay du lieu — thay doi xem o Sales Report (panel diff).
//  - Luu: Firestore daily_sales_tvv/{date} bang config D07 NHUNG SAN (chi ghi
//    duoc khi DA DANG NHAP — Rules), va LUON luu snapshot vao localStorage;
//    thong bao sau luu noi RO da dong bo len may hay chi luu tren may nay.
//  - Dat muc tieu FYP thang (localStorage d07moi_target_{yyyy-m}).
//  - Khoi "Ket noi Firebase" (dan firebaseConfig, cung UX ban cu).
//  - Lich su nap.
// Loi file khoa RMS/IRM: bao tieng Viet ro rang, khong hien stack trace.
// ─────────────────────────────────────────────────────────────
import React, { useRef, useState } from 'react'
import { parseArrayBuffer, inferDateFromFileName } from '../lib/parseDaily'
import {
  saveLocalSnapshot, saveDailyToFirestore, addHistory, loadHistory,
  getTarget, setTarget, getFbOverride, setFbConfig, clearFbConfig, parseFirebaseConfigPaste,
} from '../lib/store'

const todayKey = () => {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const ERR_LOCKED = 'Không đọc được file này. Rất có thể file đang bị khóa bảo mật (RMS/IRM) của công ty hoặc file bị hỏng — vui lòng gửi bản sao KHÔNG khóa (mở file → Save As thành file mới) hoặc xuất ra CSV/Excel thường rồi nạp lại.'

export default function NapDuLieu({ onSaved, user, snaps }) {
  const [parsed, setParsed] = useState(null)
  const [fileName, setFileName] = useState('')
  const [dataDate, setDataDate] = useState(todayKey())
  // Che do day file Proposal rieng (khong co sheet Agent): gop vao snapshot
  // Daily day du moi nhat CUNG THANG lam base, chi thay proposalRows + dem lai
  // so ho so theo trang thai (cIF/cPS/cOther) cho agent/unit.
  const proposalOnly = !!(parsed && parsed.sheetStatus?.proposal && !parsed.sheetStatus?.agent)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [drag, setDrag] = useState(false)
  const [history, setHistory] = useState(() => loadHistory())
  const fileRef = useRef(null)

  // Muc tieu thang
  const [targetMonth, setTargetMonth] = useState(() => todayKey().slice(0, 7))
  const [targetVal, setTargetVal] = useState(() => {
    const [y, m] = todayKey().slice(0, 7).split('-').map(Number)
    const v = getTarget(y, m); return v !== null ? String(v) : ''
  })
  const [targetMsg, setTargetMsg] = useState('')

  // Firebase config: mac dinh da NHUNG SAN config D07; form nay chi dung khi
  // nguoi dung muon ghi de bang config khac (fb_config) o muc Nang cao.
  const [fbCfg, setFbCfg] = useState(() => getFbOverride() || { apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '', databaseURL: '' })
  const [pasteText, setPasteText] = useState('')
  const [fbMsg, setFbMsg] = useState('')

  const handleFile = async (f) => {
    setParsed(null); setMsg(null)
    if (!f) return
    if (!/\.xlsx?$/i.test(f.name)) {
      setMsg({ type: 'error', text: 'Vui lòng chọn file Excel (.xlsx). ' + ERR_LOCKED })
      return
    }
    try {
      const buf = await f.arrayBuffer()
      const p = parseArrayBuffer(buf)
      const sheetOk = Object.values(p.sheetStatus || {}).some(Boolean)
      const hasData = Object.keys(p.agents || {}).length > 0 || (p.proposalRows || []).length > 0
      if (!sheetOk || !hasData) { setMsg({ type: 'error', text: ERR_LOCKED }); return }
      setParsed(p); setFileName(f.name)
      const inferred = inferDateFromFileName(f.name)
      if (inferred) setDataDate(inferred)
      if (p.sheetStatus?.proposal && !p.sheetStatus?.agent) {
        // File chi co Proposal (khong co Agent) -> che do cap nhat trang thai ho so
        setMsg({
          type: 'info',
          text: `Đã đọc file Proposal riêng: ${p.proposalRows.length} dòng Proposal (không có sheet Agent). Khi bấm Lưu, hệ thống sẽ gộp Proposal này vào bản Daily đầy đủ mới nhất CÙNG THÁNG và tính lại số hồ sơ theo trạng thái — xem thay đổi ở Sales Report, mục “🔔 Thay đổi so với bản trước”.`,
          sheets: p.sheetStatus,
        })
      } else {
        setMsg({
          type: 'info',
          text: `Đã đọc file: ${Object.keys(p.agents).length} TVV · ${Object.keys(p.units).length} Unit · ${p.proposalRows.length} dòng Proposal · ${p.pendingRows.length} hồ sơ Pending · ${p.pipelineRows.length} hồ sơ Pipeline. Kiểm tra ngày dữ liệu bên dưới rồi bấm Lưu.`,
          sheets: p.sheetStatus,
        })
      }
    } catch (e) {
      console.error('[NapDuLieu] parse error:', e)
      setMsg({ type: 'error', text: ERR_LOCKED })
    }
  }

  const handleSaveProposalOnly = async () => {
    // Gop file Proposal rieng vao snapshot Daily day du moi nhat cung thang.
    // Thang suy tu NGAY DU LIEU dang chon (dataDate) — cung nguon thang voi
    // luong luu day du (snapshot luu theo dataDate).
    const ym = String(dataDate || '').slice(0, 7)
    const candidates = (snaps || []).filter((s) => s && s.id && s.id.startsWith(`${ym}-`) && s.data && s.data.agents && Object.keys(s.data.agents).length > 0)
    const base = candidates.length ? candidates[candidates.length - 1] : null
    if (!base) {
      setMsg({ type: 'error', text: `Chưa có bản Daily đầy đủ của tháng ${ym.slice(5)}/${ym.slice(0, 4)} — hãy nạp file Daily Sales đầy đủ trước, sau đó mới đẩy file Proposal riêng.` })
      return
    }
    setSaving(true)
    try {
      // CHUAN B (10/11/2026): gop giu NGUYEN moi dong nhu file goc cong ty
      // ghi — khong khu trung (parse cung khong khu trung nua).
      const newRows = parsed.proposalRows || []
      // Dem lai cIF/cPS/cOther cho tung agent tu proposalRows moi (giong parseDaily)
      const agents = {}
      for (const [msdl, a] of Object.entries(base.data.agents || {})) agents[msdl] = { ...a, cIF: 0, cPS: 0, cOther: 0 }
      for (const p of newRows) {
        const a = agents[p.msdl]
        if (!a) continue
        if (p.statusGroup === 'IF') a.cIF++
        else if (p.statusGroup === 'PS') a.cPS++
        else a.cOther++
      }
      // Dem lai cIF/cPS/cOther cho tung unit (ipSubUnit/ipNetUnit giu nguyen:
      // chung tong tu sheet Agent, khong tu Proposal)
      const units = {}
      for (const [code, u] of Object.entries(base.data.units || {})) units[code] = { ...u, cIF: 0, cPS: 0, cOther: 0 }
      for (const a of Object.values(agents)) {
        if (!units[a.unit]) units[a.unit] = { unit: a.unit, leaderName: '', leaderCode: '', agSeg: '', manpower: 0, caseSubUnit: 0, caseNetUnit: 0, apeSubUnit: 0, apeNetUnit: 0, activeFycUnit: null, ipSubUnit: 0, ipNetUnit: 0, cIF: 0, cPS: 0, cOther: 0 }
        const u = units[a.unit]
        u.cIF += a.cIF; u.cPS += a.cPS; u.cOther += a.cOther
      }
      const payload = {
        agents, units, leaderUnits: base.data.leaderUnits,
        proposalRows: newRows,
        pendingRows: base.data.pendingRows || [], pipelineRows: base.data.pipelineRows || [],
      }
      const local = saveLocalSnapshot(dataDate, fileName, payload)
      const remote = await saveDailyToFirestore(dataDate, payload, user?.email || null)
      let fbNote = ''
      if (remote.ok) fbNote = ' ☁️ Đã đồng bộ lên mây.'
      else if (!user) fbNote = ' ⚠️ Đã lưu trên máy này — đăng nhập để đồng bộ lên mây.'
      else fbNote = ' ⚠️ Đã lưu trên máy này — chưa đồng bộ được lên mây (kiểm tra mạng / Rules rồi nạp lại).'
      const entry = {
        date: dataDate, fileName: `${fileName} (Proposal)`, savedAt: new Date().toISOString(),
        tvv: Object.keys(agents).length, units: Object.keys(units).length,
        proposal: newRows.length, pending: payload.pendingRows.length, pipeline: payload.pipelineRows.length,
      }
      setHistory(addHistory(entry))
      setMsg({ type: 'success', text: `✔ Đã cập nhật Proposal vào bản tháng ${ym.slice(5)}/${ym.slice(0, 4)} (gộp từ bản ${base.id}) — xem mục “🔔 Thay đổi so với bản trước” ở Sales Report.${fbNote}${local.ok ? '' : ' ' + (local.error || '')}` })
      setParsed(null); setFileName('')
      if (fileRef.current) fileRef.current.value = ''
      if (onSaved) onSaved()
    } finally { setSaving(false) }
  }

  const handleSave = async () => {
    if (!parsed || !dataDate) return
    if (proposalOnly) { await handleSaveProposalOnly(); return }
    setSaving(true)
    try {
      const payload = {
        agents: parsed.agents, units: parsed.units, leaderUnits: parsed.leaderUnits,
        proposalRows: parsed.proposalRows, pendingRows: parsed.pendingRows, pipelineRows: parsed.pipelineRows,
      }
      const local = saveLocalSnapshot(dataDate, fileName, payload)
      const remote = await saveDailyToFirestore(dataDate, payload, user?.email || null)
      let fbNote = ''
      if (remote.ok) {
        fbNote = ' ☁️ Đã đồng bộ lên mây — các thiết bị khác đăng nhập là thấy.'
      } else if (!user) {
        fbNote = ' ⚠️ Đã lưu trên máy này — đăng nhập để đồng bộ lên mây cho các thiết bị khác.'
      } else {
        fbNote = ' ⚠️ Đã lưu trên máy này — chưa đồng bộ được lên mây (kiểm tra mạng rồi nạp lại; nếu vẫn lỗi, có thể Rules Firebase chưa cho ghi).'
      }
      const entry = {
        date: dataDate, fileName, savedAt: new Date().toISOString(),
        tvv: Object.keys(parsed.agents).length, units: Object.keys(parsed.units).length,
        proposal: parsed.proposalRows.length, pending: parsed.pendingRows.length, pipeline: parsed.pipelineRows.length,
      }
      setHistory(addHistory(entry))
      setMsg({ type: 'success', text: `✔ Đã lưu dữ liệu ngày ${dataDate}.${fbNote}${local.ok ? '' : ' ' + (local.error || '')}` })
      setParsed(null); setFileName('')
      if (fileRef.current) fileRef.current.value = ''
      if (onSaved) onSaved()
    } finally { setSaving(false) }
  }

  const onTargetMonthChange = (v) => {
    setTargetMonth(v); setTargetMsg('')
    const [y, m] = v.split('-').map(Number)
    const t = getTarget(y, m); setTargetVal(t !== null ? String(t) : '')
  }
  const saveTarget = () => {
    const [y, m] = targetMonth.split('-').map(Number)
    setTarget(y, m, targetVal === '' ? null : Number(targetVal))
    setTargetMsg(targetVal === '' ? 'Đã xoá mục tiêu tháng này.' : `Đã lưu mục tiêu tháng ${m}/${y}: ${Number(targetVal).toLocaleString('vi-VN')} triệu.`)
  }

  const saveFb = () => {
    if (!fbCfg.apiKey || !fbCfg.projectId) { setFbMsg('Cần ít nhất apiKey và projectId.'); return }
    setFbConfig(fbCfg)
    setFbMsg('Đã lưu cấu hình ghi đè. App sẽ dùng cấu hình này thay cho cấu hình D07 nhúng sẵn.')
  }
  const applyPaste = () => {
    const cfg = parseFirebaseConfigPaste(pasteText)
    if (!cfg) { setFbMsg('Không parse được block config — kiểm tra lại nội dung đã dán.'); return }
    setFbCfg((prev) => ({ ...prev, ...cfg }))
    setFbMsg('Đã điền tự động từ block config. Bấm "Lưu cấu hình Firebase" để hoàn tất.')
  }

  const fbField = (label, k, placeholder) => (
    <div className="field" key={k}>
      <label>{label}</label>
      <input value={fbCfg[k] || ''} placeholder={placeholder} onChange={(e) => setFbCfg((p) => ({ ...p, [k]: e.target.value }))} />
    </div>
  )

  return (
    <div className="nap-wrap">
      <div className="card">
        <h2>📥 Nạp file Daily Sales</h2>
        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onClick={() => fileRef.current && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files && e.dataTransfer.files[0]) }}
        >
          <div className="dz-ic">📂</div>
          <div style={{ fontWeight: 700 }}>Kéo thả file .xlsx vào đây, hoặc bấm để chọn file</div>
          <div className="muted">Chấp nhận file Daily Sales đầy đủ 5 sheet (Proposal, Agent, Leader, Pending, Pipeline) — hoặc file chỉ có sheet Proposal để cập nhật trạng thái hồ sơ (cần đã có bản Daily đầy đủ cùng tháng trước đó).</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files && e.target.files[0])} />
        </div>

        {msg && (
          <div className={`msg ${msg.type}`}>
            <div>{msg.text}</div>
            {msg.sheets && (
              <div className="sheet-badges">
                {[['Proposal', 'proposal'], ['Agent', 'agent'], ['Leader', 'leader'], ['Pending', 'pending'], ['Pipeline', 'pipeline']].map(([label, k]) => (
                  <span key={k} className={msg.sheets[k] ? 'ok' : 'miss'}>{msg.sheets[k] ? '✔' : '✘'} {label}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="field" style={{ marginTop: 12 }}>
          <label>Ngày dữ liệu (tự suy ra từ tên file, sửa nếu chưa đúng)</label>
          <input type="date" value={dataDate} onChange={(e) => setDataDate(e.target.value)} />
        </div>
        <button className="btn-primary" disabled={!parsed || saving} onClick={handleSave}>
          {saving ? 'Đang lưu…' : '💾 Lưu dữ liệu'}
        </button>
      </div>

      <div className="card">
        <h2>🎯 Mục tiêu FYP tháng</h2>
        <div className="field">
          <label>Tháng</label>
          <input type="month" value={targetMonth} onChange={(e) => onTargetMonthChange(e.target.value)} />
        </div>
        <div className="field">
          <label>Mục tiêu FYP (triệu đồng)</label>
          <input type="number" inputMode="decimal" min="0" value={targetVal} placeholder="Ví dụ: 3500"
            onChange={(e) => setTargetVal(e.target.value)} />
        </div>
        <button className="btn-ghost" onClick={saveTarget}>Lưu mục tiêu</button>
        {targetMsg && <div className="msg success">{targetMsg}</div>}
      </div>

      <div className="card">
        <h2>☁️ Firebase — đồng bộ nhiều thiết bị</h2>
        <p className="muted">
          Trạng thái: {user
            ? <>đã đăng nhập <b>{user.email}</b> — nạp dữ liệu sẽ <b>đồng bộ lên mây</b>, máy khác đăng nhập là thấy.</>
            : <>chưa đăng nhập — dữ liệu nạp chỉ lưu trên máy này. <b>Đăng nhập</b> (nút ở đầu trang) để đồng bộ lên mây cho các thiết bị khác.</>}
        </p>
        {getFbOverride() && (
          <div className="msg info">Đang dùng cấu hình GHI ĐÈ do bạn dán (project {getFbOverride().projectId || ''}) thay cho cấu hình nhúng sẵn.</div>
        )}
        <details className="collapse" style={{ marginTop: 12, marginBottom: 0 }}>
          <summary>⚙️ Nâng cao: dùng cấu hình khác</summary>
          <p className="muted" style={{ margin: '8px 0' }}>
            Chỉ dùng khi muốn trỏ app sang Firebase project khác. Dán toàn bộ block <b>firebaseConfig</b>
            hoặc điền từng ô — config ghi đè lưu trên máy này (key <b>fb_config</b>, giống bản cũ) và được ưu tiên hơn cấu hình nhúng sẵn.
          </p>
          <div className="field">
            <label>Dán firebaseConfig block</label>
            <textarea rows={7} value={pasteText} onChange={(e) => setPasteText(e.target.value)}
              placeholder={'const firebaseConfig = {\n  apiKey: "AIza...",\n  projectId: "...",\n  ...\n}'} />
          </div>
          <button className="btn-ghost" onClick={applyPaste} style={{ marginBottom: 12 }}>Parse & điền tự động</button>
          {fbField('apiKey *', 'apiKey', 'AIzaSy...')}
          {fbField('projectId *', 'projectId', 'your-project-id')}
          {fbField('authDomain', 'authDomain', 'your-project.firebaseapp.com')}
          {fbField('databaseURL', 'databaseURL', 'https://...firebasedatabase.app')}
          {fbField('storageBucket', 'storageBucket', 'your-project.appspot.com')}
          {fbField('messagingSenderId', 'messagingSenderId', '123456789')}
          {fbField('appId', 'appId', '1:123:web:abc...')}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-ghost" onClick={saveFb}>💾 Lưu cấu hình ghi đè</button>
            {getFbOverride() && <button className="btn-ghost" onClick={() => { clearFbConfig(); setFbMsg('Đã xoá cấu hình ghi đè — app quay về cấu hình D07 nhúng sẵn.'); }}>Quay về cấu hình D07 mặc định</button>}
          </div>
          {fbMsg && <div className="msg info">{fbMsg}</div>}
        </details>
      </div>

      <div className="card">
        <h2>🕘 Lịch sử nạp</h2>
        {!history.length && <div className="muted">Chưa có lần nạp nào trên máy này.</div>}
        {history.map((h, i) => (
          <div className="hist-row" key={`${h.savedAt}-${i}`}>
            <span className="h-date">{h.date}</span>
            <span className="h-file">{h.fileName || ''}</span>
            <span className="h-count">{h.tvv} TVV · {h.proposal} HS</span>
          </div>
        ))}
      </div>
    </div>
  )
}
