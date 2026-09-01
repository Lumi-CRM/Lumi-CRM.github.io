import type { Property } from '../types'
import { moveToTrash } from './trash'
import { supabase } from './supabase'
import type { PropertyUpsertInput } from './propertyRecordMapping'

export type PropertyDetailsRecord = Record<string, unknown>

const propertyPayload = (input: PropertyUpsertInput) => ({
  address: input.address.trim(),
  listing_type: input.listingType,
  work_stream: input.workStream,
  property_type: input.propertyType || null,
  source_url: input.sourceUrl || null,
  price: input.price ?? null,
  rooms: input.rooms ?? null,
  area: input.area ?? null,
  floor: input.floor ?? null,
  total_floors: input.totalFloors ?? null,
  status: input.status,
  owner_id: input.ownerId || null,
  tags: input.tags,
  description: input.description || null,
  construction_year: input.constructionYear ?? null,
  repair: input.repair || null,
  balcony: input.balcony,
  elevator: input.elevator,
  parking: input.parking,
  heating: input.heating || null,
  walls: input.walls || null,
  updated_at: new Date().toISOString(),
})

export const fetchPropertyDetails = async (userId: string, propertyId: string) => {
  const { data, error } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_id', propertyId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as PropertyDetailsRecord | null
}

export const saveProperty = async (
  userId: string,
  input: PropertyUpsertInput,
  details: PropertyDetailsRecord,
  propertyId?: string,
  newPropertyId?: string,
  ownerRoles: string[] = [],
) => {
  const id = propertyId || newPropertyId || crypto.randomUUID()
  const payload = propertyPayload(input)
  const result = propertyId
    ? await supabase.from('properties').update(payload).eq('id', propertyId).eq('user_id', userId)
    : await supabase.from('properties').insert({ ...payload, id, user_id: userId, is_favorite: false })
  if (result.error) throw result.error

  const { error: detailsError } = await supabase.from('property_details').upsert({
    ...details,
    property_id: id,
    user_id: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'property_id' })
  if (detailsError) {
    if (!propertyId) await supabase.from('properties').delete().eq('id', id).eq('user_id', userId)
    throw detailsError
  }

  if (input.ownerId) {
    const role = input.listingType === 'rent' ? 'landlord' : 'seller'
    const roles = Array.from(new Set([...ownerRoles, role]))
    const { error: roleError } = await supabase
      .from('clients')
      .update({ roles })
      .eq('id', input.ownerId)
      .eq('user_id', userId)
    if (roleError) console.warn('Owner role update failed:', roleError)
  }
  return id
}

export const setPropertyFavorite = async (userId: string, property: Property) => {
  const isFavorite = !property.isFavorite
  const { error } = await supabase
    .from('properties')
    .update({ is_favorite: isFavorite })
    .eq('id', property.id)
    .eq('user_id', userId)
  if (error) throw error
  return { id: property.id, isFavorite }
}

export const archiveProperty = async (userId: string, propertyId: string) => {
  const { error } = await supabase
    .from('properties')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', propertyId)
    .eq('user_id', userId)
  if (error) throw error
  return propertyId
}

export const trashProperty = async (userId: string, propertyId: string) => {
  await moveToTrash('properties', propertyId, userId)
  return propertyId
}
