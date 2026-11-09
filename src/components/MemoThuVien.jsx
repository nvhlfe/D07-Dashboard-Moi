// ─────────────────────────────────────────────────────────────
// MemoThuVien — 📌 Memo · Thi dua · Tai lieu (theo mau D03).
// Thu vien memo phan loai theo doi tuong (Tu van vien / Quan ly /
// Khach hang / Chinh sach thu nhap), tim kiem khong dau, memo ghim
// len dau. Xem chi tiet: DOC FILE PDF TRUC TIEP trong khung nhung
// + nut Tai ve, kem panel "Tom tat & diem can luu y".
// Admin chinh dang memo theo 1 trong 2 kieu nguon (sourceType):
//  - 'pdf' (mac dinh, doc cu khong co truong nay cung hieu la 'pdf'):
//    tai PDF goc len Firebase Storage, metadata o Firestore `memos`
//    (khong tach anh de XEM nua — Lan chot doi sang doc truc tiep
//    08/11/2026 sau khi chunk tach anh bi 404 do ban deploy moi thay
//    the asset cu). Memo cu nao da co anh trang (pages[]) van xem
//    dang anh nhu truoc.
//  - 'images' (Lan yeu cau 09/11/2026 vi xem PDF hoi phuc tap): Admin
//    chon NHIEU anh trang memo cung luc; anh duoc nen JPEG (rong toi
//    da 1200px) ngay tren trinh duyet roi tai tung anh len
//    memos/{id}/page-{i}.jpg; doc luu pages[] + coverUrl = anh dau,
//    xem theo nhanh anh trang san co, khong co nut Tai ve PDF.
// Anh BIA thu vien: tu dong render TRANG 1 thanh JPEG (coverUrl)
// ngay khi dang (lib/pdfCover, pdfjs import TINH — khong lazy chunk);
// memo da dang thieu bia thi Admin mo chi tiet se tu bo sung 1 lan.
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMemos, uploadMemoPdf, createMemoDoc, deleteMemoEverywhere, uploadMemoCover, setMemoCoverUrl, fetchMemoPdfBlob, uploadMemoPageImage, cleanupMemoFiles } from '../lib/store'
import { renderPdfFirstPageToJpegBlob } from '../lib/pdfCover'
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

// Gioi han dang bang NHIEU ANH: toi da 30 anh/memo, moi anh toi da 15MB
// (kiem tra ngay khi chon file + bao ro ten file vuot).
const MEMO_MAX_IMAGES = 30
const MEMO_MAX_IMAGE_BYTES = 15 * 1024 * 1024

// Nen 1 anh ngay tren trinh duyet truoc khi tai len: ve canvas be rong
// toi da 1200px (giu ti le; anh nho hon thi giu nguyen kich thuoc),
// lot nen trang (anh PNG trong suot khong thanh nen den), xuat JPEG
// quality 0.8. Tra Blob JPEG hoac null khi khong doc/ve duoc anh.
function compressMemoImage(file) {
  return new Promise((resolve) => {
    let url = ''
    try { url = URL.createObjectURL(file) } catch { resolve(null); return }
    const img = new Image()
    img.onload = () => {
      try {
        const nw = img.naturalWidth || 0
        const nh = img.naturalHeight || 0
        if (!nw || !nh) { URL.revokeObjectURL(url); resolve(null); return }
        const scale = Math.min(1, 1200 / nw)
        const w = Math.max(1, Math.round(nw * scale))
        const h = Math.max(1, Math.round(nh * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        canvas.toBlob((b) => resolve(b || null), 'image/jpeg', 0.8)
      } catch { URL.revokeObjectURL(url); resolve(null) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
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
  // Kieu nguon dang memo: 'pdf' (file PDF goc) | 'images' (nhieu anh trang)
  const [sourceType, setSourceType] = useState('pdf')
  const [imageFiles, setImageFiles] = useState([])
  const [busy, setBusy] = useState('')
  const [formErr, setFormErr] = useState('')
  const [notice, setNotice] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  // Trang thai tu tao anh bia trong man hinh chi tiet (chi Admin kich hoat)
  const [coverState, setCoverState] = useState('')
  const coverTriedRef = useRef(new Set())

  const reload = useCallback(async () => {
    setLoading(true)
    const res = await fetchMemos()
    setMemos(Array.isArray(res.memos) ? res.memos : [])
    setLoadErr(res.error || '')
    setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])

  const visible = useMemo(() => sortMemos(filterMemos(memos, { q, audience })), [memos, q, audience])

  const toggleAudience = (code) => {
    setForm((f) => ({
      ...f,
      audience: f.audience.includes(code) ? f.audience.filter((c) => c !== code) : [...f.audience, code],
    }))
  }

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

  const handlePickImages = (e) => {
    const files = Array.from(e.target.files || [])
    setFormErr('')
    if (files.length > MEMO_MAX_IMAGES) {
      setImageFiles([])
      setFormErr(`Chọn tối đa ${MEMO_MAX_IMAGES} ảnh cho 1 memo (đang chọn ${files.length} ảnh).`)
      return
    }
    const tooBig = files.find((f) => f.size > MEMO_MAX_IMAGE_BYTES)
    if (tooBig) {
      setImageFiles([])
      setFormErr(`Ảnh “${tooBig.name}” lớn hơn 15MB — hãy giảm dung lượng ảnh rồi chọn lại.`)
      return
    }
    // Thu tu trang = dung thu tu trong danh sach file da chon (FileList)
    setImageFiles(files)
    if (files.length) {
      setForm((prev) => (prev.title.trim()
        ? prev
        : { ...prev, title: files[0].name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() }))
    }
  }

  // Dong form + reset sau khi dang thanh cong (ca 2 kieu nguon dung chung)
  const finishSubmit = async (text) => {
    setBusy('')
    setShowForm(false)
    setForm(emptyForm())
    setPdfFile(null)
    setImageFiles([])
    setSourceType('pdf')
    setNotice({ type: 'success', text })
    await reload()
  }

  // Dang memo kieu NHIEU ANH: nen + tai tung anh theo thu tu trang.
  // 1 anh loi (khong nen duoc / tai len loi) -> DUNG toan bo, don cac
  // file da lo tai (cleanupMemoFiles), KHONG tao doc — tranh memo thieu
  // trang am tham. Doc chi tao khi du anh da len het.
  const submitImages = async (memoId, baseDoc) => {
    const n = imageFiles.length
    const urls = []
    const paths = []
    for (let i = 0; i < n; i += 1) {
      const f = imageFiles[i]
      setBusy(`Đang tải ảnh ${i + 1}/${n} (${f.name})…`)
      const blob = await compressMemoImage(f)
      if (!blob) {
        await cleanupMemoFiles(paths)
        setBusy('')
        setFormErr(`Không đọc/nén được ảnh số ${i + 1} (“${f.name}”) — đã huỷ đăng và chưa tạo memo. Hãy thử lại với file ảnh khác.`)
        return
      }
      const up = await uploadMemoPageImage(memoId, i + 1, blob)
      if (!up.ok) {
        await cleanupMemoFiles(paths)
        setBusy('')
        setFormErr(`Tải ảnh số ${i + 1} (“${f.name}”) lên không thành công — đã huỷ đăng và chưa tạo memo. ${up.error || ''}`.trim())
        return
      }
      urls.push(up.url)
      paths.push(up.path)
    }
    const created = await createMemoDoc({
      ...baseDoc,
      sourceType: 'images',
      fileName: imageFiles[0].name,
      pageCount: n,
      pages: urls,
      coverUrl: urls[0],
      pdfUrl: '',
      pdfPath: '',
      pagePaths: paths,
    })
    if (!created.ok) {
      await cleanupMemoFiles(paths)
      setBusy('')
      setFormErr(created.error || 'Lưu thông tin memo không thành công.')
      return
    }
    await finishSubmit(`✓ Đã đăng memo “${baseDoc.title}” với ${n} ảnh trang.`)
  }

  const handleSubmit = async () => {
    setFormErr('')
    setNotice(null)
    if (sourceType === 'images') {
      if (!imageFiles.length) { setFormErr('Chưa chọn ảnh nào cho memo.'); return }
      if (imageFiles.length > MEMO_MAX_IMAGES) { setFormErr(`Chọn tối đa ${MEMO_MAX_IMAGES} ảnh cho 1 memo.`); return }
    } else {
      if (!pdfFile) { setFormErr('Chưa chọn file PDF.'); return }
      if (pdfFile.size > 25 * 1024 * 1024) { setFormErr('File PDF lớn hơn 25MB — hãy nén file rồi đăng lại.'); return }
    }
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
    if (sourceType === 'images') { await submitImages(memoId, baseDoc); return }
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
    // Tao anh bia tu TRANG 1 cua chinh File PDF vua dang (thao tac PHU:
    // loi thi memo van dang thanh cong, chi kem ghi chu chua co bia).
    setBusy('Đang tạo ảnh bìa từ trang 1 của PDF…')
    let coverOk = false
    try {
      const coverBlob = await renderPdfFirstPageToJpegBlob(pdfFile)
      if (coverBlob) {
        const upCover = await uploadMemoCover(memoId, coverBlob)
        if (upCover.ok) {
          const savedCover = await setMemoCoverUrl(memoId, upCover.coverUrl)
          coverOk = !!savedCover.ok
        }
      }
    } catch (e) { console.warn('[MemoThuVien] tao bia khi dang:', e) }
    await finishSubmit(coverOk
      ? `✓ Đã đăng memo “${baseDoc.title}” kèm ảnh bìa trang 1.`
      : `✓ Đã đăng memo “${baseDoc.title}”, nhưng chưa tạo được ảnh bìa — mở memo ra xem bằng tài khoản Admin, hệ thống sẽ tự tạo lại bìa.`)
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

  // ── Tu bo sung anh bia cho memo DA DANG con thieu bia ──
  // Chi Admin mo chi tiet moi kich hoat (rules ghi memo chi Admin):
  // lay PDF goc qua Storage SDK -> render trang 1 -> tai cover.jpg ->
  // ghi coverUrl vao doc -> thu vien/chi tiet hien bia ngay. Moi memo
  // chi thu 1 lan trong phien (coverTriedRef) de tranh lap loi vo han.
  useEffect(() => {
    setCoverState('')
    if (!isSuperAdmin || !selected) return undefined
    const hasCover = !!(selected.coverUrl || (Array.isArray(selected.pages) && selected.pages[0]))
    if (hasCover || !selected.pdfUrl || coverTriedRef.current.has(selected.id)) return undefined
    coverTriedRef.current.add(selected.id)
    let alive = true
    setCoverState('making')
    ;(async () => {
      try {
        const pdfBlob = await fetchMemoPdfBlob(selected.id)
        const coverBlob = pdfBlob ? await renderPdfFirstPageToJpegBlob(pdfBlob) : null
        if (!coverBlob) { if (alive) setCoverState('error'); return }
        const up = await uploadMemoCover(selected.id, coverBlob)
        if (!up.ok) { if (alive) setCoverState('error'); return }
        const saved = await setMemoCoverUrl(selected.id, up.coverUrl)
        if (!saved.ok) { if (alive) setCoverState('error'); return }
        if (!alive) return
        setMemos((prev) => prev.map((m) => (m.id === selected.id ? { ...m, coverUrl: up.coverUrl } : m)))
        setSelected((cur) => (cur && cur.id === selected.id ? { ...cur, coverUrl: up.coverUrl } : cur))
        setCoverState('done')
      } catch (e) {
        console.warn('[MemoThuVien] tu tao bia cho memo cu:', e)
        if (alive) setCoverState('error')
      }
    })()
    return () => { alive = false }
  }, [selected, isSuperAdmin])

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
            <button type="button" className="btn-mini" onClick={() => setSelected(null)}>✕ Đóng</button>
          </div>
        </div>

        {coverState === 'making' ? <p className="muted" style={{ margin: '0 0 8px' }}>🖼 Đang tự tạo ảnh bìa từ trang 1 của memo này…</p> : null}
        {coverState === 'done' ? <p className="muted" style={{ margin: '0 0 8px' }}>✓ Đã tạo ảnh bìa cho memo này — thẻ memo ngoài thư viện sẽ hiện trang 1 làm bìa.</p> : null}
        {coverState === 'error' ? <p className="muted" style={{ margin: '0 0 8px' }}>Chưa tạo được ảnh bìa tự động cho memo này — vẫn xem PDF bình thường ở khung bên cạnh.</p> : null}

        <div className="memo-detail-grid">
          <aside className="memo-summary card">
            <button type="button" className="memo-summary-head" onClick={() => setSummaryOpen((o) => !o)}>
              <span>📌 Tóm tắt &amp; điểm cần lưu ý</span>
              <span className="memo-caret">{summaryOpen ? '▾' : '▸'}</span>
            </button>
            {summaryOpen && (
              <div className="memo-summary-body">
                {(selected.coverUrl || (Array.isArray(selected.pages) && selected.pages[0]))
                  ? <img className="memo-detail-cover" src={selected.coverUrl || selected.pages[0]} alt={selected.title || 'Memo'} loading="lazy" />
                  : null}
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
                  <p className="muted">Memo này chưa có tóm tắt — xem nội dung đầy đủ trong khung PDF bên cạnh.</p>
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
        <button type="button" className="btn-primary" style={{ marginBottom: 12 }} onClick={() => { setFormErr(''); setSourceType('pdf'); setPdfFile(null); setImageFiles([]); setShowForm(true) }}>
          ＋ Đăng memo
        </button>
      )}

      {showForm && isSuperAdmin && (
        <div className="card memo-form">
          <h2>＋ Đăng memo mới</h2>
          <div className="field">
            <label>Kiểu đăng</label>
            <div className="chips-row" style={{ marginTop: 2 }}>
              <button type="button" className={`fchip ${sourceType === 'pdf' ? 'active' : ''}`} onClick={() => setSourceType('pdf')}>📄 File PDF</button>
              <button type="button" className={`fchip ${sourceType === 'images' ? 'active' : ''}`} onClick={() => setSourceType('images')}>🖼 Nhiều ảnh</button>
            </div>
          </div>
          {sourceType === 'pdf' ? (
            <div className="field">
              <label>File PDF (tối đa 25MB) — xem trực tiếp trong app, có nút tải về</label>
              <input type="file" accept="application/pdf,.pdf" onChange={handlePickFile} />
              {pdfFile ? <div className="muted" style={{ marginTop: 4 }}>{pdfFile.name} · {(pdfFile.size / 1024 / 1024).toFixed(2)}MB</div> : null}
            </div>
          ) : (
            <div className="field">
              <label>Ảnh các trang memo — chọn nhiều ảnh cùng lúc (tối đa {MEMO_MAX_IMAGES} ảnh, mỗi ảnh ≤ 15MB). Thứ tự trang đúng theo thứ tự ảnh trong danh sách dưới đây; ảnh được nén nhẹ (≤1200px, JPEG) trước khi tải lên.</label>
              <input type="file" accept="image/*" multiple onChange={handlePickImages} />
              {imageFiles.length > 0 ? (
                <ol className="memo-img-list">
                  {imageFiles.map((f, i) => (
                    <li key={`${f.name}-${f.size}-${i}`}>Trang {i + 1}: {f.name} · {(f.size / 1024 / 1024).toFixed(2)}MB</li>
                  ))}
                </ol>
              ) : null}
            </div>
          )}
          <div className="field">
            <label>Tiêu đề</label>
            <input value={form.title} placeholder="VD: Memo 00211/AD/2026 - Thi đua ngắn hạn tháng 11"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="field">
            <label>Ghi chú ngắn (hiện dưới tiêu đề ở thẻ)</label>
            <input value={form.note} placeholder="VD: Thưởng tiền mặt theo Tổng IP tháng 11"
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="field">
            <label>Đối tượng</label>
            <div className="memo-checks">
              {AUDIENCES.map((a) => (
                <label className="memo-check" key={a.code}>
                  <input type="checkbox" checked={form.audience.includes(a.code)} onChange={() => toggleAudience(a.code)} />
                  {a.label}
                </label>
              ))}
            </div>
          </div>
          <label className="memo-check" style={{ marginBottom: 12 }}>
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} />
            📌 Ghim mục này lên đầu thư viện
          </label>
          <div className="field">
            <label>Tóm tắt (mỗi dòng 1 ý)</label>
            <textarea rows={5} value={form.summary} placeholder={'VD:\nThi đua tháng 11/2026: thưởng theo Tổng IP hồ sơ hợp lệ nộp trong tháng.\nTừ 18tr IP: 1,5tr · Từ 25tr: 2,5tr · Từ 50tr: 5tr · Từ 100tr: 8% IP.'}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
          </div>
          <div className="field">
            <label>Lưu ý quan trọng (mỗi dòng 1 ý, không bắt buộc)</label>
            <textarea rows={3} value={form.warnings} placeholder={'VD:\nHồ sơ phải nộp 01/11–30/11/2026 và phát hành đến hết 30/11/2026.\nTổng thưởng tối đa 100tr/TVV.'}
              onChange={(e) => setForm((f) => ({ ...f, warnings: e.target.value }))} />
          </div>
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
          <p>{isSuperAdmin ? 'Bấm “＋ Đăng memo” ở trên để đăng tài liệu đầu tiên cho Quận 7 (đăng bằng file PDF hoặc nhiều ảnh trang).' : 'Admin chính chưa đăng memo nào — quay lại sau nhé.'}</p>
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
