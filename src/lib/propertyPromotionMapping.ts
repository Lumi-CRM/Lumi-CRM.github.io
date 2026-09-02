export type PropertyPromotionAction = 'published' | 'updated' | 'boosted' | 'paused' | 'removed'

export type PropertyPromotionInput = {
  channel: string
  action: PropertyPromotionAction
  date: string
  time: string
  cost: number | null
  url: string
  result: string
  notes: string
}

export type PropertyPromotion = PropertyPromotionInput & {
  id: string
  propertyId: string
  occurredAt: string
}

type CloudRow = Record<string, unknown>

const stringValue = (value: unknown) => typeof value === 'string' ? value : ''

export const promotionActionLabel = (action: PropertyPromotionAction) => ({
  published: 'Размещено',
  updated: 'Обновлено',
  boosted: 'Поднято в выдаче',
  paused: 'Приостановлено',
  removed: 'Снято с публикации',
})[action]

export const mapPropertyPromotionRow = (row: CloudRow): PropertyPromotion => {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as CloudRow : {}
  const action = ['published', 'updated', 'boosted', 'paused', 'removed'].includes(String(metadata.action))
    ? metadata.action as PropertyPromotionAction
    : 'updated'
  const occurredAt = stringValue(row.occurred_at) || stringValue(row.created_at)
  const occurred = new Date(occurredAt)
  const cost = metadata.cost === null || metadata.cost === undefined || metadata.cost === '' ? null : Number(metadata.cost)
  return {
    id: String(row.id),
    propertyId: stringValue(row.property_id),
    channel: stringValue(metadata.channel) || stringValue(row.source),
    action,
    date: Number.isNaN(occurred.getTime()) ? '' : occurredAt.slice(0, 10),
    time: Number.isNaN(occurred.getTime()) ? '' : occurred.toTimeString().slice(0, 5),
    cost: Number.isFinite(cost) ? cost : null,
    url: stringValue(metadata.url),
    result: stringValue(row.outcome),
    notes: stringValue(row.notes),
    occurredAt,
  }
}

export const propertyPromotionFromInput = (id: string, propertyId: string, input: PropertyPromotionInput): PropertyPromotion => ({
  ...input,
  id,
  propertyId,
  occurredAt: new Date(`${input.date}T${input.time || '12:00'}`).toISOString(),
})
