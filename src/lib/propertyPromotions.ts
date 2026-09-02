import { moveToTrash } from './trash'
import { mapPropertyPromotionRow, propertyPromotionFromInput, promotionActionLabel, type PropertyPromotionInput } from './propertyPromotionMapping'
import { supabase } from './supabase'

export const fetchPropertyPromotions = async (userId: string, propertyId: string) => {
  const { data, error } = await supabase
    .from('crm_activities')
    .select('id,property_id,occurred_at,outcome,notes,source,metadata,created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('property_id', propertyId)
    .eq('type', 'note')
    .contains('metadata', { kind: 'property_promotion' })
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapPropertyPromotionRow)
}

export const savePropertyPromotion = async (userId: string, propertyId: string, input: PropertyPromotionInput, newId?: string) => {
  const id = newId || crypto.randomUUID()
  const promotion = propertyPromotionFromInput(id, propertyId, input)
  const { error } = await supabase.from('crm_activities').insert({
    id,
    user_id: userId,
    property_id: propertyId,
    type: 'note',
    status: 'completed',
    title: `${promotionActionLabel(input.action)}: ${input.channel || 'канал не указан'}`,
    occurred_at: promotion.occurredAt,
    outcome: input.result || null,
    notes: input.notes || null,
    source: input.channel || null,
    metadata: { kind: 'property_promotion', channel: input.channel, action: input.action, cost: input.cost, url: input.url },
    deleted_at: null,
  })
  if (error) throw error
  return promotion
}

export const trashPropertyPromotion = async (userId: string, id: string) => {
  await moveToTrash('crm_activities', id, userId)
  return id
}
