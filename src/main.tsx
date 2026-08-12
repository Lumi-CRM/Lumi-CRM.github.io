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
  const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> }
  const isHandheld = window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900
  if (!isHandheld || !orientation.lock) return
  try {
    await orientation.lock('portrait')
  } catch {
    // iOS and some browsers ignore the Orientation Lock API. PortraitGuard
    // prevents the CRM itself from becoming an unusable horizontal layout.
  }
}

for (const eventName of ['load', 'appinstalled', 'orientationchange', 'fullscreenchange'] as const) {
  window.addEventListener(eventName, () => void lockMobileOrientation())
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void lockMobileOrientation()
})
