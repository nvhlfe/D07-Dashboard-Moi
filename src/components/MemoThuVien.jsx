// ─────────────────────────────────────────────────────────────
// MemoThuVien — 📌 Memo · Thi dua · Tai lieu (theo mau D03).
// Thu vien memo phan loai theo doi tuong (Tu van vien / Quan ly /
// Khach hang / Chinh sach thu nhap), tim kiem khong dau, memo ghim
// len dau.
// DANG memo (chi Admin chinh): CHI nhan file PDF goc (tai len
// Storage memos/{id}/original.pdf, giu cho nut Tai ve). Ngay sau khi
// dang, app TU TACH TUNG TRANG PDF thanh anh JPEG (lib/pdfCover,
// pdfjs import TINH — khong lazy chunk) tai len page-{i}.jpg va ghi
// pages[] + coverUrl (= trang 1) vao doc — xem memo la xem ANH TUNG
// TRANG nhu cach cu. Tran tach trang 50: PDF dai hon thi bo tach,
// xem bang khung PDF nhu thuong. Tach trang loi giua chung KHONG
// chan viec dang (memo da co PDF goc) — Admin mo chi tiet, he thong
// tu tach lai 1 lan/phien (thay co che tu tao bia cu).
// Kieu dang bang NHIEU ANH (sourceType 'images') da GO 09/11/2026
// theo chot cua Lan (loi khi tai tren may Lan) — doc 'images' neu
// da ton tai van xem duoc qua pages[] nhu thuong.
// SUA memo (chi Admin): nut ✏️ Sua trong chi tiet, sua cac truong
// chu (tieu de/ghi chu/doi tuong/ghim/tom tat/luu y) qua
// updateMemoDoc — khong doi file.
// Panel "Tom tat & diem can luu y" KHONG con anh bia (Lan chot
// 09/11/2026: bia trung voi trang 1 o cot noi dung) — bia chi con
// o the thu vien.
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMemos, uploadMemoPdf, createMemoDoc, deleteMemoEverywhere, fetchMemoPdfBlob, uploadMemoPageImage, cleanupMemoFiles, setMemoPages, updateMemoDoc } from '../lib/store'
import { renderPdfAllPagesToJpegBlobs, MEMO_MAX_SPLIT_PAGES } from '../lib/pdfCover'
import { AUDIENCES, audienceLabel, filterMemos, sortMemos, summaryLines } from '../lib/memoLib'

const FILTERS = [{ code: 'all', label: 'Tất cả' }, ...AUDIENCES]

const shortFileName = (name, max = 30) => {
  const s = String(name || '')
  if (s.length <= max) return s
  const ext = s.includes('.') ? s.slice(s.lastIndexOf('.')) : ''
  const keep = Math.max(8, max - ext.length - 1)
  return `${s.slice(0, keep)}…${ext}`
}

const emptyForm = () => ({ title: '', note: '', summary: '', warnings: '', pinned: false, audience: ['tvv'] })

// Khoi tao form SUA tu doc memo da dang (khong gom truong file).
const editFormFrom = (m) => ({
  title: m?.title || '',
  note: m?.note || '',
  summary: m?.summary || '',
  warnings: m?.warnings || '',
  pinned: !!m?.pinned,
  audience: Array.isArray(m?.audience) && m.audience.length ? [...m.audience] : [],
})

/**
 * Tach tung trang PDF thanh anh + tai len Storage + ghi pages[] vao
 * doc memo. DUNG CHUNG cho luong dang moi va luong tu tach cho memo
 * cu trong chi tiet. onStatus(text) nhan tien trinh tung buoc
 * ("Đang tách trang i/n…" / "Đang tải trang i/n…").
 * Ket qua:
 *  - { ok: true, pages, pagePaths, pageCount }
 *  - { ok: false, tooManyPages: true, numPages }: PDF > tran 50 trang.
 *  - { ok: false, error }: loi o bat ky buoc nao — cac file trang da
 *    lo tai duoc don sach (cleanupMemoFiles), doc memo KHONG bi ghi
 *    pages[] nua voi.
 */
async function splitAndUploadPages(memoId, source, onStatus) {
  const status = (t) => { if (typeof onStatus === 'function') onStatus(t) }
  const res = await renderPdfAllPagesToJpegBlobs(source, {
    onPage: (i, n) => status(`Đang tách trang ${i}/${n}…`),
  })
  if (!res) return { ok: false, error: 'Không đọc được nội dung PDF để tách trang.' }
  if (res.tooManyPages) return { ok: false, tooManyPages: true, numPages: res.numPages }
  const blobs = res.blobs || []
  if (!blobs.length || blobs.some((b) => !b)) {
    return { ok: false, error: 'Có trang PDF không render được thành ảnh.' }
  }
  const urls = []
  const paths = []
  for (let i = 0; i < blobs.length; i += 1) {
    status(`Đang tải trang ${i + 1}/${blobs.length}…`)
    const up = await uploadMemoPageImage(memoId, i + 1, blobs[i])
    if (!up.ok) {
      await cleanupMemoFiles(paths)
      return { ok: false, error: up.error || 'Tải trang ảnh lên không thành công.' }
    }
    urls.push(up.url)
    paths.push(up.path)
  }
  const saved = await setMemoPages(memoId, { pages: urls, pagePaths: paths, pageCount: urls.length, coverUrl: urls[0] })
  if (!saved.ok) {
    await cleanupMemoFiles(paths)
    return { ok: false, error: saved.error || 'Lưu trang ảnh memo không thành công.' }
  }
  return { ok: true, pages: urls, pagePaths: paths, pageCount: urls.length }
}

export default function MemoThuVien({ user, isSuperAdmin, onClose, onOpenLogin }) {
  const [memos, setMemos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [q, setQ] = useState('')
  const [audience, setAudience] = useState('all')
  const [selected, setSelected] = useState(null)
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [pdfFile, setPdfFile] = useState(null)
  const [busy, setBusy] = useState('')
  const [formErr, setFormErr] = useState('')
  const [notice, setNotice] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  // Trang thai TU TACH TRANG trong man hinh chi tiet (chi Admin kich hoat)
  const [splitState, setSplitState] = useState('')
  const [splitMsg, setSplitMsg] = useState('')
  const splitTriedRef = useRef(new Set())
  // Form SUA memo trong chi tiet (chi Admin)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState('')
  const [editNotice, setEditNotice] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    const res = await fetchMemos()
    setMemos(Array.isArray(res.memos) ? res.memos : [])
    setLoadErr(res.error || '')
    setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])

  const visible = useMemo(() => sortMemos(filterMemos(memos, { q, audience })), [memos, q, audience])

  const handlePickFile = (e) => {
    const f = e.target.files && e.target.files[0]
    setPdfFile(f || null)
    setFormErr('')
    if (f) {
      setForm((prev) => (prev.title.trim()
        ? prev
        : { ...prev, title: f.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim() }))
    }
  }

  // Dong form + reset sau khi dang thanh cong
  const finishSubmit = async (text) => {
    setBusy('')
    setShowForm(false)
    setForm(emptyForm())
    setPdfFile(null)
    setNotice({ type: 'success', text })
    await reload()
  }

  const handleSubmit = async () => {
    setFormErr('')
    setNotice(null)
    if (!pdfFile) { setFormErr('Chưa chọn file PDF.'); return }
    if (pdfFile.size > 25 * 1024 * 1024) { setFormErr('File PDF lớn hơn 25MB — hãy nén file rồi đăng lại.'); return }
    if (!form.title.trim()) { setFormErr('Chưa nhập tiêu đề memo.'); return }
    if (!form.audience.length) { setFormErr('Chọn ít nhất 1 nhóm đối tượng cho memo.'); return }
    const memoId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const now = new Date()
    const p2 = (n) => String(n).padStart(2, '0')
    const baseDoc = {
      id: memoId,
      title: form.title.trim(),
      note: form.note.trim(),
      summary: form.summary,
      warnings: form.warnings,
      audience: form.audience,
      pinned: !!form.pinned,
      displayDate: `${p2(now.getDate())}/${p2(now.getMonth() + 1)}`,
      createdAt: now.getTime(),
      createdBy: user?.email || '',
    }
    setBusy('Đang tải file PDF lên kho lưu trữ…')
    const up = await uploadMemoPdf(memoId, pdfFile)
    if (!up.ok) { setBusy(''); setFormErr(up.error || 'Tải file lên không thành công.'); return }
    const created = await createMemoDoc({
      ...baseDoc,
      sourceType: 'pdf',
      fileName: pdfFile.name,
      pageCount: 0,
      pages: [],
      pdfUrl: up.pdfUrl,
      pdfPath: up.pdfPath,
      pagePaths: [],
    })
    if (!created.ok) { setBusy(''); setFormErr(created.error || 'Lưu thông tin memo không thành công.'); return }
    // TU TACH TUNG TRANG PDF thanh anh ngay khi dang (thao tac PHU:
    // loi/tran trang thi memo van dang thanh cong bang PDF goc).
    let split = null
    try {
      split = await splitAndUploadPages(memoId, pdfFile, setBusy)
    } catch (e) {
      console.warn('[MemoThuVien] tach trang khi dang:', e)
      split = { ok: false, error: '' }
    }
    if (split.ok) {
      await finishSubmit(`✓ Đã đăng memo “${baseDoc.title}” và tách thành ${split.pageCount} trang ảnh để xem.`)
    } else if (split.tooManyPages) {
      await finishSubmit(`✓ Đã đăng memo “${baseDoc.title}”. PDF có ${split.numPages} trang (hơn ${MEMO_MAX_SPLIT_PAGES} trang) nên chưa tách ảnh — mở memo vẫn xem được bằng khung PDF như thường.`)
    } else {
      await finishSubmit(`✓ Đã đăng memo “${baseDoc.title}”, nhưng chưa tách được trang ảnh — mở memo bằng tài khoản Admin, hệ thống sẽ tự tách lại.`)
    }
  }

  const handleDelete = async (m) => {
    if (!window.confirm(`Xoá memo “${m.title || m.fileName || ''}” và toàn bộ file đính kèm?`)) return
    setDeletingId(m.id)
    setNotice(null)
    const res = await deleteMemoEverywhere(m)
    setDeletingId('')
    if (selected && selected.id === m.id) setSelected(null)
    await reload()
    if (res.ok) setNotice({ type: 'success', text: '✓ Đã xoá memo và toàn bộ file đính kèm.' })
    else if (res.docOk) setNotice({ type: 'error', text: `Đã xoá thông tin memo nhưng còn sót file: ${res.errors.join(' ')}` })
    else setNotice({ type: 'error', text: res.errors[0] || 'Xoá memo không thành công.' })
  }

  // ── Form SUA memo (chi Admin) ──
  const openEdit = () => {
    setEditForm(editFormFrom(selected))
    setEditErr('')
    setEditNotice('')
    setShowEdit(true)
  }

  const handleEditSave = async () => {
    if (!selected) return
    setEditErr('')
    if (!editForm.title.trim()) { setEditErr('Chưa nhập tiêu đề memo.'); return }
    if (!editForm.audience.length) { setEditErr('Chọn ít nhất 1 nhóm đối tượng cho memo.'); return }
    const fields = {
      title: editForm.title.trim(),
      note: editForm.note.trim(),
      summary: editForm.summary,
      warnings: editForm.warnings,
      audience: editForm.audience,
      pinned: !!editForm.pinned,
    }
    setEditBusy(true)
    const saved = await updateMemoDoc(selected.id, fields)
    setEditBusy(false)
    if (!saved.ok) { setEditErr(saved.error || 'Lưu chỉnh sửa memo không thành công.'); return }
    setMemos((prev) => prev.map((m) => (m.id === selected.id ? { ...m, ...fields } : m)))
    setSelected((cur) => (cur && cur.id === selected.id ? { ...cur, ...fields } : cur))
    setShowEdit(false)
    setEditNotice('✓ Đã lưu chỉnh sửa memo.')
  }

  // ── Tu TACH TRANG cho memo DA DANG chua co pages[] ──
  // Thay co che tu tao bia cu. Chi Admin mo chi tiet moi kich hoat
  // (rules ghi memo chi Admin): lay PDF goc qua Storage SDK -> tach
  // moi trang -> tai len -> ghi pages[]/coverUrl vao doc -> chi tiet
  // chuyen ngay sang xem dang anh. Moi memo chi thu 1 lan trong
  // phien (splitTriedRef) de tranh lap loi vo han; loi van xem PDF
  // binh thuong. Memo da co coverUrl nhung CHUA co pages (vd Memo
  // 00111) van duoc tach — dieu kien chi nhin pages[] + pdfUrl.
  const lastSelIdRef = useRef(null)
  useEffect(() => {
    // Chi reset trang thai khi DOI sang memo khac (selected doi object
    // nhung cung id — vd sau khi tach trang xong cap nhat tai cho —
    // thi giu nguyen thong bao "da tach xong").
    const selId = selected?.id || null
    if (lastSelIdRef.current !== selId) {
      lastSelIdRef.current = selId
      setSplitState('')
      setSplitMsg('')
      setShowEdit(false)
      setEditNotice('')
      setEditErr('')
    }
    if (!isSuperAdmin || !selected) return undefined
    const hasPages = Array.isArray(selected.pages) && selected.pages.length > 0
    if (hasPages || !selected.pdfUrl || splitTriedRef.current.has(selected.id)) return undefined
    splitTriedRef.current.add(selected.id)
    let alive = true
    setSplitState('making')
    setSplitMsg('Đang tự tách trang ảnh cho memo này…')
    ;(async () => {
      try {
        const pdfBlob = await fetchMemoPdfBlob(selected.id)
        if (!pdfBlob) { if (alive) { setSplitState('error'); setSplitMsg('') } return }
        const split = await splitAndUploadPages(selected.id, pdfBlob, (t) => { if (alive) setSplitMsg(t) })
        if (!alive) return
        if (split.ok) {
          const patch = { pages: split.pages, pagePaths: split.pagePaths, pageCount: split.pageCount, coverUrl: split.pages[0] }
          setMemos((prev) => prev.map((m) => (m.id === selected.id ? { ...m, ...patch } : m)))
          setSelected((cur) => (cur && cur.id === selected.id ? { ...cur, ...patch } : cur))
          setSplitState('done')
          setSplitMsg(`✓ Đã tách memo này thành ${split.pageCount} trang ảnh — từ nay xem dạng ảnh từng trang.`)
        } else if (split.tooManyPages) {
          setSplitState('toomany')
          setSplitMsg(`Memo này có ${split.numPages} trang (hơn ${MEMO_MAX_SPLIT_PAGES} trang) nên xem bằng khung PDF như thường, không tách ảnh.`)
        } else {
          setSplitState('error')
          setSplitMsg('')
        }
      } catch (e) {
        console.warn('[MemoThuVien] tu tach trang cho memo cu:', e)
        if (alive) { setSplitState('error'); setSplitMsg('') }
      }
    })()
    return () => { alive = false }
  }, [selected, isSuperAdmin])

  // ── Phan truong CHU dung chung cho form DANG va form SUA ──
  const renderTextFields = (f, setF) => {
    const toggleAud = (code) => {
      setF((prev) => ({
        ...prev,
        audience: prev.audience.includes(code) ? prev.audience.filter((c) => c !== code) : [...prev.audience, code],
      }))
    }
    return (
      <>
        <div className="field">
          <label>Tiêu đề</label>
          <input value={f.title} placeholder="VD: Memo 00211/AD/2026 - Thi đua ngắn hạn tháng 11"
            onChange={(e) => setF((prev) => ({ ...prev, title: e.target.value }))} />
        </div>
        <div className="field">
          <label>Ghi chú ngắn (hiện dưới tiêu đề ở thẻ)</label>
          <input value={f.note} placeholder="VD: Thưởng tiền mặt theo Tổng IP tháng 11"
            onChange={(e) => setF((prev) => ({ ...prev, note: e.target.value }))} />
        </div>
        <div className="field">
          <label>Đối tượng</label>
          <div className="memo-checks">
            {AUDIENCES.map((a) => (
              <label className="memo-check" key={a.code}>
                <input type="checkbox" checked={f.audience.includes(a.code)} onChange={() => toggleAud(a.code)} />
                {a.label}
              </label>
            ))}
          </div>
        </div>
        <label className="memo-check" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={f.pinned} onChange={(e) => setF((prev) => ({ ...prev, pinned: e.target.checked }))} />
          📌 Ghim mục này lên đầu thư viện
        </label>
        <div className="field">
          <label>Tóm tắt (mỗi dòng 1 ý)</label>
          <textarea rows={5} value={f.summary} placeholder={'VD:\nThi đua tháng 11/2026: thưởng theo Tổng IP hồ sơ hợp lệ nộp trong tháng.\nTừ 18tr IP: 1,5tr · Từ 25tr: 2,5tr · Từ 50tr: 5tr · Từ 100tr: 8% IP.'}
            onChange={(e) => setF((prev) => ({ ...prev, summary: e.target.value }))} />
        </div>
        <div className="field">
          <label>Lưu ý quan trọng (mỗi dòng 1 ý, không bắt buộc)</label>
          <textarea rows={3} value={f.warnings} placeholder={'VD:\nHồ sơ phải nộp 01/11–30/11/2026 và phát hành đến hết 30/11/2026.\nTổng thưởng tối đa 100tr/TVV.'}
            onChange={(e) => setF((prev) => ({ ...prev, warnings: e.target.value }))} />
        </div>
      </>
    )
  }

  // ── The memo trong luoi ──
  const renderCard = (m) => (
    <div className="memo-card" key={m.id} onClick={() => { setSelected(m); setSummaryOpen(true) }}>
      {isSuperAdmin && (
        <button
          type="button" className="memo-del" title="Xoá memo"
          disabled={deletingId === m.id}
          onClick={(e) => { e.stopPropagation(); handleDelete(m) }}
        >{deletingId === m.id ? '…' : '🗑'}</button>
      )}
      <div className="memo-card-title"><span className="memo-pin-ic">📌</span>{m.title || m.fileName || 'Memo'}</div>
      {m.note ? <div className="memo-card-note">{m.note}</div> : null}
      <div className="memo-chips">
        {(Array.isArray(m.audience) ? m.audience : []).map((c) => (
          <span className="memo-chip" key={c}>{audienceLabel(c)}</span>
        ))}
        {m.pinned ? <span className="memo-chip pin">📌 Ghim mục</span> : null}
      </div>
      {m.displayDate ? <div className="memo-card-date">{m.displayDate}</div> : null}
      {m.coverUrl || (Array.isArray(m.pages) && m.pages[0])
        ? <img className="memo-thumb" src={m.coverUrl || m.pages[0]} alt={m.title || 'Memo'} loading="lazy" />
        : <div className="memo-thumb memo-thumb-empty">📄</div>}
      {m.fileName ? <div className="memo-card-file">{shortFileName(m.fileName)}</div> : null}
    </div>
  )

  // ── Man hinh chi tiet 1 memo ──
  if (selected) {
    const sumLines = summaryLines(selected.summary)
    const warnLines = summaryLines(selected.warnings)
    return (
      <div className="memo-breakout">
        <div className="memo-head">
          <div className="memo-detail-name">
            <span className="memo-file-ic">📄</span>
            <b>{selected.fileName || selected.title || 'Memo'}</b>
            {selected.pageCount ? <span className="muted"> · {selected.pageCount} trang</span> : null}
          </div>
          <div className="memo-head-btns">
            {/* Ai cung XEM duoc memo; chi tai khoan DA DANG NHAP moi TAI
                duoc file (Lan chot 08/11/2026). Chua dang nhap -> nut mo
                form dang nhap thay cho link tai. */}
            {selected.pdfUrl
              ? (user
                ? <a className="btn-mini" href={selected.pdfUrl} target="_blank" rel="noreferrer">⬇ Tải về</a>
                : <button type="button" className="btn-mini" onClick={() => { if (onOpenLogin) onOpenLogin() }}>🔒 Đăng nhập để tải về</button>)
              : null}
            {isSuperAdmin && (
              <button type="button" className="btn-mini" onClick={openEdit}>✏️ Sửa</button>
            )}
            {isSuperAdmin && (
              <button
                type="button" className="btn-mini"
                disabled={deletingId === selected.id}
                onClick={() => handleDelete(selected)}
              >{deletingId === selected.id ? '…' : '🗑 Xoá'}</button>
            )}
            <button type="button" className="btn-mini" onClick={() => setSelected(null)}>✕ Đóng</button>
          </div>
        </div>

        {splitState === 'making' ? <p className="muted" style={{ margin: '0 0 8px' }}>🖼 {splitMsg || 'Đang tự tách trang ảnh cho memo này…'}</p> : null}
        {splitState === 'done' ? <p className="muted" style={{ margin: '0 0 8px' }}>{splitMsg}</p> : null}
        {splitState === 'toomany' ? <p className="muted" style={{ margin: '0 0 8px' }}>{splitMsg}</p> : null}
        {splitState === 'error' ? <p className="muted" style={{ margin: '0 0 8px' }}>Chưa tách được trang ảnh tự động cho memo này — vẫn xem PDF bình thường ở khung bên cạnh.</p> : null}
        {editNotice ? <p className="muted" style={{ margin: '0 0 8px' }}>{editNotice}</p> : null}

        {showEdit && isSuperAdmin && (
          <div className="card memo-form" style={{ marginBottom: 12 }}>
            <h2>✏️ Sửa memo</h2>
            <p className="muted" style={{ marginTop: 0 }}>Chỉ sửa thông tin chữ — file PDF và trang ảnh giữ nguyên.</p>
            {renderTextFields(editForm, setEditForm)}
            {editErr ? <div className="msg error">{editErr}</div> : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="btn-primary" disabled={editBusy} onClick={handleEditSave}>
                {editBusy ? 'Đang lưu…' : '💾 Lưu thay đổi'}
              </button>
              <button type="button" className="btn-ghost" disabled={editBusy} onClick={() => setShowEdit(false)}>Huỷ</button>
            </div>
          </div>
        )}

        <div className="memo-detail-grid">
          <aside className="memo-summary card">
            <button type="button" className="memo-summary-head" onClick={() => setSummaryOpen((o) => !o)}>
              <span>📌 Tóm tắt &amp; điểm cần lưu ý</span>
              <span className="memo-caret">{summaryOpen ? '▾' : '▸'}</span>
            </button>
            {summaryOpen && (
              <div className="memo-summary-body">
                {selected.title ? <div className="memo-summary-title">{selected.title}</div> : null}
                {sumLines.length > 0 && (
                  <>
                    <div className="memo-sec-label">TÓM TẮT</div>
                    <ul className="memo-bullets">
                      {sumLines.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  </>
                )}
                {warnLines.length > 0 && (
                  <>
                    <div className="memo-sec-label warn">⚠ LƯU Ý QUAN TRỌNG</div>
                    <ul className="memo-bullets">
                      {warnLines.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  </>
                )}
                {sumLines.length === 0 && warnLines.length === 0 && (
                  <p className="muted">Memo này chưa có tóm tắt — xem nội dung đầy đủ trong khung bên cạnh.</p>
                )}
              </div>
            )}
          </aside>

          <div className="memo-pages">
            {Array.isArray(selected.pages) && selected.pages.length > 0
              ? selected.pages.map((url, i) => (
                <img key={i} className="memo-page" src={url} alt={`Trang ${i + 1}`} loading="lazy" />
              ))
              : selected.pdfUrl
                ? (
                  <>
                    <iframe
                      className="memo-pdf-frame"
                      src={selected.pdfUrl}
                      title={selected.fileName || selected.title || 'Tài liệu PDF'}
                    />
                    <p className="muted memo-pdf-hint">Nếu khung trên không hiện nội dung (một số điện thoại Android), bấm nút <b>Tải về</b> ở trên để mở file PDF trực tiếp{user ? '' : ' (cần đăng nhập)'}.</p>
                  </>
                )
                : <div className="card empty"><div className="e-ic">📄</div>Memo này chưa có file đính kèm.</div>}
          </div>
        </div>
      </div>
    )
  }

  // ── Man hinh thu vien (luoi) ──
  return (
    <div className="memo-breakout">
      <div className="memo-head">
        <div className="memo-title">📌 Memo · Thi đua · Tài liệu</div>
        {onClose && <button type="button" className="btn-mini" onClick={onClose}>✕ Đóng</button>}
      </div>

      <div className="search-row">
        <div className="field">
          <input
            type="search" value={q} placeholder="Tìm theo tiêu đề, ghi chú..."
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="chips-row">
        {FILTERS.map((f) => (
          <button
            type="button" key={f.code}
            className={`fchip sm ${audience === f.code ? 'active' : ''}`}
            onClick={() => setAudience(f.code)}
          >{f.label}</button>
        ))}
      </div>

      {isSuperAdmin && !showForm && (
        <button type="button" className="btn-primary" style={{ marginBottom: 12 }} onClick={() => { setFormErr(''); setPdfFile(null); setShowForm(true) }}>
          ＋ Đăng memo
        </button>
      )}

      {showForm && isSuperAdmin && (
        <div className="card memo-form">
          <h2>＋ Đăng memo mới</h2>
          <div className="field">
            <label>File PDF (tối đa 25MB) — app tự tách từng trang thành ảnh để xem, vẫn giữ PDF gốc cho nút tải về</label>
            <input type="file" accept="application/pdf,.pdf" onChange={handlePickFile} />
            {pdfFile ? <div className="muted" style={{ marginTop: 4 }}>{pdfFile.name} · {(pdfFile.size / 1024 / 1024).toFixed(2)}MB</div> : null}
          </div>
          {renderTextFields(form, setForm)}
          {busy ? <div className="msg info">{busy}</div> : null}
          {formErr ? <div className="msg error">{formErr}</div> : null}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="btn-primary" disabled={!!busy} onClick={handleSubmit}>
              {busy ? 'Đang xử lý…' : '⬆ Đăng memo'}
            </button>
            <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => setShowForm(false)}>Huỷ</button>
          </div>
        </div>
      )}

      {notice ? <div className={`msg ${notice.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 12 }}>{notice.text}</div> : null}

      {loading ? (
        <div className="card empty"><div className="e-ic">⏳</div>Đang tải thư viện memo…</div>
      ) : loadErr ? (
        <div className="warn-box">
          <div className="w-title">⚠ Chưa đọc được thư viện memo</div>
          <div>Có thể kho lưu trữ (Storage) / Rules chưa được bật ở Firebase Console. Admin chính cần bật Storage và publish <b>firestore.rules</b> + <b>storage.rules</b> thì thư viện memo mới hoạt động.</div>
          <div className="muted" style={{ marginTop: 6 }}>{loadErr}</div>
          <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={reload}>↻ Thử lại</button>
        </div>
      ) : memos.length === 0 ? (
        <div className="card empty">
          <div className="e-ic">📌</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có memo nào</div>
          <p>{isSuperAdmin ? 'Bấm “＋ Đăng memo” ở trên để đăng tài liệu đầu tiên cho Quận 7 — chỉ cần chọn file PDF, app tự tách từng trang thành ảnh để xem.' : 'Admin chính chưa đăng memo nào — quay lại sau nhé.'}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="card empty">
          <div className="e-ic">🔍</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Không tìm thấy memo khớp bộ lọc</div>
          <p>Thử xoá từ khoá tìm kiếm hoặc chọn nhóm đối tượng khác.</p>
        </div>
      ) : (
        <div className="memo-grid">
          {visible.map(renderCard)}
        </div>
      )}
    </div>
  )
}
