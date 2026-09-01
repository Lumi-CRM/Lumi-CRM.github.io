import type { TrashTable } from './trash'

type CloudRow = Record<string, unknown>

export type ArchivedProperty = {
  id: string
  address: string
  price?: number
  rooms?: number
  area?: number
  status: string
}

export type ArchivedClient = {
  id: string
  firstName: string
  lastName: string
  middleName: string
  phone: string
  type: string
}

export type ArchiveRecords = {
  properties: ArchivedProperty[]
  clients: ArchivedClient[]
}

export type TrashItem = {
  id: string
  table: TrashTable
  title: string
  subtitle: string
  deletedAt: string
  kind: 'property' | 'client' | 'task' | 'event' | 'deal' | 'activity'
}

const optionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const stringValue = (value: unknown) => typeof value === 'string' ? value : ''

export const mapArchiveRecords = (propertyRows: CloudRow[], clientRows: CloudRow[]): ArchiveRecords => ({
  properties: propertyRows.map(row => ({
    id: String(row.id),
    address: stringValue(row.address) || 'Адрес не указан',
    price: optionalNumber(row.price),
    rooms: optionalNumber(row.rooms),
    area: optionalNumber(row.area),
    status: stringValue(row.status),
  })),
  clients: clientRows.map(row => ({
    id: String(row.id),
    firstName: stringValue(row.first_name),
    lastName: stringValue(row.last_name),
    middleName: stringValue(row.middle_name),
    phone: stringValue(row.phone),
    type: stringValue(row.type),
  })),
})

type TrashRows = {
  properties: CloudRow[]
  clients: CloudRow[]
  tasks: CloudRow[]
  events: CloudRow[]
  deals: CloudRow[]
  activities: CloudRow[]
}

export const mapTrashItems = (rows: TrashRows): TrashItem[] => [
  ...rows.properties.map(row => ({ id: String(row.id), table: 'properties' as const, title: stringValue(row.address) || 'Объект без адреса', subtitle: `Объект · ${stringValue(row.status)}`, deletedAt: stringValue(row.deleted_at), kind: 'property' as const })),
  ...rows.clients.map(row => ({ id: String(row.id), table: 'clients' as const, title: [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ') || 'Клиент без имени', subtitle: stringValue(row.phone) || 'Телефон не указан', deletedAt: stringValue(row.deleted_at), kind: 'client' as const })),
  ...rows.tasks.map(row => ({ id: String(row.id), table: 'tasks' as const, title: stringValue(row.title) || 'Задача без названия', subtitle: row.due_date ? `Задача до ${new Date(`${String(row.due_date)}T00:00:00`).toLocaleDateString('ru-RU')}` : 'Задача без срока', deletedAt: stringValue(row.deleted_at), kind: 'task' as const })),
  ...rows.events.map(row => ({ id: String(row.id), table: 'events' as const, title: stringValue(row.title) || 'Событие без названия', subtitle: `${row.type === 'call' ? 'Звонок' : 'Встреча'} · ${stringValue(row.event_date) || 'без даты'}`, deletedAt: stringValue(row.deleted_at), kind: 'event' as const })),
  ...rows.deals.map(row => ({ id: String(row.id), table: 'deals' as const, title: `Сделка ${Number(row.price || 0).toLocaleString('ru-RU')} ₽`, subtitle: stringValue(row.status), deletedAt: stringValue(row.deleted_at), kind: 'deal' as const })),
  ...rows.activities.map(row => ({ id: String(row.id), table: 'crm_activities' as const, title: stringValue(row.title) || 'Действие без названия', subtitle: `${stringValue(row.type)} · ${row.occurred_at ? new Date(String(row.occurred_at)).toLocaleDateString('ru-RU') : 'без даты'}`, deletedAt: stringValue(row.deleted_at), kind: 'activity' as const })),
].sort((left, right) => right.deletedAt.localeCompare(left.deletedAt))
