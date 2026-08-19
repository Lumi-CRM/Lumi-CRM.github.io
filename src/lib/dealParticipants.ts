export type DealParticipantRole = 'buyer' | 'owner'

export type DealParticipantRow = {
  deal_id: string
  client_id: string
  role: DealParticipantRole
}

export type DealParticipantGroup = {
  buyerIds: string[]
  ownerIds: string[]
}

const uniqueIds = (ids: Array<string | null | undefined>) => [...new Set(ids.filter((id): id is string => Boolean(id)))]

export const indexDealParticipants = (rows: DealParticipantRow[]) => {
  const result = new Map<string, DealParticipantGroup>()
  for (const row of rows) {
    const group = result.get(row.deal_id) ?? { buyerIds: [], ownerIds: [] }
    const key = row.role === 'buyer' ? 'buyerIds' : 'ownerIds'
    group[key] = uniqueIds([...group[key], row.client_id])
    result.set(row.deal_id, group)
  }
  return result
}

export const participantIdsWithLegacyFallback = (ids: string[] | undefined, legacyId?: string) => {
  const savedIds = uniqueIds(ids ?? [])
  return savedIds.length > 0 ? savedIds : uniqueIds([legacyId])
}

export const makeDealParticipantRows = (userId: string, dealId: string, buyerIds: string[], ownerIds: string[]) => [
  ...uniqueIds(buyerIds).map(clientId => ({ user_id: userId, deal_id: dealId, client_id: clientId, role: 'buyer' as const })),
  ...uniqueIds(ownerIds).map(clientId => ({ user_id: userId, deal_id: dealId, client_id: clientId, role: 'owner' as const })),
]
