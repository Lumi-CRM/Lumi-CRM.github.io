import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Download, Save, Target } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMonthlyPlan } from '../hooks/useMonthlyPlan'
import { printCurrentPage } from '../lib/print'
import { indexDealFinance } from '../lib/dealFinance'
import { emptyPlanTargets, PLAN_METRICS, type PlanMetricKey, type PlanTargetMap } from '../lib/monthlyPlanMapping'
import { calculateCombinedPlanActual, calculatePlanProgress, parsePlanNumberDraft } from '../lib/planProgress'

type MetricKey = PlanMetricKey
type TargetMap = PlanTargetMap
type WeekTargets = PlanTargetMap[]

const emptyTargets = emptyPlanTargets
const currentMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { startsOn: start.toISOString().slice(0, 10), endsOn: end.toISOString().slice(0, 10) }
}

interface PlanNumberInputProps {
  value: number
  ariaLabel: string
  className: string
  onValueChange: (value: number) => void
}

const PlanNumberInput = ({ value, ariaLabel, className, onValueChange }: PlanNumberInputProps) => {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => { setDraft(String(value)) }, [value])

  const changeDraft = (next: string) => {
    setDraft(next)
    const parsed = parsePlanNumberDraft(next)
    if (parsed !== null) onValueChange(parsed)
  }

  const finishEditing = () => {
    const parsed = parsePlanNumberDraft(draft) ?? 0
    setDraft(String(parsed))
    onValueChange(parsed)
  }

  return <input aria-label={ariaLabel} type="number" min="0" value={draft} onChange={event => changeDraft(event.target.value)} onBlur={finishEditing} className={className} />
}

const MonthlyPlanPage = () => {
  const { user } = useAuth()
  const planQuery = useMonthlyPlan(user?.id)
  const range = currentMonthRange()
  const [planId, setPlanId] = useState<string | null>(null)
  const [title, setTitle] = useState('План на месяц')
  const [startsOn, setStartsOn] = useState(range.startsOn)
  const [endsOn, setEndsOn] = useState(range.endsOn)
  const [targets, setTargets] = useState<TargetMap>(emptyTargets)
  const [weeklyActuals, setWeeklyActuals] = useState<WeekTargets>(() => Array.from({ length: 5 }, emptyTargets))
  const [message, setMessage] = useState('')

  useEffect(() => {
    const plan = planQuery.plan
    if (!plan) return
    setPlanId(plan.id)
    setTitle(plan.title)
    setStartsOn(plan.startsOn)
    setEndsOn(plan.endsOn)
    setTargets(plan.targets)
    setWeeklyActuals(plan.weeklyActuals)
  }, [planQuery.plan])

  const activities = planQuery.actuals?.activities || []
  const deals = planQuery.actuals?.deals || []
  const newBuildingIds = useMemo(() => new Set(planQuery.actuals?.newBuildingIds || []), [planQuery.actuals?.newBuildingIds])

  const dateInRange = (value: string | null, start: string, end: string) => Boolean(value && value.slice(0, 10) >= start && value.slice(0, 10) <= end)
  const automaticActual = useMemo(() => {
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

  const actualBreakdown = useMemo(() => Object.fromEntries(PLAN_METRICS.map(([key]) => [
    key,
    calculateCombinedPlanActual(automaticActual[key], weeklyActuals.map(week => week[key])),
  ])) as Record<MetricKey, ReturnType<typeof calculateCombinedPlanActual>>, [automaticActual, weeklyActuals])

  const save = async () => {
    if (!user) return
    setMessage('')
    try {
      const result = await planQuery.savePlan({ title, startsOn, endsOn, targets, weeklyActuals }, planId || undefined)
      setPlanId(result.id)
      setMessage(navigator.onLine ? 'План сохранён и синхронизирован с базой.' : 'План сохранён на устройстве и будет синхронизирован позже.')
    } catch {
      setMessage('Не удалось сохранить план. Повторите попытку.')
    }
  }

  const changeTarget = (key: MetricKey, value: number) => setTargets(current => ({ ...current, [key]: value }))
  const changeWeekActual = (week: number, key: MetricKey, value: number) => setWeeklyActuals(current => current.map((item, index) => index === week ? { ...item, [key]: value } : item))

  return <div className="min-w-0 space-y-6 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="lumi-text text-3xl font-bold">План работы</h1><p className="lumi-muted mt-1">Цели месяца, недельная разбивка и автоматический факт из CRM.</p></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void printCurrentPage()} className="lumi-control flex items-center justify-center gap-2 rounded-xl px-4 py-3"><Download className="h-4 w-4" />PDF</button><button type="button" disabled={planQuery.mutationPending} onClick={() => void save()} className="lumi-gradient-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold disabled:opacity-60"><Save className="h-4 w-4" />{planQuery.mutationPending ? 'Сохраняем…' : 'Сохранить'}</button></div></div>
    {message && <p className="lumi-panel rounded-xl border px-4 py-3 text-sm">{message}</p>}
    {planQuery.error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"><span>{planQuery.error instanceof Error ? planQuery.error.message : 'Не удалось загрузить план'}</span><button type="button" onClick={() => void planQuery.refetch()} className="font-semibold underline">Повторить</button></div>}
    <section className="lumi-panel rounded-2xl border p-5"><div className="grid gap-4 sm:grid-cols-3"><label className="lumi-muted-strong text-sm font-medium">Название<input value={title} onChange={event => setTitle(event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label><label className="lumi-muted-strong text-sm font-medium">С даты<input type="date" value={startsOn} onChange={event => setStartsOn(event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label><label className="lumi-muted-strong text-sm font-medium">По дату<input type="date" value={endsOn} onChange={event => setEndsOn(event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3" /></label></div></section>
    {planQuery.isLoading ? <p className="lumi-muted py-12 text-center">Загружаем план…</p> : <div data-print-list className="grid gap-4 lg:grid-cols-2">{PLAN_METRICS.map(([key, label, unit]) => {
      const target = targets[key]
      const breakdown = actualBreakdown[key]
      const progress = calculatePlanProgress(breakdown.total, target)
      const money = (value: number) => unit === 'money' ? `${value.toLocaleString('ru-RU')} ₽` : value
      return <section key={key} className="lumi-panel rounded-2xl border p-5"><div className="flex items-start gap-3"><div className="lumi-accent-soft rounded-xl p-2.5"><Target className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="lumi-text font-semibold">{label}</h2><p className="lumi-muted mt-1 text-sm">Факт: <strong className="lumi-text">{money(breakdown.total)}</strong> из {money(target)}</p><p className="lumi-muted mt-1 text-xs">Автоматически из CRM: {money(breakdown.automatic)} · Вручную: {money(breakdown.manual)}</p></div><PlanNumberInput ariaLabel={`План: ${label}`} value={target} onValueChange={value => changeTarget(key, value)} className="lumi-control w-28 rounded-xl px-3 py-2 text-right" /></div><div className="lumi-control mt-4 h-2 overflow-hidden rounded-full"><div className="h-full rounded-full bg-[var(--lumi-accent)] transition-all" style={{ width: `${progress.barPercent}%` }} /></div><p className="lumi-muted mt-1 text-right text-xs">{progress.label}</p><p className="lumi-muted mt-4 text-xs font-medium uppercase tracking-wide">Ручной факт по неделям</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">{weeklyActuals.map((week, index) => <label key={index} className="lumi-muted text-xs">{index + 1} нед.<PlanNumberInput ariaLabel={`${label}, ручной факт за неделю ${index + 1}`} value={week[key]} onValueChange={value => changeWeekActual(index, key, value)} className="lumi-control mt-1 w-full rounded-lg px-2 py-2 text-right" /></label>)}</div></section>
    })}</div>}
    <section className="lumi-panel-muted lumi-muted flex items-start gap-3 rounded-2xl border p-5 text-sm"><CalendarRange className="lumi-accent-text mt-0.5 h-5 w-5 shrink-0" /><p>Холодные звонки, встречи и закрытые сделки считаются автоматически. Остальные виды работы будут подтягиваться по мере добавления соответствующих журналов.</p></section>
  </div>
}

export default MonthlyPlanPage
