export const PLAN_METRICS = [
  ['coldCalls', 'Холодные звонки', 'count'], ['meetings', 'Встречи', 'count'], ['posting', 'Расклейка', 'count'],
  ['distribution', 'Раскидка', 'count'], ['agencyContracts', 'Агентский договор', 'count'], ['secondaryDeals', 'Вторичка (сделки)', 'count'],
  ['top100', 'Топ 100 (рассылка)', 'count'], ['consultations', 'Консультация', 'count'], ['reservations', 'Брони', 'count'],
  ['newBuildDeals', 'Первичка (сделки)', 'count'], ['secondaryRevenue', 'Приход агентства (вторичка)', 'money'], ['newBuildRevenue', 'Приход агентства (первичка)', 'money'],
  ['secondaryAgentIncome', 'Доход агента (вторичка)', 'money'], ['newBuildAgentIncome', 'Доход агента (первичка)', 'money'],
] as const

export type PlanMetricKey = typeof PLAN_METRICS[number][0]
export type PlanTargetMap = Record<PlanMetricKey, number>
export type PlanWeekTargets = PlanTargetMap[]

export type MonthlyPlan = {
  id: string
  userId: string
  title: string
  startsOn: string
  endsOn: string
  targets: PlanTargetMap
  weeklyActuals: PlanWeekTargets
  createdAt: string
  updatedAt: string
}

export type MonthlyPlanUpsertInput = Pick<MonthlyPlan, 'title' | 'startsOn' | 'endsOn' | 'targets' | 'weeklyActuals'>

type CloudRow = Record<string, unknown>

export const emptyPlanTargets = () => Object.fromEntries(PLAN_METRICS.map(([key]) => [key, 0])) as PlanTargetMap

const normalizedTargets = (value: unknown) => {
  const source = value && typeof value === 'object' ? value as Partial<PlanTargetMap> : {}
  return Object.fromEntries(PLAN_METRICS.map(([key]) => [key, Math.max(0, Number(source[key]) || 0)])) as PlanTargetMap
}

const normalizedWeeks = (value: unknown) => {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length: 5 }, (_, index) => normalizedTargets(source[index]))
}

export const mapMonthlyPlanRow = (row: CloudRow): MonthlyPlan => ({
  id: String(row.id),
  userId: typeof row.user_id === 'string' ? row.user_id : '',
  title: typeof row.title === 'string' ? row.title : 'План на месяц',
  startsOn: typeof row.starts_on === 'string' ? row.starts_on : '',
  endsOn: typeof row.ends_on === 'string' ? row.ends_on : '',
  targets: normalizedTargets(row.targets),
  weeklyActuals: normalizedWeeks(row.weekly_targets),
  createdAt: typeof row.created_at === 'string' ? row.created_at : '',
  updatedAt: typeof row.updated_at === 'string' ? row.updated_at : typeof row.created_at === 'string' ? row.created_at : '',
})

export const monthlyPlanFromInput = (
  userId: string,
  id: string,
  input: MonthlyPlanUpsertInput,
  previous?: MonthlyPlan,
): MonthlyPlan => ({
  id,
  userId,
  title: input.title,
  startsOn: input.startsOn,
  endsOn: input.endsOn,
  targets: normalizedTargets(input.targets),
  weeklyActuals: normalizedWeeks(input.weeklyActuals),
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})
