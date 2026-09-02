import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { installNativeNotificationHandlers } from './lib/nativeReminders'
import { installCrmQueryInvalidationBridge, queryClient } from './lib/queryClient'
import { installNativeLifecycleSync } from './lib/nativeLifecycle'

installCrmQueryInvalidationBridge()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD && /^https?:$/.test(window.location.protocol)) {
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

void installNativeNotificationHandlers()
void installNativeLifecycleSync()
