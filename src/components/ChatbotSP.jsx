// ─────────────────────────────────────────────────────────────
// ChatbotSP — 🤖 tab hoi dap san pham Prudential trong dashboard.
// Nhung ban PWA cua chatbot (repo rieng Chatbot-Prudential, chay tai
// chatbot-prudential.vercel.app) bang iframe: noi dung chatbot cap
// nhat doc lap qua repo cua no, dashboard khong phai deploy lai khi
// bot doi du lieu/cau tra loi.
// Iframe chi nap o lan dau TVV mo tab (started) va duoc GIU NGUYEN
// khi chuyen tab qua lai (App an/hien bang CSS) de khong mat cuoc
// hoi thoai dang do.
import { useEffect, useState } from 'react'

const CHATBOT_URL = 'https://chatbot-prudential.vercel.app/'

export default function ChatbotSP({ active }) {
  const [started, setStarted] = useState(false)
  useEffect(() => { if (active) setStarted(true) }, [active])
  return (
    <div className="chatbot-wrap">
      <div className="chatbot-bar">
        <span>🤖 Hỏi đáp sản phẩm Prudential: quyền lợi, điều khoản, phí, PRURewards</span>
        <a href={CHATBOT_URL} target="_blank" rel="noreferrer">Mở toàn màn hình ↗</a>
      </div>
      {started ? (
        <iframe className="chatbot-frame" src={CHATBOT_URL} title="Chatbot sản phẩm Prudential" />
      ) : (
        <div className="chatbot-idle">Đang chuẩn bị chatbot…</div>
      )}
    </div>
  )
}
