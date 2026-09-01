import type { Client, Property } from '../types'
import { inferContactRoles } from './contactRoles.ts'

type CloudRow = Record<string, unknown>

const optionalNumber = (value: unknown) => {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
const optionalString = (value: unknown) => typeof value === 'string' && value ? value : undefined
const stringList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const clientRoles = (row: CloudRow) => {
  const explicit = stringList(row.roles).filter(role => ['buyer', 'seller', 'landlord', 'tenant'].includes(role))
  return explicit.length ? explicit : inferContactRoles(row)
}

export const mapPropertyRow = (row: CloudRow): Property => ({
  id: String(row.id),
  userId: String(row.user_id),
  address: typeof row.address === 'string' ? row.address : '',
  price: optionalNumber(row.price),
  rooms: optionalNumber(row.rooms),
  area: optionalNumber(row.area),
  floor: optionalNumber(row.floor),
  totalFloors: optionalNumber(row.total_floors),
  status: row.status === 'reserved' || row.status === 'sold' || row.status === 'archived' ? row.status : 'available',
  listingType: row.listing_type === 'rent' ? 'rent' : 'sale',
  workStream: row.work_stream === 'cold' ? 'cold' : 'active',
  propertyType: optionalString(row.property_type),
  sourceUrl: optionalString(row.source_url),
  ownerId: optionalString(row.owner_id),
  tags: stringList(row.tags),
  isFavorite: Boolean(row.is_favorite),
  constructionYear: optionalNumber(row.construction_year) ?? undefined,
  description: optionalString(row.description),
  createdAt: typeof row.created_at === 'string' ? row.created_at : '',
  updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
  photos: [],
  documents: [],
  notes: [],
})

export const mapClientRow = (row: CloudRow): Client => ({
  id: String(row.id),
  userId: String(row.user_id),
  type: row.type === 'seller' ? 'seller' : 'buyer',
  firstName: typeof row.first_name === 'string' ? row.first_name : '',
  lastName: typeof row.last_name === 'string' ? row.last_name : '',
  middleName: optionalString(row.middle_name),
  phone: typeof row.phone === 'string' ? row.phone : '',
  email: optionalString(row.email),
  preferredDistricts: stringList(row.preferred_districts),
  mortgageStatus: Boolean(row.mortgage_status),
  paymentMethod: optionalString(row.payment_method),
  propertyType: optionalString(row.property_type),
  budget: optionalNumber(row.budget) ?? undefined,
  rooms: optionalNumber(row.rooms) ?? undefined,
  source: optionalString(row.source),
  firstContactDate: optionalString(row.first_contact_date),
  lastContactDate: optionalString(row.last_contact_date),
  nextContactDate: optionalString(row.next_contact_at),
  birthDate: optionalString(row.birth_date),
  birthdayReminder: Boolean(row.birthday_reminder),
  contactComment: optionalString(row.contact_comment),
  roles: clientRoles(row),
  status: optionalString(row.status),
  leadTemperature: row.lead_temperature === 'warm' || row.lead_temperature === 'inbound' || row.lead_temperature === 'hot'
    ? row.lead_temperature
    : row.lead_temperature === 'cold' ? 'cold' : undefined,
  description: optionalString(row.description),
  tags: stringList(row.tags),
  isFavorite: Boolean(row.is_favorite),
  createdAt: typeof row.created_at === 'string' ? row.created_at : '',
  updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
  photos: [],
  documents: [],
  notes: [],
})
