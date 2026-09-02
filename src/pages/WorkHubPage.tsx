import { lazy, Suspense, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, CheckSquare, Clock3, Phone, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCrmOverview } from '../hooks/useCrmOverview'
import { completeOverviewItem } from '../lib/crm'
import { syncNativeReminders } from '../lib/nativeReminders'
import { routeLoaders } from '../lib/routeLoaders'

const CalendarPage = lazy(routeLoaders.calendar)
const TasksPage = lazy(routeLoaders.tasks)
const CallsPage = lazy(routeLoaders.calls)
const MonthlyPlanPage = lazy(routeLoaders.plan)

type WorkView = 'today' | 'calendar' | 'tasks' | 'calls' | 'plan'

const workViews: Array<{ id: WorkView; label: string; icon: typeof Clock3 }> = [
  { id: 'today', label: 'Сегодня', icon: Clock3 },
  { id: 'calendar', label: 'Календарь', icon: CalendarDays },
  { id: 'tasks', label: 'Задачи', icon: CheckSquare },
  { id: 'calls', label: 'Звонки', icon: Phone },
  { id: 'plan', label: 'План', icon: CalendarDays },
]

const localDateKey = () => {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const formatAgendaDate = (date?: string, time?: string) => {
  if (!date) return 'Без срока'
  const parsed = new Date(`${date}T${time || '00:00'}`)
  const dateLabel = Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
  return `${dateLabel}${time ? `, ${time.slice(0, 5)}` : ''}`
}

const TodayView = () => {
  const { user } = useAuth()
  const { data, loading, error, reload } = useCrmOverview(true)
  const [completingId, setCompletingId] = useState('')
  const today = localDateKey()
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`

  const agenda = useMemo(() => [
    ...data.tasks
      .filter(task => !task.isCompleted && (!task.dueDate || task.dueDate <= today))
      .map(task => ({ id: task.id, kind: 'task' as const, title: task.title, date: task.dueDate, time: task.dueTime, overdue: Boolean(task.dueDate && task.dueDate < today), subtitle: task.status === 'inprogress' ? 'В работе' : 'Задача' })),
    ...data.events
      .filter(event => !event.isCompleted && event.eventDate <= today)
      .map(event => ({ id: event.id, kind: 'event' as const, title: event.title, date: event.eventDate, time: event.eventTime, overdue: event.eventDate < today, subtitle: event.type === 'call' ? 'Звонок' : 'Встреча' })),
  ].sort((left, right) => `${left.date || today} ${left.time || ''}`.localeCompare(`${right.date || today} ${right.time || ''}`)), [data.events, data.tasks, today])

  const tomorrowAgenda = useMemo(() => [
    ...data.tasks.filter(task => !task.isCompleted && task.dueDate === tomorrow).map(task => ({ id: task.id, title: task.title, time: task.dueTime, subtitle: 'Задача' })),
    ...data.events.filter(event => !event.isCompleted && event.eventDate === tomorrow).map(event => ({ id: event.id, title: event.title, time: event.eventTime, subtitle: event.type === 'call' ? 'Звонок' : 'Встреча' })),
  ].sort((left, right) => (left.time || '').localeCompare(right.time || '')), [data.events, data.tasks, tomorrow])

  const complete = async (item: (typeof agenda)[number]) => {
    if (!user) return
    setCompletingId(`${item.kind}-${item.id}`)
    try {
      await completeOverviewItem(item.kind, item.id, user.id)
      await syncNativeReminders(user.id).catch(() => undefined)
      await reload()
    } finally {
      setCompletingId('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="lumi-panel rounded-2xl border p-5"><p className="lumi-muted text-sm">На сегодня и просрочено</p><p className="lumi-text mt-2 text-3xl font-bold">{loading ? '—' : agenda.length}</p></div>
        <div className="lumi-panel rounded-2xl border p-5"><p className="lumi-muted text-sm">Просрочено</p><p className="mt-2 text-3xl font-bold text-red-400">{loading ? '—' : agenda.filter(item => item.overdue).length}</p></div>
        <div className="lumi-panel rounded-2xl border p-5"><p className="lumi-muted text-sm">Текущая дата</p><p className="lumi-text mt-2 text-xl font-bold">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p></div>
        <div className="lumi-panel rounded-2xl border p-5"><p className="lumi-muted text-sm">Выполнено сегодня</p><p className="mt-2 text-3xl font-bold text-emerald-400">{loading ? '—' : data.completedToday}</p></div>
      </div>

      {error && <div className="flex flex-col gap-3 rounded-xl border border-red-800/50 bg-red-950/25 px-4 py-3 text-sm text-red-300 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button type="button" onClick={() => void reload()} className="lumi-control inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold"><RefreshCw className="h-4 w-4" />Повторить</button></div>}

      <section className="lumi-panel rounded-2xl border p-4 sm:p-6">
        <div className="mb-5"><h2 className="lumi-text text-xl font-semibold">Фокус дня</h2><p className="lumi-muted mt-1 text-sm">Просрочки, сегодняшние задачи, встречи и звонки.</p></div>
        {loading && agenda.length === 0 ? <div className="lumi-muted py-14 text-center">Собираем дела на сегодня…</div> : agenda.length === 0 ? <div className="lumi-border lumi-muted rounded-xl border border-dashed py-14 text-center"><CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400" /><p className="lumi-text font-semibold">На сегодня всё выполнено</p><p className="mt-1 text-sm">Новые дела появятся здесь автоматически.</p></div> : <div className="space-y-3">{agenda.map(item => {
          const ItemIcon = item.kind === 'task' ? CheckSquare : item.subtitle === 'Звонок' ? Phone : CalendarDays
          const key = `${item.kind}-${item.id}`
          return <div key={key} className="lumi-panel-muted flex items-center gap-3 rounded-xl border p-4"><div className={`rounded-xl p-2.5 ${item.overdue ? 'bg-red-500/10 text-red-400' : 'lumi-accent-soft'}`}><ItemIcon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="lumi-text truncate font-medium">{item.title}</p><p className={`mt-1 text-sm ${item.overdue ? 'text-red-400' : 'lumi-muted'}`}>{item.subtitle} · {formatAgendaDate(item.date, item.time)}</p></div><button type="button" onClick={() => void complete(item)} disabled={completingId === key} className="lumi-control rounded-xl p-2.5 text-emerald-400 disabled:opacity-50" aria-label={`Выполнить: ${item.title}`}><CheckCircle2 className="h-5 w-5" /></button></div>
        })}</div>}
      </section>

      <section className="lumi-panel rounded-2xl border p-4 sm:p-6">
        <div className="mb-5"><h2 className="lumi-text text-xl font-semibold">План на завтра</h2><p className="lumi-muted mt-1 text-sm">Задачи, звонки и встречи, которые уже запланированы.</p></div>
        {tomorrowAgenda.length === 0 ? <div className="lumi-border lumi-muted rounded-xl border border-dashed py-10 text-center text-sm">На завтра пока ничего не запланировано</div> : <div className="grid gap-3 md:grid-cols-2">{tomorrowAgenda.map(item => <div key={`${item.subtitle}-${item.id}`} className="lumi-panel-muted flex items-center gap-3 rounded-xl border p-4"><CalendarDays className="lumi-accent-text h-5 w-5" /><div className="min-w-0"><p className="lumi-text truncate font-medium">{item.title}</p><p className="lumi-muted mt-1 text-sm">{item.subtitle}{item.time ? ` · ${item.time.slice(0, 5)}` : ''}</p></div></div>)}</div>}
      </section>
    </div>
  )
}

const WorkHubPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get('view') as WorkView | null
  const activeView = workViews.some(view => view.id === requestedView) ? requestedView! : 'today'

  const content = activeView === 'today' ? <TodayView />
    : activeView === 'calendar' ? <CalendarPage />
      : activeView === 'tasks' ? <TasksPage />
        : activeView === 'calls' ? <CallsPage />
          : <MonthlyPlanPage />

  return (
    <div className="space-y-6">
      <div>
        <p className="lumi-accent-text text-sm font-semibold">Единый рабочий центр</p>
        <h1 className="lumi-text mt-1 text-3xl font-bold">Дела</h1>
        <p className="lumi-muted mt-2">Сегодняшний фокус, календарь, задачи, звонки и план в одном разделе.</p>
      </div>
      <div className="lumi-panel flex flex-wrap gap-2 rounded-2xl border p-2" role="tablist" aria-label="Разделы рабочих дел">
        {workViews.map(view => {
          const Icon = view.icon
          return <button key={view.id} type="button" role="tab" aria-selected={activeView === view.id} onClick={() => setSearchParams(view.id === 'today' ? {} : { view: view.id })} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold sm:flex-none sm:px-4 ${activeView === view.id ? 'lumi-nav-item-active' : 'lumi-nav-item'}`}><Icon className="h-4 w-4" />{view.label}</button>
        })}
      </div>
      <Suspense fallback={<div className="lumi-muted py-20 text-center">Загружаем раздел…</div>}>{content}</Suspense>
    </div>
  )
}

export default WorkHubPage
