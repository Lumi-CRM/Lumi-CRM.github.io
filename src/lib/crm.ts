import { supabase } from './supabase'

export type OverviewTask = {
  id: string
  title: string
  dueDate?: string
  dueTime?: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'inprogress' | 'done'
  isCompleted: boolean
}

export type OverviewEvent = {
  id: string
  type: 'meeting' | 'call'
  title: string
  eventDate: string
  eventTime?: string
  location?: string
  isCompleted: boolean
}

export type OverviewProperty = {
  id: string
  address: string
  price?: number
  status: string
}

export type CrmOverview = {
  owners: number
  buyers: number
  properties: number
  activeDeals: number
  tasks: OverviewTask[]
  events: OverviewEvent[]
  recentProperties: OverviewProperty[]
  analytics: {
    months: AnalyticsPoint[]
    periods: Record<'days' | 'weeks' | 'months', AnalyticsPoint[]>
    propertyTypes: Array<{ name: string; value: number }>
    totalDealVolume: number
  }
}

export type AnalyticsPoint = {
  key: string
  label: string
  sellers: number
  buyers: number
  landlords: number
  tenants: number
  saleProperties: number
  rentProperties: number
  mortgageLeads: number
  dealVolume: number
}

const emptyPoint = (key: string, label: string): AnalyticsPoint => ({ key, label, sellers: 0, buyers: 0, landlords: 0, tenants: 0, saleProperties: 0, rentProperties: 0, mortgageLeads: 0, dealVolume: 0 })

const mondayOf = (date: Date) => {
  const result = new Date(date)
  const day = result.getDay() || 7
  result.setDate(result.getDate() - day + 1)
  result.setHours(0, 0, 0, 0)
  return result
}

const makePeriods = () => {
  const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' })
  const shortFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' })
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (11 - index))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return emptyPoint(key, monthFormatter.format(date).replace('.', ''))
  })
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (29 - index))
    return emptyPoint(date.toISOString().slice(0, 10), shortFormatter.format(date).replace('.', ''))
  })
  const currentMonday = mondayOf(new Date())
  const weeks = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(currentMonday)
    date.setDate(date.getDate() - (11 - index) * 7)
    return emptyPoint(date.toISOString().slice(0, 10), shortFormatter.format(date).replace('.', ''))
  })
  return { days, weeks, months }
}

const emptyOverview: CrmOverview = {
  owners: 0,
  buyers: 0,
  properties: 0,
  activeDeals: 0,
  tasks: [],
  events: [],
  recentProperties: [],
  analytics: { months: makePeriods().months, periods: makePeriods(), propertyTypes: [], totalDealVolume: 0 },
}

export async function getCrmOverview(): Promise<CrmOverview> {
  const [clients, properties, tasks, events, deals] = await Promise.all([
    supabase.from('clients').select('id,type,roles,mortgage_status,created_at'),
    supabase
      .from('properties')
      .select('id,address,price,status,property_type,listing_type,created_at')
      .neq('status', 'archived')
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id,title,due_date,due_time,priority,status,is_completed')
      .eq('is_completed', false)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from('events')
      .select('id,type,title,event_date,event_time,location,is_completed')
      .eq('is_completed', false)
      .order('event_date', { ascending: true })
      .limit(8),
    supabase.from('deals').select('id,status,price,created_at'),
  ])

  const firstError = [clients.error, properties.error, tasks.error, events.error, deals.error].find(Boolean)
  if (firstError) throw firstError

  const periods = makePeriods()
  const maps = {
    days: new Map(periods.days.map(point => [point.key, point])),
    weeks: new Map(periods.weeks.map(point => [point.key, point])),
    months: new Map(periods.months.map(point => [point.key, point])),
  }
  const pointsFor = (value?: string | null) => {
    if (!value) return []
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return []
    const monday = mondayOf(date).toISOString().slice(0, 10)
    return [maps.days.get(value.slice(0, 10)), maps.weeks.get(monday), maps.months.get(value.slice(0, 7))].filter(Boolean) as AnalyticsPoint[]
  }
  for (const client of clients.data ?? []) {
    for (const point of pointsFor(client.created_at)) {
      if (client.type === 'seller') point.sellers += 1
      if (client.type === 'buyer') point.buyers += 1
      if (client.roles?.includes('landlord')) point.landlords += 1
      if (client.roles?.includes('tenant')) point.tenants += 1
      if (client.mortgage_status) point.mortgageLeads += 1
    }
  }
  for (const property of properties.data ?? []) {
    for (const point of pointsFor(property.created_at)) {
      if (property.listing_type === 'rent') point.rentProperties += 1
      else point.saleProperties += 1
    }
  }
  for (const deal of deals.data ?? []) {
    for (const point of pointsFor(deal.created_at)) point.dealVolume += Number(deal.price || 0)
  }
  const typeCounts = new Map<string, number>()
  for (const property of properties.data ?? []) {
    const type = property.property_type || 'Не указан'
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
  }

  return {
    ...emptyOverview,
    owners: (clients.data ?? []).filter(client => client.type === 'seller').length,
    buyers: (clients.data ?? []).filter(client => client.type === 'buyer').length,
    properties: properties.data?.length ?? 0,
    activeDeals: (deals.data ?? []).filter(deal => deal.status === 'active' || deal.status === 'pending').length,
    tasks: (tasks.data ?? []).map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.due_date ?? undefined,
      dueTime: task.due_time ?? undefined,
      priority: task.priority,
      status: task.status,
      isCompleted: task.is_completed,
    })),
    events: (events.data ?? []).map(event => ({
      id: event.id,
      type: event.type,
      title: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time ?? undefined,
      location: event.location ?? undefined,
      isCompleted: event.is_completed,
    })),
    recentProperties: (properties.data ?? []).slice(0, 4).map(property => ({
      id: property.id,
      address: property.address,
      price: property.price ?? undefined,
      status: property.status,
    })),
    analytics: {
      months: periods.months,
      periods,
      propertyTypes: Array.from(typeCounts, ([name, value]) => ({ name, value })),
      totalDealVolume: (deals.data ?? []).reduce((sum, deal) => sum + Number(deal.price || 0), 0),
    },
  }
}

export async function completeOverviewItem(type: 'task' | 'event', id: string) {
  const table = type === 'task' ? 'tasks' : 'events'
  const { error } = await supabase
    .from(table)
    .update(type === 'task' ? { is_completed: true, status: 'done' } : { is_completed: true })
    .eq('id', id)

  if (error) throw error
}
