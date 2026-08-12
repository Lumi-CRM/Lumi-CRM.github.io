import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, MessageSquareText, Plus, Trash2, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'

interface ShowingMetadata {
  kind?: string
  visitor_name?: string
  phone?: string
  attraction_source?: string
  reaction?: string
  interest?: string
  price_feedback?: string
  objections?: string
  next_step?: string
  next_contact_at?: string
}

interface ShowingRecord {
  id: string
  occurred_at: string | null
  outcome: string | null
  notes: string | null
  metadata: ShowingMetadata | null
}

const initialForm = () => ({
  visitorName: '', phone: '', source: 'Авито', date: new Date().toISOString().slice(0, 10), time: '12:00',
  outcome: 'Показ состоялся', reaction: '', interest: 'Думает', priceFeedback: '', objections: '', nextStep: '', nextContactAt: '', comments: '',
})

const PropertyShowingsPanel = ({ propertyId }: { propertyId: string }) => {
  const { user } = useAuth()
  const [records, setRecords] = useState<ShowingRecord[]>([])
  const [form, setForm] = useState(initialForm)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    const { data, error: loadError } = await supabase
      .from('crm_activities')
      .select('id,occurred_at,outcome,notes,metadata')
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .eq('type', 'meeting')
      .contains('metadata', { kind: 'property_showing' })
      .order('occurred_at', { ascending: false })
    if (loadError) setError('Не удалось загрузить показы')
    else setRecords((data || []) as ShowingRecord[])
  }, [propertyId, user])

  useEffect(() => { void load() }, [load])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    const { error: insertError } = await supabase.from('crm_activities').insert({
      user_id: user.id,
      property_id: propertyId,
      type: 'meeting',
      status: 'completed',
      title: `Показ: ${form.visitorName || 'посетитель'}`,
      occurred_at: new Date(`${form.date}T${form.time || '12:00'}`).toISOString(),
      due_at: form.nextContactAt ? new Date(form.nextContactAt).toISOString() : null,
      outcome: form.outcome,
      notes: form.comments || null,
      source: form.source || null,
      metadata: {
        kind: 'property_showing', visitor_name: form.visitorName, phone: form.phone, attraction_source: form.source,
        reaction: form.reaction, interest: form.interest, price_feedback: form.priceFeedback, objections: form.objections,
        next_step: form.nextStep, next_contact_at: form.nextContactAt,
      },
    })
    setSaving(false)
    if (insertError) {
      setError('Не удалось сохранить показ')
      return
    }
    setOpen(false)
    setForm(initialForm())
    await load()
  }

  const remove = async (id: string) => {
    if (!user || !window.confirm('Удалить запись о показе?')) return
    await supabase.from('crm_activities').delete().eq('id', id).eq('user_id', user.id)
    setRecords(current => current.filter(record => record.id !== id))
  }

  const input = (key: keyof ReturnType<typeof initialForm>, label: string, type = 'text') => <label className="lumi-muted-strong block text-sm font-medium">{label}<input type={type} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label>

  return <div className="space-y-5">
    <section className="lumi-panel flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="lumi-text text-xl font-semibold">Показы объекта</h2><p className="lumi-muted mt-1 text-sm">История посетителей, реакции, возражений и следующих шагов.</p></div>
      <button type="button" onClick={() => setOpen(true)} className="lumi-gradient-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold"><Plus className="h-5 w-5" />Добавить показ</button>
    </section>
    {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-500">{error}</p>}
    {records.length === 0 ? <div className="lumi-panel lumi-muted rounded-2xl border py-14 text-center"><CalendarClock className="mx-auto mb-3 h-11 w-11" /><p className="lumi-text font-semibold">Показов пока нет</p></div> : <div className="grid gap-4 lg:grid-cols-2">{records.map(record => {
      const meta = record.metadata || {}
      return <article key={record.id} className="lumi-panel rounded-2xl border p-5"><div className="flex items-start gap-3"><div className="lumi-accent-soft rounded-xl p-2.5"><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="lumi-text font-semibold">{meta.visitor_name || 'Посетитель'}</h3><p className="lumi-muted mt-1 text-sm">{meta.phone || 'Телефон не указан'} · {meta.attraction_source || 'Источник не указан'}</p></div><button type="button" onClick={() => void remove(record.id)} className="rounded-lg bg-red-500/10 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div><div className="lumi-border mt-4 space-y-2 border-t pt-4 text-sm"><p className="lumi-muted">{record.occurred_at ? new Date(record.occurred_at).toLocaleString('ru-RU') : 'Дата не указана'} · {record.outcome}</p>{meta.interest && <p className="lumi-text">Интерес: {meta.interest}</p>}{meta.reaction && <p className="lumi-muted">Реакция: {meta.reaction}</p>}{meta.objections && <p className="lumi-muted">Возражения: {meta.objections}</p>}{meta.next_step && <p className="lumi-accent-text">Следующий шаг: {meta.next_step}</p>}{record.notes && <p className="lumi-muted flex gap-2"><MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" />{record.notes}</p>}</div></article>
    })}</div>}
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Новый показ объекта"><form onSubmit={save} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{input('visitorName', 'Имя посетителя')}{input('phone', 'Телефон', 'tel')}{input('source', 'Способ привлечения')}{input('date', 'Дата', 'date')}{input('time', 'Время', 'time')}{input('outcome', 'Как прошла встреча')}</div><div className="grid gap-4 sm:grid-cols-2">{input('reaction', 'Реакция на объект')}{input('interest', 'Уровень интереса')}{input('priceFeedback', 'Мнение о цене')}{input('objections', 'Возражения')}{input('nextStep', 'Следующий шаг')}{input('nextContactAt', 'Следующий контакт', 'datetime-local')}</div><label className="lumi-muted-strong block text-sm font-medium">Комментарий<textarea value={form.comments} onChange={event => setForm(current => ({ ...current, comments: event.target.value }))} rows={4} className="lumi-control mt-2 w-full resize-none rounded-xl px-4 py-3" /></label><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} className="lumi-control rounded-xl px-5 py-3">Отмена</button><button type="submit" disabled={saving} className="lumi-gradient-button rounded-xl px-6 py-3 font-semibold disabled:opacity-60">{saving ? 'Сохраняем…' : 'Сохранить показ'}</button></div></form></Modal>
  </div>
}

export default PropertyShowingsPanel
