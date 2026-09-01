import { useMemo, useState } from 'react'
import { Building2, CalendarClock, LoaderCircle, RotateCcw, Trash2, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTrashRecords } from '../hooks/useRecordCollections'
import type { TrashItem } from '../lib/recordCollectionMapping'
import { trashExpiresAt } from '../lib/trash'

const TrashPage = () => {
  const { user } = useAuth()
  const trashQuery = useTrashRecords(user?.id)
  const items = trashQuery.data || []
  const [actionError, setActionError] = useState('')

  const daysLeft = useMemo(() => new Map(items.map(item => [`${item.table}:${item.id}`, Math.max(0, Math.ceil((trashExpiresAt(item.deletedAt).getTime() - Date.now()) / 86_400_000))])), [items])

  const restore = async (item: TrashItem) => {
    setActionError('')
    try {
      await trashQuery.restoreItem(item)
    } catch { setActionError('Не удалось восстановить запись. Повторите после синхронизации.') }
  }

  const remove = async (item: TrashItem) => {
    setActionError('')
    try {
      await trashQuery.removeItem(item)
    } catch { setActionError('Не удалось удалить запись окончательно.') }
  }

  const clear = async () => {
    setActionError('')
    try {
      await trashQuery.clearTrash()
    } catch { setActionError('Не удалось очистить корзину полностью.') }
  }

  return <div className="space-y-6 pb-10">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="lumi-text text-3xl font-bold">Корзина</h1><p className="lumi-muted mt-2">Записи хранятся 5 дней, затем удаляются автоматически.</p></div>
      {items.length > 0 && <button type="button" disabled={trashQuery.mutationPending} onClick={() => void clear()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 py-3 font-semibold text-red-400 disabled:opacity-60"><Trash2 className="h-4 w-4" />Очистить корзину</button>}
    </div>
    {(actionError || trashQuery.error) && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-3 text-sm text-red-300"><span>{actionError || 'Не удалось загрузить корзину. Изменения на этом устройстве не потеряны.'}</span>{trashQuery.error && <button type="button" onClick={() => void trashQuery.refetch()} className="font-semibold underline">Повторить</button>}</div>}
    {trashQuery.isLoading ? <div className="lumi-muted flex justify-center py-20"><LoaderCircle className="h-9 w-9 animate-spin" /></div> : items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(item => {
      const Icon = item.kind === 'property' ? Building2 : item.kind === 'client' ? UserRound : CalendarClock
      return <article key={`${item.table}:${item.id}`} className="lumi-panel min-w-0 overflow-hidden rounded-2xl border p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3"><div className="lumi-control shrink-0 rounded-xl p-3"><Icon className="lumi-accent-text h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="lumi-text break-words font-semibold">{item.title}</h2><p className="lumi-muted mt-1 break-words text-sm">{item.subtitle}</p><p className="mt-2 text-xs text-amber-400">Осталось дней: {daysLeft.get(`${item.table}:${item.id}`)}</p></div></div>
        <div className="mt-5 grid min-w-0 grid-cols-2 gap-2"><button type="button" disabled={trashQuery.mutationPending} onClick={() => void restore(item)} className="lumi-accent-soft inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold disabled:opacity-60 sm:gap-2 sm:px-3 sm:text-sm"><RotateCcw className="h-4 w-4 shrink-0" /><span className="truncate">Вернуть</span></button><button type="button" disabled={trashQuery.mutationPending} onClick={() => void remove(item)} className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-red-500/15 px-2 py-2.5 text-xs font-semibold text-red-400 disabled:opacity-60 sm:gap-2 sm:px-3 sm:text-sm"><Trash2 className="h-4 w-4 shrink-0" /><span className="truncate">Удалить</span></button></div>
      </article>
    })}</div> : <div className="lumi-panel-muted lumi-muted flex flex-col items-center rounded-2xl border border-dashed py-20"><Trash2 className="mb-4 h-14 w-14" /><p className="lumi-text font-semibold">Корзина пуста</p></div>}
  </div>
}

export default TrashPage
