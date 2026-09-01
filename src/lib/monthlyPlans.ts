import { mapMonthlyPlanRow, monthlyPlanFromInput, type MonthlyPlan, type MonthlyPlanUpsertInput } from './monthlyPlanMapping'
import { supabase } from './supabase'

export interface PlanActivityRow {
  type: string
  occurred_at: string | null
  external_key: string | null
  metadata: Record<string, unknown> | null
}

export interface PlanDealRow {
  id: string
  property_id: string
  price: number | null
  status: string
  created_at: string
}

export type PlanActualSources = {
  activities: PlanActivityRow[]
  deals: PlanDealRow[]
  newBuildingIds: string[]
}

export const fetchLatestMonthlyPlan = async (userId: string): Promise<MonthlyPlan | null> => {
  const { data, error } = await supabase
    .from('monthly_plans')
    .select('*')
    .eq('user_id', userId)
    .order('starts_on', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? mapMonthlyPlanRow(data) : null
}

export const fetchPlanActualSources = async (userId: string): Promise<PlanActualSources> => {
  const [activityResult, dealResult, detailsResult] = await Promise.all([
    supabase.from('crm_activities').select('type,occurred_at,external_key,metadata').eq('user_id', userId).is('deleted_at', null).eq('status', 'completed'),
    supabase.from('deals').select('id,property_id,price,status,created_at').eq('user_id', userId).is('deleted_at', null),
    supabase.from('property_details').select('property_id,new_building').eq('user_id', userId).eq('new_building', true),
  ])
  const firstError = [activityResult.error, dealResult.error, detailsResult.error].find(Boolean)
  if (firstError) throw firstError
  return {
    activities: (activityResult.data || []) as PlanActivityRow[],
    deals: (dealResult.data || []) as PlanDealRow[],
    newBuildingIds: (detailsResult.data || []).map(row => String(row.property_id)),
  }
}

export const saveMonthlyPlan = async (
  userId: string,
  input: MonthlyPlanUpsertInput,
  planId?: string,
  newPlanId?: string,
) => {
  const id = planId || newPlanId || crypto.randomUUID()
  const payload = {
    user_id: userId,
    title: input.title,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    targets: input.targets,
    weekly_targets: input.weeklyActuals,
  }
  const result = planId
    ? await supabase.from('monthly_plans').update(payload).eq('id', planId).eq('user_id', userId)
    : await supabase.from('monthly_plans').insert({ ...payload, id })
  if (result.error) throw result.error
  return { id }
}

export const makeSavedMonthlyPlan = (
  userId: string,
  id: string,
  input: MonthlyPlanUpsertInput,
  previous?: MonthlyPlan,
) => monthlyPlanFromInput(userId, id, input, previous)
