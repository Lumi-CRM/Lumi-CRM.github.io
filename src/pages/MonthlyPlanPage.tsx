import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarRange, Download, Save, Target } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { printCurrentPage } from '../lib/print'
import { indexDealFinance } from '../lib/dealFinance'

const METRICS = [
  ['coldCalls', 'Холодные звонки', 'count'], ['meetings', 'Встречи', 'count'], ['posting', 'Расклейка', 'count'],
  ['distribution', 'Раскидка', 'count'], ['agencyContracts', 'Агентский договор', 'count'], ['secondaryDeals', 'Вторичка (сделки)', 'count'],
  ['top100', 'Топ 100 (рассылка)', 'count'], ['consultations', 'Консультация', 'count'], ['reservations', 'Брони', 'count'],
  ['newBuildDeals', 'Первичка (сделки)', 'count'], ['secondaryRevenue', 'Приход агентства (вторичка)', 'money'], ['newBuildRevenue', 'Приход агентства (первичка)', 'money'],
  ['secondaryAgentIncome', 'Доход агента (вторичка)', 'money'], ['newBuildAgentIncome', 'Доход агента (первичка)', 'money'],
] as const

type MetricKey = typeof METRICS[number][0]
type TargetMap = Record<MetricKey, number>
type WeekTargets = TargetMap[]

const emptyTargets = () => Object.fromEntries(METRICS.map(([key]) => [key, 0])) as TargetMap
const currentMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { startsOn: start.toISOString().slice(0, 10), endsOn: end.toISOString().slice(0, 10) }
}

interface PlanRow { id: string; title: string; starts_on: string; ends_on: string; targets: Partial<TargetMap>; weekly_targets: Array<Partial<TargetMap>> }
interface ActivityRow { type: string; occurred_at: string | null; external_key: string | null; metadata: Record<string, unknown> | null }
interface DealRow { id: string; property_id: string; price: number | null; status: string; created_at: string }

const MonthlyPlanPage = () => {
  const { user } = useAuth()
  const range = currentMonthRange()
  const [planId, setPlanId] = useState<string | null>(null)
  const [title, setTitle] = useState('План на месяц')
  const [startsOn, setStartsOn] = useState(range.startsOn)
  const [endsOn, setEndsOn] = useState(range.endsOn)
  const [targets, setTargets] = useState<TargetMap>(emptyTargets)
  const [weeklyTargets, setWeeklyTargets] = useState<WeekTargets>(() => Array.from({ length: 5 }, emptyTargets))
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [deals, setDeals] = useState<DealRow[]>([])
  const [newBuildingIds, setNewBuildingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setMessage('')
    const [planResult, activityResult, dealResult, detailsResult] = await Promise.all([
      supabase.from('monthly_plans').select('*').eq('user_id', user.id).order('starts_on', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('crm_activities').select('type,occurred_at,external_key,metadata').eq('user_id', user.id).is('deleted_at', null).eq('status', 'completed'),
      supabase.from('deals').select('id,property_id,price,status,created_at').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('property_details').select('property_id,new_building').eq('user_id', user.id).eq('new_building', true),
    ])
    if (planResult.data) {
      const plan = planResult.data as PlanRow
      setPlanId(plan.id); setTitle(plan.title); setStartsOn(plan.starts_on); setEndsOn(plan.ends_on)
      setTargets({ ...emptyTargets(), ...(plan.targets || {}) })
      setWeeklyTargets(Array.from({ length: 5 }, (_, index) => ({ ...emptyTargets(), ...(plan.weekly_targets?.[index] || {}) })))
    }
    if (planResult.error) setMessage('Таблица планов ещё не настроена в Supabase.')
    setActivities((activityResult.data || []) as ActivityRow[])
    setDeals((dealResult.data || []) as DealRow[])
    setNewBuildingIds(new Set((detailsResult.data || []).map(row => row.property_id)))
    setLoading(false)
  }, [user])

  useEffect(() => { void load() }, [load])

  const dateInRange = (value: string | null, start: string, end: string) => Boolean(value && value.slice(0, 10) >= start && value.slice(0, 10) <= end)
  const actual = useMemo(() => {
    const result = emptyTargets()
    const financeByDeal = indexDealFinance(activities)
    for (const activity of activities) {
      if (!dateInRange(activity.occurred_at, startsOn, endsOn)) continue
      if (activity.type === 'call' && activity.metadata?.call_type === 'cold') result.coldCalls += 1
      if (activity.type === 'meeting') result.meetings += 1
      const workType = activity.metadata?.work_type as MetricKey | undefined
      if (workType && workType in result) result[workType] += 1
    }
    for (const deal of deals) {
      if (!dateInRange(deal.created_at, startsOn, endsOn) || deal.status !== 'closed') continue
      const primary = newBuildingIds.has(deal.property_id)
      result[primary ? 'newBuildDeals' : 'secondaryDeals'] += 1
      const finance = financeByDeal.get(deal.id)
      result[primary ? 'newBuildRevenue' : 'secondaryRevenue'] += Number(finance?.agencyIncome || 0)
      result[primary ? 'newBuildAgentIncome' : 'secondaryAgentIncome'] += Number(finance?.agentIncome || 0)
    }
    return result
  }, [activities, deals, endsOn, newBuildingIds, startsOn])

  const save = async () => {
    if (!user) return
    setSaving(true); setMessage('')
    const payload = { user_id: user.id, title, starts_on: startsOn, ends_on: endsOn, targets, weekly_targets: weeklyTargets }
    const result = planId
      ? await supabase.from('monthly_plans').update(payload).eq('id', planId).eq('user_id', user.id).select('id').single()
      : await supabase.from('monthly_plans').insert(payload).select('id').single()
    setSaving(false)
    if (result.error) setMessage('Не удалось сохранить план. Проверьте настройку базы.')
    else { setPlanId(result.data.id); setMessage('План сохранён и синхронизирован с базой.') }
  }

  const changeTarget = (key: MetricKey, value: string) => setTargets(current => ({ ...current, [key]: Math.max(0, Number(value) || 0) }))
  const changeWeekTarget = (week: number, key: MetricKey, value: string) => setWeeklyTargets(current => current.map((item, index) => index === week ? { ...item, [key]: Math.max(0, Number(value) || 0) } : item))

  return <div className="min-w-0 space-y-6 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="lumi-text text-3xl font-bold">План работы</h1><p className="lumi-muted mt-1">Цели месяца, недельная разбивка и автоматический факт из CRM.</p></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void printCurrentPage()} className="lumi-control flex items-center justify-center gap-2 rounded-xl px-4 py-3"><Download className="h-4 w-4" />PDF</button><button type="button" disabled={saving} onClick={() => void save()} className="lumi-gradient-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Сохраняем…' : 'Сохранить'}</button></div></div>
    {message && <p className="lumi-panel rounded-xl border px-4 py-3 text-sm">{message}</p>}
    <section className="lumi-panel rounded-2xl border p-5"><div className="grid gap-4 sm:grid-cols-3"><label className="lumi-muted-strong text-sm font-medium">Название<input value={title} onChange={event => setTitle(event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label><label className="lumi-muted-strong text-sm font-medium">С даты<input type="date" value={startsOn} onChange={event => setStartsOn(event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label><label className="lumi-muted-strong text-sm font-medium">По дату<input type="date" value={endsOn} onChange={event => setEndsOn(event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label></div></section>
    {loading ? <p className="lumi-muted py-12 text-center">Загружаем план…</p> : <div data-print-list className="grid gap-4 lg:grid-cols-2">{METRICS.map(([key, label, unit]) => {
      const target = targets[key]
      const progress = target ? Math.min(100, Math.round(actual[key] / target * 100)) : 0
      return <section key={key} className="lumi-panel rounded-2xl border p-5"><div className="flex items-start gap-3"><div className="lumi-accent-soft rounded-xl p-2.5"><Target className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="lumi-text font-semibold">{label}</h2><p className="lumi-muted mt-1 text-sm">Факт: <strong className="lumi-text">{unit === 'money' ? `${actual[key].toLocaleString('ru-RU')} ₽` : actual[key]}</strong> из {unit === 'money' ? `${target.toLocaleString('ru-RU')} ₽` : target}</p></div><input aria-label={`План: ${label}`} type="number" min="0" value={target || ''} onChange={event => changeTarget(key, event.target.value)} className="lumi-control w-28 rounded-xl px-3 py-2 text-right" placeholder="План" /></div><div className="lumi-control mt-4 h-2 overflow-hidden rounded-full"><div className="h-full rounded-full bg-[var(--lumi-accent)] transition-all" style={{ width: `${progress}%` }} /></div><p className="lumi-muted mt-1 text-right text-xs">{progress}%</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{weeklyTargets.map((week, index) => <label key={index} className="lumi-muted text-xs">{index + 1} нед.<input aria-label={`${label}, неделя ${index + 1}`} type="number" min="0" value={week[key] || ''} onChange={event => changeWeekTarget(index, key, event.target.value)} className="lumi-control mt-1 w-full rounded-lg px-2 py-2 text-right" /></label>)}</div></section>
    })}</div>}
    <section className="lumi-panel-muted lumi-muted flex items-start gap-3 rounded-2xl border p-5 text-sm"><CalendarRange className="lumi-accent-text mt-0.5 h-5 w-5 shrink-0" /><p>Холодные звонки, встречи и закрытые сделки считаются автоматически. Остальные виды работы будут подтягиваться по мере добавления соответствующих журналов.</p></section>
  </div>
}

export default MonthlyPlanPage
