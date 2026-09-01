import type { Client, ClientType } from '../types'
import type { ContactRole } from './contactRoles'

export type ContactInput = {
  type: ClientType
  firstName: string
  lastName: string
  middleName?: string | null
  phone: string
  email?: string | null
  propertyType?: string | null
  preferredDistricts?: string[]
  mortgageStatus?: boolean
  paymentMethod?: string | null
  budget?: number | null
  rooms?: number | null
  source?: string | null
  firstContactDate?: string | null
  lastContactDate?: string | null
  nextContactDate?: string | null
  birthDate?: string | null
  birthdayReminder?: boolean
  contactComment?: string | null
  roles: ContactRole[]
  status?: string | null
  leadTemperature?: Client['leadTemperature'] | null
  description?: string | null
  tags: string[]
}

const optional = <T>(value: T | null | undefined) => value == null ? undefined : value

export const contactFromInput = (userId: string, id: string, input: ContactInput, previous?: Client): Client => {
  const now = new Date().toISOString()
  return {
    id,
    userId,
    type: input.type,
    firstName: input.firstName,
    lastName: input.lastName,
    middleName: optional(input.middleName),
    phone: input.phone,
    email: optional(input.email),
    propertyType: input.propertyType === undefined ? previous?.propertyType : optional(input.propertyType),
    preferredDistricts: input.preferredDistricts ?? previous?.preferredDistricts,
    mortgageStatus: input.mortgageStatus ?? previous?.mortgageStatus,
    paymentMethod: input.paymentMethod === undefined ? previous?.paymentMethod : optional(input.paymentMethod),
    budget: input.budget === undefined ? previous?.budget : optional(input.budget),
    rooms: input.rooms === undefined ? previous?.rooms : optional(input.rooms),
    tags: input.tags,
    isFavorite: previous?.isFavorite ?? false,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    photos: previous?.photos || [],
    documents: previous?.documents || [],
    notes: previous?.notes || [],
    source: optional(input.source),
    firstContactDate: optional(input.firstContactDate),
    lastContactDate: input.lastContactDate === undefined ? previous?.lastContactDate : optional(input.lastContactDate),
    nextContactDate: input.nextContactDate === undefined ? previous?.nextContactDate : optional(input.nextContactDate),
    birthDate: optional(input.birthDate),
    birthdayReminder: input.birthdayReminder ?? false,
    contactComment: optional(input.contactComment),
    roles: input.roles,
    status: optional(input.status),
    leadTemperature: input.leadTemperature === undefined ? previous?.leadTemperature : optional(input.leadTemperature),
    description: optional(input.description),
  }
}
