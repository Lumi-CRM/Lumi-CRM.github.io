import type { Property } from '../types'
import { moveToTrash } from './trash'
import { supabase } from './supabase'
import type { PropertyUpsertInput } from './propertyRecordMapping'
import { makePropertyOwnerRows, normalizePropertyOwners, type PropertyOwnerAssignment } from './propertyOwners'
import { recordPropertyHistory } from './propertyHistory'
import { buildPropertyHistoryChange } from './propertyHistoryMapping'

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

export const replacePropertyOwners = async (
  userId: string,
  propertyId: string,
  owners: PropertyOwnerAssignment[],
) => {
  const normalized = normalizePropertyOwners(owners)
  const { error: deleteError } = await supabase
    .from('property_owners')
    .delete()
    .eq('property_id', propertyId)
    .eq('user_id', userId)
  if (deleteError) throw deleteError
  if (!normalized.length) return []

  const rows = makePropertyOwnerRows(userId, propertyId, normalized)
  const { error: insertError } = await supabase.from('property_owners').insert(rows)
  if (insertError) throw insertError
  return rows
}

export const addPropertyOwner = async (
  userId: string,
  propertyId: string,
  clientId: string,
  isPrimary = false,
) => {
  const { error } = await supabase.from('property_owners').upsert({
    user_id: userId,
    property_id: propertyId,
    client_id: clientId,
    ownership_share: null,
    is_primary: isPrimary,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'property_id,client_id' })
  if (error) throw error
}

export const saveProperty = async (
  userId: string,
  input: PropertyUpsertInput,
  details: PropertyDetailsRecord,
  propertyId?: string,
  newPropertyId?: string,
  owners: PropertyOwnerAssignment[] = [],
  previous?: Pick<Property, 'price' | 'status'>,
) => {
  const id = propertyId || newPropertyId || crypto.randomUUID()
  const normalizedOwners = normalizePropertyOwners(owners)
  const primaryOwner = normalizedOwners.find(owner => owner.isPrimary) || normalizedOwners[0]
  const payload = propertyPayload({ ...input, ownerId: primaryOwner?.clientId || '' })
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

  try {
    await replacePropertyOwners(userId, id, normalizedOwners)
  } catch (ownerError) {
    if (!propertyId) await supabase.from('properties').delete().eq('id', id).eq('user_id', userId)
    throw ownerError
  }

  try {
    await recordPropertyHistory(userId, id, buildPropertyHistoryChange(previous, input), 'form')
  } catch (historyError) {
    console.warn('Property history update failed:', historyError)
  }

  if (normalizedOwners.length) {
    const role = input.listingType === 'rent' ? 'landlord' : 'seller'
    await Promise.all(normalizedOwners.map(async owner => {
      const roles = Array.from(new Set([...(owner.roles || []), role]))
      const { error: roleError } = await supabase
        .from('clients')
        .update({ roles })
        .eq('id', owner.clientId)
        .eq('user_id', userId)
      if (roleError) console.warn('Owner role update failed:', roleError)
    }))
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

export const archiveProperty = async (userId: string, property: Property) => {
  const { error } = await supabase
    .from('properties')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', property.id)
    .eq('user_id', userId)
  if (error) throw error
  try {
    await recordPropertyHistory(userId, property.id, buildPropertyHistoryChange(property, { price: property.price, status: 'archived' }), 'archive')
  } catch (historyError) {
    console.warn('Property history update failed:', historyError)
  }
  return property.id
}

export const trashProperty = async (userId: string, propertyId: string) => {
  await moveToTrash('properties', propertyId, userId)
  return propertyId
}
