import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, CalendarClock, LoaderCircle, RotateCcw, Trash2, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { deleteForever, emptyTrash, restoreFromTrash, trashExpiresAt, type TrashTable } from '../lib/trash'

type TrashItem = {
  id: string
  table: TrashTable
  title: string
  subtitle: string
  deletedAt: string
  kind: 'property' | 'client' | 'task' | 'event' | 'deal' | 'activity'
}

const TrashPage = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    if (navigator.onLine) {
      try { await supabase.rpc('purge_lumicrm_trash') } catch { /* The scheduled purge remains a fallback. */ }
    }
    const [properties, clients, tasks, events, deals, activities] = await Promise.all([
      supabase.from('properties').select('id,address,status,deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
      supabase.from('clients').select('id,first_name,last_name,middle_name,phone,deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
      supabase.from('tasks').select('id,title,due_date,deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
      supabase.from('events').select('id,title,type,event_date,deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
      supabase.from('deals').select('id,price,status,deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
      supabase.from('crm_activities').select('id,title,type,occurred_at,deleted_at').eq('user_id', user.id).not('deleted_at', 'is', null),
    ])
    const firstError = [properties.error, clients.error, tasks.error, events.error, deals.error, activities.error].find(Boolean)
    if (firstError) setError('Не удалось загрузить корзину. Изменения на этом устройстве не потеряны.')
    const next: TrashItem[] = [
      ...(properties.data ?? []).map(row => ({ id: row.id, table: 'properties' as const, title: row.address, subtitle: `Объект · ${row.status}`, deletedAt: row.deleted_at, kind: 'property' as const })),
      ...(clients.data ?? []).map(row => ({ id: row.id, table: 'clients' as const, title: [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ') || 'Клиент без имени', subtitle: row.phone || 'Телефон не указан', deletedAt: row.deleted_at, kind: 'client' as const })),
      ...(tasks.data ?? []).map(row => ({ id: row.id, table: 'tasks' as const, title: row.title, subtitle: row.due_date ? `Задача до ${new Date(`${row.due_date}T00:00:00`).toLocaleDateString('ru-RU')}` : 'Задача без срока', deletedAt: row.deleted_at, kind: 'task' as const })),
      ...(events.data ?? []).map(row => ({ id: row.id, table: 'events' as const, title: row.title, subtitle: `${row.type === 'call' ? 'Звонок' : 'Встреча'} · ${row.event_date || 'без даты'}`, deletedAt: row.deleted_at, kind: 'event' as const })),
      ...(deals.data ?? []).map(row => ({ id: row.id, table: 'deals' as const, title: `Сделка ${Number(row.price || 0).toLocaleString('ru-RU')} ₽`, subtitle: row.status, deletedAt: row.deleted_at, kind: 'deal' as const })),
      ...(activities.data ?? []).map(row => ({ id: row.id, table: 'crm_activities' as const, title: row.title, subtitle: `${row.type} · ${row.occurred_at ? new Date(row.occurred_at).toLocaleDateString('ru-RU') : 'без даты'}`, deletedAt: row.deleted_at, kind: 'activity' as const })),
    ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
    setItems(next)
    setLoading(false)
  }, [user])

  useEffect(() => { void load() }, [load])

  const daysLeft = useMemo(() => new Map(items.map(item => [`${item.table}:${item.id}`, Math.max(0, Math.ceil((trashExpiresAt(item.deletedAt).getTime() - Date.now()) / 86_400_000))])), [items])

  const restore = async (item: TrashItem) => {
    if (!user) return
    try {
      await restoreFromTrash(item.table, item.id, user.id)
      setItems(current => current.filter(entry => entry.id !== item.id))
    } catch { setError('Не удалось восстановить запись. Повторите после синхронизации.') }
  }

  const remove = async (item: TrashItem) => {
    if (!user) return
    try {
      await deleteForever(item.table, item.id, user.id)
      setItems(current => current.filter(entry => entry.id !== item.id))
    } catch { setError('Не удалось удалить запись окончательно.') }
  }

  const clear = async () => {
    if (!user) return
    try {
      await emptyTrash(user.id)
      setItems([])
    } catch { setError('Не удалось очистить корзину полностью.') }
  }

  return <div className="space-y-6 pb-10">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="lumi-text text-3xl font-bold">Корзина</h1><p className="lumi-muted mt-2">Записи хранятся 5 дней, затем удаляются автоматически.</p></div>
      {items.length > 0 && <button type="button" onClick={() => void clear()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 py-3 font-semibold text-red-400"><Trash2 className="h-4 w-4" />Очистить корзину</button>}
    </div>
    {error && <div className="rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}
    {loading ? <div className="lumi-muted flex justify-center py-20"><LoaderCircle className="h-9 w-9 animate-spin" /></div> : items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(item => {
      const Icon = item.kind === 'property' ? Building2 : item.kind === 'client' ? UserRound : CalendarClock
      return <article key={`${item.table}:${item.id}`} className="lumi-panel min-w-0 overflow-hidden rounded-2xl border p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3"><div className="lumi-control shrink-0 rounded-xl p-3"><Icon className="lumi-accent-text h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="lumi-text break-words font-semibold">{item.title}</h2><p className="lumi-muted mt-1 break-words text-sm">{item.subtitle}</p><p className="mt-2 text-xs text-amber-400">Осталось дней: {daysLeft.get(`${item.table}:${item.id}`)}</p></div></div>
        <div className="mt-5 grid min-w-0 grid-cols-2 gap-2"><button type="button" onClick={() => void restore(item)} className="lumi-accent-soft inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold sm:gap-2 sm:px-3 sm:text-sm"><RotateCcw className="h-4 w-4 shrink-0" /><span className="truncate">Вернуть</span></button><button type="button" onClick={() => void remove(item)} className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-2 py-2.5 text-xs font-semibold text-red-400 sm:gap-2 sm:px-3 sm:text-sm"><Trash2 className="h-4 w-4 shrink-0" /><span className="truncate">Удалить</span></button></div>
      </article>
    })}</div> : <div className="lumi-panel-muted lumi-muted flex flex-col items-center rounded-2xl border border-dashed py-20"><Trash2 className="mb-4 h-14 w-14" /><p className="lumi-text font-semibold">Корзина пуста</p></div>}
  </div>
}

export default TrashPage
