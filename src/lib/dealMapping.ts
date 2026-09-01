import type { Deal } from '../types'
import { indexDealFinance } from './dealFinance.ts'
import { indexDealParticipants, participantIdsWithLegacyFallback, type DealParticipantRow } from './dealParticipants.ts'

export type DealUpsertInput = {
  propertyId: string
  buyerIds: string[]
  ownerIds: string[]
  price?: number
  agencyIncome?: number
  agentIncome?: number
  status: Deal['status']
  notes?: string
}

export type DealRecord = Deal & { financeActivityId?: string }

type CloudRow = Record<string, unknown>
type FinanceRow = CloudRow & { id?: string | null; external_key?: string | null; metadata?: Record<string, unknown> | null }

const optionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const mapDealRows = (
  dealRows: CloudRow[],
  financeRows: FinanceRow[],
  participantRows: DealParticipantRow[],
): DealRecord[] => {
  const financeByDeal = indexDealFinance(financeRows)
  const financeIds = new Map(financeRows.flatMap(row => {
    const key = typeof row.external_key === 'string' ? row.external_key.replace(/^deal-finance:/, '') : ''
    return key && row.id ? [[key, String(row.id)] as const] : []
  }))
  const participantsByDeal = indexDealParticipants(participantRows)

  return dealRows.map(row => {
    const id = String(row.id)
    const participants = participantsByDeal.get(id)
    const buyerIds = participantIdsWithLegacyFallback(participants?.buyerIds, typeof row.buyer_id === 'string' ? row.buyer_id : undefined)
    const ownerIds = participantIdsWithLegacyFallback(participants?.ownerIds)
    return {
      id,
      userId: typeof row.user_id === 'string' ? row.user_id : undefined,
      propertyId: typeof row.property_id === 'string' ? row.property_id : '',
      buyerId: buyerIds[0],
      buyerIds,
      ownerId: ownerIds[0],
      ownerIds,
      price: optionalNumber(row.price),
      agencyIncome: financeByDeal.get(id)?.agencyIncome,
      agentIncome: financeByDeal.get(id)?.agentIncome,
      financeActivityId: financeIds.get(id),
      status: row.status === 'pending' || row.status === 'closed' || row.status === 'cancelled' ? row.status : 'active',
      notes: typeof row.notes === 'string' ? row.notes : undefined,
      createdAt: typeof row.created_at === 'string' ? row.created_at : '',
      updatedAt: typeof row.updated_at === 'string' ? row.updated_at : typeof row.created_at === 'string' ? row.created_at : '',
    }
  })
}

export const dealFromInput = (
  userId: string,
  id: string,
  financeActivityId: string,
  input: DealUpsertInput,
  previous?: DealRecord,
): DealRecord => ({
  ...previous,
  id,
  userId,
  propertyId: input.propertyId,
  buyerId: input.buyerIds[0],
  buyerIds: input.buyerIds,
  ownerId: input.ownerIds[0],
  ownerIds: input.ownerIds,
  price: input.price,
  agencyIncome: input.agencyIncome,
  agentIncome: input.agentIncome,
  financeActivityId,
  status: input.status,
  notes: input.notes,
  createdAt: previous?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})
