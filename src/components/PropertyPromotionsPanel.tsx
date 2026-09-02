import { useState } from 'react'
import { ExternalLink, Megaphone, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePropertyPromotions } from '../hooks/usePropertyPromotions'
import { promotionActionLabel, type PropertyPromotionInput } from '../lib/propertyPromotionMapping'
import Modal from './Modal'

const initialForm = (): PropertyPromotionInput => ({
  channel: 'Авито', action: 'published', date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5),
  cost: null, url: '', result: '', notes: '',
})

const PropertyPromotionsPanel = ({ propertyId }: { propertyId: string }) => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const { data = [], isPending, error: queryError, savePromotion, removePromotion, saving } = usePropertyPromotions(user?.id, propertyId)
  const update = <K extends keyof PropertyPromotionInput>(key: K, value: PropertyPromotionInput[K]) => setForm(current => ({ ...current, [key]: value }))
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    try { await savePromotion(form); setForm(initialForm()); setOpen(false) }
    catch { setError('Не удалось сохранить запись продвижения') }
  }
  return <div className="space-y-5">
    <section className="lumi-panel flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="lumi-text text-xl font-semibold">Журнал продвижения</h2><p className="lumi-muted mt-1 text-sm">Площадки, поднятия, расходы и результаты рекламы объекта.</p></div><button type="button" onClick={() => setOpen(true)} className="lumi-gradient-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold"><Plus className="h-5 w-5" />Добавить запись</button></section>
    {(error || queryError) && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">{error || 'Не удалось загрузить журнал продвижения'}</p>}
    {isPending ? <div className="lumi-muted py-14 text-center">Загружаем журнал…</div> : data.length === 0 ? <div className="lumi-panel lumi-muted rounded-2xl border py-14 text-center"><Megaphone className="mx-auto mb-3 h-11 w-11" /><p className="lumi-text font-semibold">Продвижение ещё не зафиксировано</p></div> : <div className="grid gap-4 lg:grid-cols-2">{data.map(item => <article key={item.id} className="lumi-panel rounded-2xl border p-5"><div className="flex items-start gap-3"><div className="lumi-accent-soft rounded-xl p-2.5"><Megaphone className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="lumi-text font-semibold">{item.channel || 'Канал не указан'}</h3><p className="lumi-muted mt-1 text-sm">{promotionActionLabel(item.action)} · {item.occurredAt ? new Date(item.occurredAt).toLocaleString('ru-RU') : 'Дата не указана'}</p></div><button type="button" onClick={() => void removePromotion(item.id)} className="rounded-lg bg-red-500/10 p-2 text-red-500" aria-label="Удалить запись"><Trash2 className="h-4 w-4" /></button></div><div className="lumi-border mt-4 space-y-2 border-t pt-4 text-sm">{item.cost != null && <p className="lumi-text">Расход: {item.cost.toLocaleString('ru-RU')} ₽</p>}{item.result && <p className="lumi-text">Результат: {item.result}</p>}{item.notes && <p className="lumi-muted whitespace-pre-wrap">{item.notes}</p>}{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="lumi-accent-text inline-flex items-center gap-2 break-all"><ExternalLink className="h-4 w-4 shrink-0" />Открыть публикацию</a>}</div></article>)}</div>}
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Продвижение объекта"><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="lumi-muted-strong text-sm">Площадка *<input required value={form.channel} onChange={event => update('channel', event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label><label className="lumi-muted-strong text-sm">Действие<select value={form.action} onChange={event => update('action', event.target.value as PropertyPromotionInput['action'])} className="lumi-control mt-2 w-full rounded-xl px-4 py-3">{(['published','updated','boosted','paused','removed'] as const).map(action => <option key={action} value={action}>{promotionActionLabel(action)}</option>)}</select></label><label className="lumi-muted-strong text-sm">Дата<input type="date" required value={form.date} onChange={event => update('date', event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label><label className="lumi-muted-strong text-sm">Время<input type="time" value={form.time} onChange={event => update('time', event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label><label className="lumi-muted-strong text-sm">Расход, ₽<input type="number" min="0" value={form.cost ?? ''} onChange={event => update('cost', event.target.value === '' ? null : Number(event.target.value))} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label><label className="lumi-muted-strong text-sm">Ссылка<input type="url" value={form.url} onChange={event => update('url', event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label></div><label className="lumi-muted-strong block text-sm">Результат<input value={form.result} onChange={event => update('result', event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" placeholder="Просмотры, звонки, заявки" /></label><label className="lumi-muted-strong block text-sm">Комментарий<textarea value={form.notes} onChange={event => update('notes', event.target.value)} rows={3} className="lumi-control mt-2 w-full resize-none rounded-xl px-4 py-3" /></label><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} className="lumi-control rounded-xl px-5 py-3">Отмена</button><button disabled={saving} className="lumi-gradient-button rounded-xl px-6 py-3 font-semibold disabled:opacity-50">{saving ? 'Сохраняем…' : 'Сохранить'}</button></div></form></Modal>
  </div>
}

export default PropertyPromotionsPanel
