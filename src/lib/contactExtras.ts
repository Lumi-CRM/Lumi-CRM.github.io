import { mapContactPointRow, mapContactRelationshipRow, type ContactPointKind } from './contactExtrasMapping'
import { supabase } from './supabase'

export const fetchContactExtras = async (userId: string, clientId: string) => {
  const [points, relationships] = await Promise.all([
    supabase.from('client_contact_points').select('*').eq('user_id', userId).eq('client_id', clientId).order('created_at', { ascending: true }),
    supabase.from('client_relationships').select('*').eq('user_id', userId).or(`source_client_id.eq.${clientId},target_client_id.eq.${clientId}`).order('created_at', { ascending: true }),
  ])
  const error = points.error || relationships.error
  if (error) throw error
  return { points: (points.data || []).map(mapContactPointRow), relationships: (relationships.data || []).map(mapContactRelationshipRow) }
}

export const saveContactPoint = async (userId: string, clientId: string, kind: ContactPointKind, value: string, label: string, newId?: string) => {
  const id = newId || crypto.randomUUID()
  const { error } = await supabase.from('client_contact_points').insert({ id, user_id: userId, client_id: clientId, kind, value: value.trim(), label: label.trim() || null })
  if (error) throw error
  return id
}

export const deleteContactPoint = async (userId: string, id: string) => {
  const { error } = await supabase.from('client_contact_points').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
  return id
}

export const saveContactRelationship = async (userId: string, sourceClientId: string, targetClientId: string, relationship: string, newId?: string) => {
  const id = newId || crypto.randomUUID()
  const { error } = await supabase.from('client_relationships').insert({ id, user_id: userId, source_client_id: sourceClientId, target_client_id: targetClientId, relationship: relationship.trim() })
  if (error) throw error
  return id
}

export const deleteContactRelationship = async (userId: string, id: string) => {
  const { error } = await supabase.from('client_relationships').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
  return id
}
