import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

const lockMobileOrientation = async () => {
  if (!window.matchMedia('(display-mode: standalone)').matches) return
  const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> }
  try {
    await orientation.lock?.('portrait-primary')
  } catch {
    // The manifest remains the portable orientation lock for installed PWAs.
  }
}

window.addEventListener('load', () => void lockMobileOrientation())
