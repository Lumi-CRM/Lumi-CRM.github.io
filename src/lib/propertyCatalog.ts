import type { Client, Property } from '../types'
import { createSignedFileUrls, type CrmFileRecord } from './files'
import { mapClientRow, mapPropertyRow } from './propertyMapping'
import { supabase } from './supabase'

export type PropertyCatalog = {
  properties: Property[]
  clients: Client[]
}

export const fetchPropertyCatalog = async (userId: string): Promise<PropertyCatalog> => {
  const [propertiesResult, clientsResult] = await Promise.all([
    supabase
      .from('properties')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('status', 'archived')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])
  if (propertiesResult.error) throw propertiesResult.error

  const propertyRows = propertiesResult.data || []
  const properties = propertyRows.map(mapPropertyRow)
  const clients = clientsResult.error ? [] : (clientsResult.data || []).map(mapClientRow)
  if (properties.length === 0) return { properties, clients }

  try {
    const { data: mediaRows, error: mediaError } = await supabase
      .from('crm_files')
      .select('*')
      .eq('user_id', userId)
      .eq('bucket', 'crm-images')
      .in('property_id', properties.map(property => property.id))
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
    if (mediaError || !mediaRows?.length) return { properties, clients }

    const covers = new Map<string, CrmFileRecord>()
    for (const file of mediaRows as CrmFileRecord[]) {
      if (file.property_id && !covers.has(file.property_id)) covers.set(file.property_id, file)
    }
    const urls = await createSignedFileUrls(Array.from(covers.values()))
    return {
      clients,
      properties: properties.map(property => {
        const cover = covers.get(property.id)
        return cover ? { ...property, coverUrl: urls.get(cover.storage_path) } : property
      }),
    }
  } catch {
    return { properties, clients }
  }
}
