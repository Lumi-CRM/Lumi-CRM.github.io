import { useEffect, useMemo, useState } from 'react'
import { AlarmClockPlus, Calendar, CheckCircle2, Clock, Edit, ListChecks, Plus, RotateCcw, Target, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import type { Task } from '../types'
import { syncNativeReminders } from '../lib/nativeReminders'
import { moveToTrash } from '../lib/trash'

type Quadrant = NonNullable<Task['eisenhowerQuadrant']>
type SmartCriteria = NonNullable<Task['smartCriteria']>
type TaskGroup = { planned: Task[]; completed: Task[] }

const matrix: Array<{ id: Quadrant; title: string; hint: string; activeClass: string; panelClass: string }> = [
  { id: 'do', title: 'Сделать сейчас', hint: 'Важно и срочно', activeClass: 'border-red-500/70 bg-red-500/15 text-red-300', panelClass: 'border-red-500/40 bg-red-500/5' },
  { id: 'plan', title: 'Запланировать', hint: 'Важно, но не срочно', activeClass: 'border-blue-500/70 bg-blue-500/15 text-blue-300', panelClass: 'border-blue-500/40 bg-blue-500/5' },
  { id: 'delegate', title: 'Делегировать', hint: 'Срочно, но не важно', activeClass: 'border-amber-500/70 bg-amber-500/15 text-amber-300', panelClass: 'border-amber-500/40 bg-amber-500/5' },
  { id: 'eliminate', title: 'Убрать', hint: 'Не важно и не срочно', activeClass: 'border-slate-500/70 bg-slate-500/15 text-slate-300', panelClass: 'border-slate-500/40 bg-slate-500/5' },
]

const smartFields = [
  { key: 'specific', label: 'S — конкретный результат', placeholder: 'Что именно должно быть сделано?' },
  { key: 'measurable', label: 'M — измеримый результат', placeholder: 'Как поймём, что задача выполнена?' },
  { key: 'achievable', label: 'A — достижимость', placeholder: 'Какие ресурсы уже есть?' },
  { key: 'relevant', label: 'R — значимость', placeholder: 'Зачем это нужно сейчас?' },
  { key: 'timeBound', label: 'T — срок', placeholder: 'Контрольная дата или ограничение' },
] as const

const emptySmart: SmartCriteria = { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' }
const inputClass = 'lumi-control w-full rounded-xl px-4 py-3 outline-none'
const isCompleted = (task: Task) => task.status === 'done' || task.isCompleted

const TasksPage = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeQuadrant, setActiveQuadrant] = useState<Quadrant>('plan')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'todo' | 'inprogress' | 'done'>('todo')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [quadrant, setQuadrant] = useState<Quadrant>('plan')
  const [smart, setSmart] = useState<SmartCriteria>(emptySmart)

  const fetchTasks = async () => {
    if (!user) return
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('due_time', { ascending: true, nullsFirst: false })

    if (loadError) setError('Задачи временно показаны из локальной копии. Новые изменения сохранятся на устройстве.')
    if (data) setTasks(data.map(task => ({
      ...task,
      userId: task.user_id,
      dueDate: task.due_date,
      dueTime: task.due_time,
      isFavorite: task.is_favorite,
      isCompleted: task.is_completed,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      smartCriteria: task.smart_criteria || {},
      eisenhowerQuadrant: task.eisenhower_quadrant || 'plan',
      deletedAt: task.deleted_at,
    })))
    setLoading(false)
  }

  useEffect(() => { void fetchTasks() }, [user])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    setError('')
    const payload = {
      title,
      description,
      status,
      priority,
      due_date: dueDate || null,
      due_time: dueTime || null,
      smart_criteria: smart,
      eisenhower_quadrant: quadrant,
      is_completed: status === 'done',
      completed_at: status === 'done' ? new Date().toISOString() : null,
    }
    const result = editingTask
      ? await supabase.from('tasks').update(payload).eq('id', editingTask.id).eq('user_id', user.id)
      : await supabase.from('tasks').insert({ ...payload, user_id: user.id })
    if (result.error) {
      setError('Не удалось сохранить задачу.')
      return
    }
    setActiveQuadrant(quadrant)
    setIsModalOpen(false)
    await fetchTasks()
    await syncNativeReminders(user.id).catch(() => undefined)
  }

  const updateTaskStatus = async (task: Task, newStatus: 'todo' | 'inprogress' | 'done') => {
    if (!user) return
    await supabase
      .from('tasks')
      .update({ status: newStatus, is_completed: newStatus === 'done', completed_at: newStatus === 'done' ? new Date().toISOString() : null })
      .eq('id', task.id)
      .eq('user_id', user.id)
    await fetchTasks()
    await syncNativeReminders(user.id).catch(() => undefined)
  }

  const deleteTask = async (taskId: string) => {
    if (!user) return
    try {
      await moveToTrash('tasks', taskId, user.id)
      setTasks(current => current.filter(task => task.id !== taskId))
    } catch {
      setError('Не удалось переместить задачу в корзину.')
    }
    await syncNativeReminders(user.id).catch(() => undefined)
  }

  const snoozeTask = async (task: Task) => {
    if (!user) return
    const currentDue = task.dueDate && task.dueTime ? new Date(`${task.dueDate}T${task.dueTime.slice(0, 8)}`) : new Date()
    const next = new Date(Math.max(currentDue.getTime(), Date.now()) + 15 * 60_000)
    const due_date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
    const due_time = `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}:00`
    await supabase.from('tasks').update({ due_date, due_time }).eq('id', task.id).eq('user_id', user.id)
    await fetchTasks()
    await syncNativeReminders(user.id).catch(() => undefined)
  }

  const openModal = (task: Task | null = null) => {
    setEditingTask(task)
    setTitle(task?.title || '')
    setDescription(task?.description || '')
    setStatus(task?.status || 'todo')
    setPriority(task?.priority || 'medium')
    setDueDate(task?.dueDate || '')
    setDueTime(task?.dueTime || '')
    setQuadrant(task?.eisenhowerQuadrant || activeQuadrant)
    setSmart(task?.smartCriteria || emptySmart)
    setIsModalOpen(true)
  }

  const grouped = useMemo(() => Object.fromEntries(matrix.map(item => {
    const quadrantTasks = tasks.filter(task => (task.eisenhowerQuadrant || 'plan') === item.id)
    return [item.id, {
      planned: quadrantTasks.filter(task => !isCompleted(task)),
      completed: quadrantTasks
        .filter(isCompleted)
        .sort((left, right) => (right.completedAt || right.createdAt || '').localeCompare(left.completedAt || left.createdAt || '')),
    }]
  })) as Record<Quadrant, TaskGroup>, [tasks])

  const activeSection = matrix.find(item => item.id === activeQuadrant) || matrix[1]
  const activeTasks = grouped[activeQuadrant]

  const renderTask = (task: Task, completed: boolean) => (
    <article key={task.id} className={`lumi-panel rounded-xl border p-4 ${completed ? 'opacity-85' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${task.priority === 'high' ? 'bg-red-500/15 text-red-400' : task.priority === 'low' ? 'bg-sky-500/15 text-sky-400' : 'bg-amber-500/15 text-amber-400'}`}>
              {task.priority === 'high' ? 'Высокий' : task.priority === 'low' ? 'Низкий' : 'Средний'}
            </span>
            <span className="lumi-muted text-xs">{completed ? 'Выполнено' : task.status === 'inprogress' ? 'В работе' : 'К выполнению'}</span>
          </div>
          <h3 className={`lumi-text mt-3 font-bold ${completed ? 'line-through decoration-2 opacity-80' : ''}`}>{task.title}</h3>
        </div>
        <button type="button" onClick={() => openModal(task)} className="lumi-control rounded-lg p-2" aria-label="Редактировать задачу">
          <Edit className="h-4 w-4" />
        </button>
      </div>
      {task.description && <p className="lumi-muted mt-2 line-clamp-3 text-sm">{task.description}</p>}
      {task.dueDate && (
        <p className="lumi-muted mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('ru-RU')}
          {task.dueTime && <><Clock className="ml-1 h-4 w-4" />{task.dueTime.slice(0, 5)}</>}
        </p>
      )}
      <div className={`mt-4 grid gap-2 ${completed ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {!completed && (
          <button type="button" onClick={() => void snoozeTask(task)} className="lumi-control flex items-center justify-center rounded-lg p-2" title="Отложить на 15 минут" aria-label="Отложить на 15 минут">
            <AlarmClockPlus className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => void updateTaskStatus(task, completed ? 'todo' : 'done')}
          className="lumi-accent-soft flex items-center justify-center gap-2 rounded-lg p-2"
          title={completed ? 'Вернуть в работу' : 'Завершить'}
          aria-label={completed ? 'Вернуть задачу в работу' : 'Завершить задачу'}
        >
          {completed ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {completed && <span className="text-xs font-semibold">Вернуть</span>}
        </button>
        <button type="button" onClick={() => void deleteTask(task.id)} className="flex items-center justify-center rounded-lg bg-red-500/15 p-2 text-red-400" title="В корзину" aria-label="Переместить задачу в корзину">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  )

  if (loading) return <div className="lumi-muted flex min-h-[50vh] items-center justify-center">Загрузка задач…</div>

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="lumi-text text-3xl font-bold">Задачи</h1>
          <p className="lumi-muted mt-2">Четыре рабочих направления матрицы Эйзенхауэра с отдельной историей выполнения.</p>
        </div>
        <button type="button" onClick={() => openModal()} className="lumi-gradient-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold">
          <Plus className="h-5 w-5" />Новая задача
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="tablist" aria-label="Матрица Эйзенхауэра">
        {matrix.map(section => {
          const count = grouped[section.id]
          const selected = section.id === activeQuadrant
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveQuadrant(section.id)}
              className={`rounded-xl border px-3 py-3 text-left transition sm:px-4 ${selected ? section.activeClass : 'lumi-panel hover:brightness-110'}`}
            >
              <span className="lumi-text block text-sm font-bold sm:text-base">{section.title}</span>
              <span className="lumi-muted mt-1 block text-xs">{count.planned.length} в плане · {count.completed.length} выполнено</span>
            </button>
          )
        })}
      </div>

      <section role="tabpanel" className={`rounded-2xl border p-4 sm:p-5 ${activeSection.panelClass}`}>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="lumi-text text-xl font-bold">{activeSection.title}</h2>
            <p className="lumi-muted text-sm">{activeSection.hint}</p>
          </div>
          <span className="lumi-control w-fit rounded-full px-3 py-1 text-sm">Всего: {activeTasks.planned.length + activeTasks.completed.length}</span>
        </div>

        <div className="space-y-5">
          <section className="lumi-panel-muted rounded-2xl border p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks className="lumi-accent-text h-5 w-5" />
                <h3 className="lumi-text font-bold">Запланированные задачи</h3>
              </div>
              <span className="lumi-control rounded-full px-3 py-1 text-sm">{activeTasks.planned.length}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activeTasks.planned.map(task => renderTask(task, false))}
              {activeTasks.planned.length === 0 && <div className="lumi-muted col-span-full rounded-xl border border-dashed p-8 text-center text-sm">В этой вкладке нет запланированных задач</div>}
            </div>
          </section>

          <section className="lumi-panel-muted rounded-2xl border p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="lumi-text font-bold">Выполненные задачи</h3>
              </div>
              <span className="lumi-control rounded-full px-3 py-1 text-sm">{activeTasks.completed.length}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activeTasks.completed.map(task => renderTask(task, true))}
              {activeTasks.completed.length === 0 && <div className="lumi-muted col-span-full rounded-xl border border-dashed p-8 text-center text-sm">В этой вкладке пока нет выполненных задач</div>}
            </div>
          </section>
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? 'Редактировать задачу' : 'Новая SMART-задача'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2"><Target className="lumi-accent-text h-5 w-5" /><h3 className="lumi-text font-semibold">Основное</h3></div>
            <label className="lumi-muted-strong block text-sm">Название *<input required value={title} onChange={event => setTitle(event.target.value)} className={`${inputClass} mt-2`} placeholder="Какой результат нужно получить" /></label>
            <label className="lumi-muted-strong block text-sm">Описание<textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} className={`${inputClass} mt-2 resize-none`} placeholder="Контекст и необходимые действия" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="lumi-muted-strong text-sm">Квадрант<select value={quadrant} onChange={event => setQuadrant(event.target.value as Quadrant)} className={`${inputClass} mt-2`}>{matrix.map(item => <option key={item.id} value={item.id}>{item.title} — {item.hint}</option>)}</select></label>
              <label className="lumi-muted-strong text-sm">Статус<select value={status} onChange={event => setStatus(event.target.value as typeof status)} className={`${inputClass} mt-2`}><option value="todo">К выполнению</option><option value="inprogress">В работе</option><option value="done">Завершено</option></select></label>
              <label className="lumi-muted-strong text-sm">Приоритет<select value={priority} onChange={event => setPriority(event.target.value as typeof priority)} className={`${inputClass} mt-2`}><option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option></select></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="lumi-muted-strong text-sm">Дата<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className={`${inputClass} mt-2`} /></label>
                <label className="lumi-muted-strong text-sm">Время<input type="time" value={dueTime} onChange={event => setDueTime(event.target.value)} className={`${inputClass} mt-2`} /></label>
              </div>
            </div>
          </section>

          <section className="lumi-panel-muted rounded-2xl border p-4">
            <h3 className="lumi-text font-semibold">Проверка по SMART</h3>
            <p className="lumi-muted mt-1 text-sm">Каждое поле помогает превратить намерение в выполнимую задачу.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {smartFields.map(field => (
                <label key={field.key} className="lumi-muted-strong text-sm">
                  {field.label}
                  <textarea value={smart[field.key] || ''} onChange={event => setSmart(current => ({ ...current, [field.key]: event.target.value }))} rows={2} className={`${inputClass} mt-2 resize-none`} placeholder={field.placeholder} />
                </label>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="lumi-control rounded-xl px-5 py-3 font-semibold">Отмена</button>
            <button type="submit" className="lumi-gradient-button rounded-xl px-5 py-3 font-semibold">{editingTask ? 'Сохранить' : 'Создать задачу'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TasksPage
