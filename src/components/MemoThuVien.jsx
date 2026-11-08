// ─────────────────────────────────────────────────────────────
// MemoThuVien — 📌 Memo · Thi dua · Tai lieu (theo mau D03).
// Thu vien memo phan loai theo doi tuong (Tu van vien / Quan ly /
// Khach hang / Chinh sach thu nhap), tim kiem khong dau, memo ghim
// len dau. Xem chi tiet: anh tung trang PDF xep doc + panel
// "Tom tat & diem can luu y".
// Admin chinh dang memo bang PDF: app TU TACH tung trang thanh anh
// JPEG ngay tren trinh duyet (lib/pdfSplit.js, nap bang dynamic
// import) roi tai len Firebase Storage; metadata o Firestore `memos`.
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMemos, uploadMemoAssets, createMemoDoc, deleteMemoEverywhere } from '../lib/store'
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

export default function MemoThuVien({ user, isSuperAdmin, onClose }) {
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

  const handleSubmit = async () => {
    setFormErr('')
    setNotice(null)
    if (!pdfFile) { setFormErr('Chưa chọn file PDF.'); return }
    if (!form.title.trim()) { setFormErr('Chưa nhập tiêu đề memo.'); return }
    if (!form.audience.length) { setFormErr('Chọn ít nhất 1 nhóm đối tượng cho memo.'); return }
    setBusy('Đang tách trang PDF…')
    let split
    try {
      const mod = await import('../lib/pdfSplit.js')
      split = await mod.pdfToPageImages(pdfFile, (done, total) => setBusy(`Đang tách trang ${done}/${total}…`))
    } catch (err) {
      setBusy('')
      setFormErr(err?.message || 'Không tách được file PDF này.')
      return
    }
    const memoId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    setBusy('Đang tải file lên kho lưu trữ…')
    const up = await uploadMemoAssets(memoId, pdfFile, split.pageBlobs, (done, total) => setBusy(`Đang tải lên trang ${done}/${total}…`))
    if (!up.ok) { setBusy(''); setFormErr(up.error || 'Tải file lên không thành công.'); return }
    const now = new Date()
    const p2 = (n) => String(n).padStart(2, '0')
    const created = await createMemoDoc({
      id: memoId,
      title: form.title.trim(),
      note: form.note.trim(),
      summary: form.summary,
      warnings: form.warnings,
      audience: form.audience,
      pinned: !!form.pinned,
      fileName: pdfFile.name,
      pageCount: split.pageCount,
      pages: up.pages,
      pdfUrl: up.pdfUrl,
      pdfPath: up.pdfPath,
      pagePaths: up.pagePaths,
      displayDate: `${p2(now.getDate())}/${p2(now.getMonth() + 1)}`,
      createdAt: now.getTime(),
      createdBy: user?.email || '',
    })
    setBusy('')
    if (!created.ok) { setFormErr(created.error || 'Lưu thông tin memo không thành công.'); return }
    setShowForm(false)
    setForm(emptyForm())
    setPdfFile(null)
    setNotice({ type: 'success', text: `✓ Đã đăng memo “${form.title.trim()}” (${split.pageCount} trang).` })
    await reload()
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
      {Array.isArray(m.pages) && m.pages[0]
        ? <img className="memo-thumb" src={m.pages[0]} alt={m.title || 'Memo'} loading="lazy" />
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
            {selected.pdfUrl
              ? <a className="btn-mini" href={selected.pdfUrl} target="_blank" rel="noreferrer">⬇ Tải về</a>
              : null}
            <button type="button" className="btn-mini" onClick={() => setSelected(null)}>✕ Đóng</button>
          </div>
        </div>

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
                  <p className="muted">Memo này chưa có tóm tắt — xem nội dung đầy đủ ở các trang bên dưới.</p>
                )}
              </div>
            )}
          </aside>

          <div className="memo-pages">
            {Array.isArray(selected.pages) && selected.pages.length > 0
              ? selected.pages.map((url, i) => (
                <img key={i} className="memo-page" src={url} alt={`Trang ${i + 1}`} loading="lazy" />
              ))
              : <div className="card empty"><div className="e-ic">📄</div>Memo này chưa có ảnh trang — mở file PDF bằng nút ⬇ Tải về ở trên.</div>}
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
        <button type="button" className="btn-primary" style={{ marginBottom: 12 }} onClick={() => { setFormErr(''); setShowForm(true) }}>
          ＋ Đăng memo (PDF)
        </button>
      )}

      {showForm && isSuperAdmin && (
        <div className="card memo-form">
          <h2>＋ Đăng memo mới</h2>
          <div className="field">
            <label>File PDF (tối đa 25MB · 30 trang) — app tự tách từng trang thành ảnh</label>
            <input type="file" accept="application/pdf,.pdf" onChange={handlePickFile} />
            {pdfFile ? <div className="muted" style={{ marginTop: 4 }}>{pdfFile.name} · {(pdfFile.size / 1024 / 1024).toFixed(2)}MB</div> : null}
          </div>
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
          <p>{isSuperAdmin ? 'Bấm “＋ Đăng memo (PDF)” ở trên để đăng tài liệu đầu tiên cho GA.' : 'Admin chính chưa đăng memo nào — quay lại sau nhé.'}</p>
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
