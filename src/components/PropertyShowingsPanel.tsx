import { useState } from 'react'
import { CalendarClock, Loader2, MessageSquareText, Plus, Trash2, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'
import { usePropertyShowings } from '../hooks/usePropertyShowings'
import type { PropertyShowingInput } from '../lib/propertyShowingMapping'

const initialForm = (): PropertyShowingInput => ({
  visitorName: '', phone: '', source: 'Авито', date: new Date().toISOString().slice(0, 10), time: '12:00',
  outcome: 'Показ состоялся', reaction: '', interest: 'Думает', priceFeedback: '', objections: '', nextStep: '', nextContactAt: '', comments: '',
})

const PropertyShowingsPanel = ({ propertyId }: { propertyId: string }) => {
  const { user } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const { data: records = [], isPending: loading, error: queryError, saveShowing, removeShowing, saving } = usePropertyShowings(user?.id, propertyId)
  const loadError = queryError ? 'Не удалось загрузить показы' : ''

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    setError('')
    try {
      await saveShowing(form)
      setOpen(false)
      setForm(initialForm())
    } catch {
      setError('Не удалось сохранить показ')
    }
  }

  const remove = async (id: string) => {
    try {
      await removeShowing(id)
    } catch {
      setError('Не удалось удалить показ')
    }
  }

  const input = (key: keyof ReturnType<typeof initialForm>, label: string, type = 'text') => <label className="lumi-muted-strong block text-sm font-medium">{label}<input type={type} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label>

  return <div className="space-y-5">
    <section className="lumi-panel flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="lumi-text text-xl font-semibold">Показы объекта</h2><p className="lumi-muted mt-1 text-sm">История посетителей, реакции, возражений и следующих шагов.</p></div>
      <button type="button" onClick={() => setOpen(true)} className="lumi-gradient-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold"><Plus className="h-5 w-5" />Добавить показ</button>
    </section>
    {(error || loadError) && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-500">{error || loadError}</p>}
    {loading ? <div className="lumi-muted flex items-center justify-center gap-2 py-14"><Loader2 className="h-5 w-5 animate-spin" />Загружаем показы…</div> : records.length === 0 ? <div className="lumi-panel lumi-muted rounded-2xl border py-14 text-center"><CalendarClock className="mx-auto mb-3 h-11 w-11" /><p className="lumi-text font-semibold">Показов пока нет</p></div> : <div className="grid gap-4 lg:grid-cols-2">{records.map(record => {
      const meta = record.metadata
      return <article key={record.id} className="lumi-panel rounded-2xl border p-5"><div className="flex items-start gap-3"><div className="lumi-accent-soft rounded-xl p-2.5"><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="lumi-text font-semibold">{meta.visitor_name || 'Посетитель'}</h3><p className="lumi-muted mt-1 text-sm">{meta.phone || 'Телефон не указан'} · {meta.attraction_source || 'Источник не указан'}</p></div><button type="button" onClick={() => void remove(record.id)} className="rounded-lg bg-red-500/10 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div><div className="lumi-border mt-4 space-y-2 border-t pt-4 text-sm"><p className="lumi-muted">{record.occurredAt ? new Date(record.occurredAt).toLocaleString('ru-RU') : 'Дата не указана'} · {record.outcome}</p>{meta.interest && <p className="lumi-text">Интерес: {meta.interest}</p>}{meta.reaction && <p className="lumi-muted">Реакция: {meta.reaction}</p>}{meta.objections && <p className="lumi-muted">Возражения: {meta.objections}</p>}{meta.next_step && <p className="lumi-accent-text">Следующий шаг: {meta.next_step}</p>}{record.notes && <p className="lumi-muted flex gap-2"><MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" />{record.notes}</p>}</div></article>
    })}</div>}
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Новый показ объекта"><form onSubmit={save} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{input('visitorName', 'Имя посетителя')}{input('phone', 'Телефон', 'tel')}{input('source', 'Способ привлечения')}{input('date', 'Дата', 'date')}{input('time', 'Время', 'time')}{input('outcome', 'Как прошла встреча')}</div><div className="grid gap-4 sm:grid-cols-2">{input('reaction', 'Реакция на объект')}{input('interest', 'Уровень интереса')}{input('priceFeedback', 'Мнение о цене')}{input('objections', 'Возражения')}{input('nextStep', 'Следующий шаг')}{input('nextContactAt', 'Следующий контакт', 'datetime-local')}</div><label className="lumi-muted-strong block text-sm font-medium">Комментарий<textarea value={form.comments} onChange={event => setForm(current => ({ ...current, comments: event.target.value }))} rows={4} className="lumi-control mt-2 w-full resize-none rounded-xl px-4 py-3" /></label><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} className="lumi-control rounded-xl px-5 py-3">Отмена</button><button type="submit" disabled={saving} className="lumi-gradient-button rounded-xl px-6 py-3 font-semibold disabled:opacity-60">{saving ? 'Сохраняем…' : 'Сохранить показ'}</button></div></form></Modal>
  </div>
}

export default PropertyShowingsPanel
