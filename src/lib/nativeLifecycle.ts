import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { flushOfflineFiles } from './offlineFiles'
import { flushOfflineQueue } from './offlineTransport'
import { syncNativeReminders } from './nativeReminders'
import { supabase, warmOfflineWorkspace } from './supabase'

let installed = false

const synchronize = async () => {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return
  await Promise.allSettled([
    flushOfflineQueue(),
    flushOfflineFiles(userId),
    warmOfflineWorkspace(userId, true),
    syncNativeReminders(userId),
  ])
  window.dispatchEvent(new CustomEvent('lumicrm:workspace-refreshed'))
}

export const installNativeLifecycleSync = async () => {
  if (installed || !Capacitor.isNativePlatform()) return
  installed = true
  await App.addListener('appStateChange', state => {
    if (state.isActive) void synchronize()
  })
  await App.addListener('resume', () => void synchronize())
  void synchronize()
}
