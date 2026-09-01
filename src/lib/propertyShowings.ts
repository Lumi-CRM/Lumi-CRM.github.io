import { moveToTrash } from './trash'
import { mapPropertyShowingRow, propertyShowingFromInput, type PropertyShowingInput } from './propertyShowingMapping'
import { supabase } from './supabase'

export const fetchPropertyShowings = async (userId: string, propertyId: string) => {
  const { data, error } = await supabase
    .from('crm_activities')
    .select('id,property_id,occurred_at,outcome,notes,metadata')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('property_id', propertyId)
    .eq('type', 'meeting')
    .contains('metadata', { kind: 'property_showing' })
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapPropertyShowingRow)
}

export const savePropertyShowing = async (
  userId: string,
  propertyId: string,
  input: PropertyShowingInput,
  newShowingId?: string,
) => {
  const id = newShowingId || crypto.randomUUID()
  const showing = propertyShowingFromInput(id, propertyId, input)
  const { error } = await supabase.from('crm_activities').insert({
    id,
    user_id: userId,
    property_id: propertyId,
    type: 'meeting',
    status: 'completed',
    title: `Показ: ${input.visitorName || 'посетитель'}`,
    occurred_at: showing.occurredAt,
    due_at: input.nextContactAt ? new Date(input.nextContactAt).toISOString() : null,
    outcome: input.outcome,
    notes: input.comments || null,
    source: input.source || null,
    metadata: showing.metadata,
    deleted_at: null,
  })
  if (error) throw error
  return showing
}

export const trashPropertyShowing = async (userId: string, showingId: string) => {
  await moveToTrash('crm_activities', showingId, userId)
  return showingId
}
