import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellRing, CheckCheck, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { registerPushSubscription } from '../lib/pushNotifications'
import AnchoredPopover from './AnchoredPopover'

interface NotificationItem {
  id: string
  title: string
  body?: string
  link?: string
  read_at?: string
  created_at: string
}

const NotificationCenter = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase.from('notifications').select('id,title,body,link,read_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
    if (!error) setItems((data ?? []) as NotificationItem[])
    setLoading(false)
  }, [user])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!user) return
    if ('Notification' in window && Notification.permission === 'granted') {
      void registerPushSubscription(user.id).catch(() => undefined)
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        const notification = payload.new as NotificationItem
        setItems(current => [notification, ...current.filter(item => item.id !== notification.id)].slice(0, 30))
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    if (open) void load()
  }, [load, open])

  const openItem = async (item: NotificationItem) => {
    if (!user) return
    if (!item.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', user.id)
      setItems(current => current.map(value => value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value))
    }
    setOpen(false)
    if (item.link?.startsWith('/')) navigate(item.link)
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
    setItems(current => current.map(item => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })))
  }

  const unread = items.filter(item => !item.read_at).length

  return <div className="relative">
    <button ref={containerRef} type="button" aria-label="Уведомления" aria-expanded={open} onClick={() => setOpen(value => !value)} className="lumi-nav-item relative rounded-xl p-2.5 transition">
      <Bell className="h-5 w-5" />
      {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.62rem] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
    </button>
    <AnchoredPopover open={open} anchorRef={containerRef} onClose={() => setOpen(false)} width={368} ariaLabel="Центр уведомлений" className="flex flex-col">
      <div className="lumi-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"><div className="min-w-0"><p className="lumi-text font-semibold">Уведомления</p><p className="lumi-muted truncate text-xs">Последние события вашего офиса</p></div>{unread > 0 && <button type="button" onClick={() => void markAllRead()} title="Прочитать все" className="lumi-nav-item shrink-0 rounded-lg p-2"><CheckCheck className="h-4 w-4" /></button>}</div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2">
        {loading ? <div className="lumi-muted flex justify-center py-10"><LoaderCircle className="h-6 w-6 animate-spin" /></div> : items.length ? items.map(item => <button type="button" key={item.id} onClick={() => void openItem(item)} className={`w-full min-w-0 rounded-xl p-3 text-left transition hover:bg-[var(--lumi-control)] ${item.read_at ? '' : 'lumi-accent-soft'}`}><div className="flex min-w-0 gap-3"><BellRing className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0"><p className="lumi-text break-words text-sm font-semibold">{item.title}</p>{item.body && <p className="lumi-muted mt-1 break-words text-xs leading-5">{item.body}</p>}<p className="lumi-muted mt-2 text-[0.68rem]">{new Date(item.created_at).toLocaleString('ru-RU')}</p></div></div></button>) : <div className="lumi-muted py-10 text-center text-sm">Новых уведомлений нет</div>}
      </div>
    </AnchoredPopover>
  </div>
}

export default NotificationCenter
