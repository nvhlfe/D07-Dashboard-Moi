import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { LOGO_D07 } from './lib/logoData.js'

// Favicon = logo D07 nhúng sẵn trong app (không phụ thuộc file ngoài)
const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = LOGO_D07
document.head.appendChild(favicon)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
