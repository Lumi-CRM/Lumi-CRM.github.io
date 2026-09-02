import {
  mapPropertyHistoryRow,
  type PropertyHistoryChange,
  type PropertyHistoryItem,
  type PropertyHistoryRow,
} from './propertyHistoryMapping'
import { supabase } from './supabase'

export const fetchPropertyHistory = async (userId: string, propertyId: string): Promise<PropertyHistoryItem[]> => {
  const { data, error } = await supabase
    .from('property_history')
    .select('id,property_id,change_type,old_price,new_price,old_status,new_status,source,created_at')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data || []) as PropertyHistoryRow[]).map(mapPropertyHistoryRow)
}

export const recordPropertyHistory = async (
  userId: string,
  propertyId: string,
  change: PropertyHistoryChange | null,
  source: 'form' | 'archive' | 'restore' | 'contact' = 'form',
) => {
  if (!change) return null
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    property_id: propertyId,
    change_type: change.kind,
    old_price: change.oldPrice,
    new_price: change.newPrice,
    old_status: change.oldStatus,
    new_status: change.newStatus,
    source,
    created_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('property_history').insert(row)
  if (error) throw error
  return mapPropertyHistoryRow(row)
}
