import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Clock3, Loader2, MessageSquareText, PhoneCall, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

interface ActivityRow {
  id: string
  type: 'call' | 'message' | 'meeting' | 'note' | 'follow_up'
  status: 'planned' | 'completed' | 'cancelled'
  title: string
  occurred_at: string | null
  due_at: string | null
  outcome: string | null
  notes: string | null
  source: string | null
  created_at: string
}

interface ActivityTimelineProps {
  clientId?: string
  propertyId?: string
  title?: string
}

const iconByType = {
  call: PhoneCall,
  message: MessageSquareText,
  meeting: Users,
  note: MessageSquareText,
  follow_up: CalendarClock,
}

const formatMoment = (value: string | null) => value
  ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Дата не указана'

const ActivityTimeline = ({ clientId, propertyId, title = 'История работы и комментарии' }: ActivityTimelineProps) => {
  const { user } = useAuth()
  const [items, setItems] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    let query = supabase
      .from('crm_activities')
      .select('id,type,status,title,occurred_at,due_at,outcome,notes,source,created_at')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (clientId) query = query.eq('client_id', clientId)
    if (propertyId) query = query.eq('property_id', propertyId)
    const { data, error: loadError } = await query
    if (loadError) setError(loadError.message)
    else setItems((data || []) as ActivityRow[])
    setLoading(false)
  }, [clientId, propertyId, user])

  useEffect(() => { void load() }, [load])

  return (
    <section className="lumi-panel rounded-2xl border p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="lumi-text text-lg font-semibold">{title}</h3>
          <p className="lumi-muted mt-1 text-sm">Каждый звонок, сообщение и встреча — отдельная запись, без дублирования карточки</p>
        </div>
        <span className="lumi-accent-soft rounded-full px-3 py-1 text-sm font-semibold">{items.length}</span>
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}
      {loading ? (
        <div className="lumi-muted flex items-center gap-2 py-6"><Loader2 className="h-5 w-5 animate-spin" />Загрузка истории…</div>
      ) : items.length === 0 ? (
        <div className="lumi-panel-muted lumi-muted rounded-xl border p-6 text-center">Касаний и комментариев пока нет</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const Icon = iconByType[item.type] || MessageSquareText
            return (
              <article key={item.id} className="lumi-panel-muted lumi-border flex gap-4 rounded-xl border p-4">
                <div className="lumi-accent-soft mt-0.5 h-fit rounded-xl p-2.5"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="lumi-text font-semibold">{item.title}</h4>
                      <p className="lumi-muted mt-0.5 text-xs">{formatMoment(item.occurred_at || item.created_at)}{item.source ? ` · ${item.source}` : ''}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : item.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {item.status === 'completed' ? 'Выполнено' : item.status === 'cancelled' ? 'Отменено' : 'Запланировано'}
                    </span>
                  </div>
                  {item.outcome && <p className="lumi-text mt-3 flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span><b>Итог:</b> {item.outcome}</span></p>}
                  {item.notes && <div className="lumi-muted-strong mt-3 whitespace-pre-wrap rounded-lg border border-current/10 px-3 py-2.5 text-sm">{item.notes}</div>}
                  {item.due_at && <p className="mt-3 flex items-center gap-2 text-sm text-amber-500"><Clock3 className="h-4 w-4" />Следующий контакт: {formatMoment(item.due_at)}</p>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ActivityTimeline
