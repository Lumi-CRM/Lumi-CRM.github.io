import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, CloudOff, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { flushOfflineQueue, getOfflineQueueCount, type OfflineStatus } from '../lib/offlineTransport'
import { flushOfflineFiles, getOfflineFileQueueCount, prefetchCrmFiles } from '../lib/offlineFiles'
import { supabase, warmOfflineWorkspace } from '../lib/supabase'

const getDeviceId = () => {
  const key = 'lumicrm-device-id'
  const current = localStorage.getItem(key)
  if (current) return current
  const created = crypto.randomUUID()
  localStorage.setItem(key, created)
  return created
}

const OfflineSyncStatus = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState<OfflineStatus>({ online: navigator.onLine, pending: 0, syncing: false })
  const broadcastRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    const [dataPending, filePending] = await Promise.all([
      getOfflineQueueCount(user.id),
      getOfflineFileQueueCount(user.id),
    ])
    const pending = dataPending + filePending
    setStatus(previous => ({ ...previous, online: navigator.onLine, pending }))
  }, [user])

  useEffect(() => {
    if (!user) return
    void refresh()
    if (navigator.onLine) {
      void (async () => {
        await flushOfflineQueue()
        await flushOfflineFiles(user.id)
        await warmOfflineWorkspace(user.id)
        void prefetchCrmFiles(user.id)
        await refresh()
      })()
    }

    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<OfflineStatus>).detail
      setStatus(previous => ({ ...previous, online: detail.online, syncing: detail.syncing, error: detail.error }))
      void refresh()
    }
    const handleOnline = () => {
      setStatus(previous => ({ ...previous, online: true }))
      void (async () => {
        await flushOfflineQueue()
        await flushOfflineFiles(user.id)
        await warmOfflineWorkspace(user.id, true)
        void prefetchCrmFiles(user.id)
        await refresh()
      })()
    }
    const handleOffline = () => setStatus(previous => ({ ...previous, online: false, syncing: false }))
    window.addEventListener('lumicrm:offline-status', handleStatus)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('lumicrm:offline-files-changed', refresh)
    const syncTimer = window.setInterval(() => {
      if (!navigator.onLine) return
      void flushOfflineQueue().then(() => flushOfflineFiles(user.id)).then(() => refresh())
    }, 30_000)

    const deviceId = getDeviceId()
    const channel = supabase
      .channel(`lumicrm-sync:${user.id}`)
      .on('broadcast', { event: 'data-synced' }, ({ payload }) => {
        if (payload?.deviceId === deviceId) return
        window.dispatchEvent(new CustomEvent('lumicrm:remote-data-changed'))
      })
      .subscribe()
    broadcastRef.current = channel

    const announceSync = (event: Event) => {
      const detail = (event as CustomEvent<{ synced?: number }>).detail
      void channel.send({
        type: 'broadcast',
        event: 'data-synced',
        payload: { deviceId, synced: detail?.synced ?? 0, at: Date.now() },
      })
    }
    window.addEventListener('lumicrm:data-synced', announceSync)

    return () => {
      window.removeEventListener('lumicrm:offline-status', handleStatus)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('lumicrm:offline-files-changed', refresh)
      window.removeEventListener('lumicrm:data-synced', announceSync)
      window.clearInterval(syncTimer)
      void supabase.removeChannel(channel)
      broadcastRef.current = null
    }
  }, [refresh, user])

  const retry = async () => {
    setStatus(previous => ({ ...previous, syncing: true }))
    await flushOfflineQueue()
    if (user) await flushOfflineFiles(user.id)
    await refresh()
  }

  if (!status.online) {
    return (
      <button type="button" onClick={() => void retry()} className="lumi-control inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs" title="Изменения сохраняются на этом устройстве">
        <CloudOff className="h-4 w-4 text-amber-400" />
        <span className="hidden lg:inline">Без сети{status.pending ? ` · ${status.pending}` : ''}</span>
      </button>
    )
  }

  if (status.syncing || status.pending > 0) {
    return (
      <button type="button" onClick={() => void retry()} className="lumi-control inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs" title="Синхронизировать сейчас">
        <RefreshCw className={`h-4 w-4 text-sky-400 ${status.syncing ? 'animate-spin' : ''}`} />
        <span className="hidden lg:inline">{status.syncing ? 'Синхронизация' : `В очереди: ${status.pending}`}</span>
      </button>
    )
  }

  return (
    <div className="lumi-control hidden items-center gap-2 rounded-xl px-3 py-2 text-xs lg:inline-flex" title="Данные синхронизированы">
      <Check className="h-4 w-4 text-emerald-400" />
      В облаке
    </div>
  )
}

export default OfflineSyncStatus
