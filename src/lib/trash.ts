import { supabase } from './supabase'
import { deleteCrmFile, type CrmFileRecord } from './files'

export type TrashTable = 'properties' | 'clients' | 'tasks' | 'events' | 'deals' | 'crm_activities'

export const moveToTrash = async (table: TrashTable, id: string, userId: string) => {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export const restoreFromTrash = async (table: TrashTable, id: string, userId: string) => {
  const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export const deleteForever = async (table: TrashTable, id: string, userId: string) => {
  if (table === 'properties' || table === 'clients') {
    const foreignKey = table === 'properties' ? 'property_id' : 'client_id'
    const { data: files, error: filesError } = await supabase
      .from('crm_files')
      .select('*')
      .eq('user_id', userId)
      .eq(foreignKey, id)
    if (filesError) throw filesError
    for (const file of (files ?? []) as CrmFileRecord[]) await deleteCrmFile(file)
  }
  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export const emptyTrash = async (userId: string) => {
  const tables: TrashTable[] = ['crm_activities', 'deals', 'events', 'tasks', 'properties', 'clients']
  for (const table of tables) {
    const { data, error: loadError } = await supabase
      .from(table)
      .select('id')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
    if (loadError) throw loadError
    for (const record of data ?? []) await deleteForever(table, record.id, userId)
  }
}

export const trashExpiresAt = (deletedAt: string) => new Date(new Date(deletedAt).getTime() + 5 * 24 * 60 * 60 * 1000)
