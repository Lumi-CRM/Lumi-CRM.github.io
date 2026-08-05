import { supabase } from './supabase'

export type OverviewTask = {
  id: string
  title: string
  dueDate?: string
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
    months: Array<{
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
    }>
    propertyTypes: Array<{ name: string; value: number }>
    totalDealVolume: number
  }
}

const makeMonths = () => {
  const formatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' })
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (11 - index))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { key, label: formatter.format(date).replace('.', ''), sellers: 0, buyers: 0, landlords: 0, tenants: 0, saleProperties: 0, rentProperties: 0, mortgageLeads: 0, dealVolume: 0 }
  })
}

const emptyOverview: CrmOverview = {
  owners: 0,
  buyers: 0,
  properties: 0,
  activeDeals: 0,
  tasks: [],
  events: [],
  recentProperties: [],
  analytics: { months: makeMonths(), propertyTypes: [], totalDealVolume: 0 },
}

export async function getCrmOverview(): Promise<CrmOverview> {
  const [clients, properties, tasks, events, deals] = await Promise.all([
    supabase.from('clients').select('id,type,roles,mortgage_status,created_at'),
    supabase
      .from('properties')
      .select('id,address,price,status,property_type,listing_type,created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id,title,due_date,priority,status,is_completed')
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

  const months = makeMonths()
  const monthMap = new Map(months.map(month => [month.key, month]))
  for (const client of clients.data ?? []) {
    const month = client.created_at ? monthMap.get(String(client.created_at).slice(0, 7)) : undefined
    if (!month) continue
    if (client.type === 'seller') month.sellers += 1
    if (client.type === 'buyer') month.buyers += 1
    if (client.roles?.includes('landlord')) month.landlords += 1
    if (client.roles?.includes('tenant')) month.tenants += 1
    if (client.mortgage_status) month.mortgageLeads += 1
  }
  for (const property of properties.data ?? []) {
    const month = property.created_at ? monthMap.get(String(property.created_at).slice(0, 7)) : undefined
    if (!month) continue
    if (property.listing_type === 'rent') month.rentProperties += 1
    else month.saleProperties += 1
  }
  for (const deal of deals.data ?? []) {
    const month = deal.created_at ? monthMap.get(String(deal.created_at).slice(0, 7)) : undefined
    if (month) month.dealVolume += Number(deal.price || 0)
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
      months,
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
