import type { Property } from '../types'

export type PropertyOwnerRow = {
  id?: string
  property_id: string
  client_id: string
  ownership_share?: number | string | null
  is_primary?: boolean | null
}

export type PropertyOwnerAssignment = {
  id?: string
  clientId: string
  ownershipShare: number | null
  isPrimary: boolean
  roles?: string[]
}

const optionalShare = (value: unknown) => {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const mapPropertyOwnerRow = (row: PropertyOwnerRow): PropertyOwnerAssignment => ({
  id: row.id,
  clientId: row.client_id,
  ownershipShare: optionalShare(row.ownership_share),
  isPrimary: Boolean(row.is_primary),
})

export const normalizePropertyOwners = (owners: PropertyOwnerAssignment[]) => {
  const unique = new Map<string, PropertyOwnerAssignment>()
  for (const owner of owners) {
    const clientId = owner.clientId.trim()
    if (!clientId || unique.has(clientId)) continue
    unique.set(clientId, {
      ...owner,
      clientId,
      ownershipShare: optionalShare(owner.ownershipShare),
      isPrimary: false,
    })
  }

  const result = Array.from(unique.values())
  const primaryIndex = result.findIndex(owner => owners.find(candidate => candidate.clientId.trim() === owner.clientId)?.isPrimary)
  if (result.length) result[primaryIndex >= 0 ? primaryIndex : 0].isPrimary = true
  return result
}

export const propertyOwnersWithLegacyFallback = (
  property: Pick<Property, 'id' | 'ownerId'>,
  owners: PropertyOwnerAssignment[],
) => {
  const normalized = normalizePropertyOwners(owners)
  if (normalized.length || !property.ownerId) return normalized
  return [{ clientId: property.ownerId, ownershipShare: null, isPrimary: true }]
}

export const indexPropertyOwners = (rows: PropertyOwnerRow[]) => {
  const result = new Map<string, PropertyOwnerAssignment[]>()
  for (const row of rows) {
    const owners = result.get(row.property_id) ?? []
    owners.push(mapPropertyOwnerRow(row))
    result.set(row.property_id, owners)
  }
  for (const [propertyId, owners] of result) {
    result.set(propertyId, normalizePropertyOwners(owners).sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary)))
  }
  return result
}

export const makePropertyOwnerRows = (userId: string, propertyId: string, owners: PropertyOwnerAssignment[]) =>
  normalizePropertyOwners(owners).map(owner => ({
    id: owner.id || crypto.randomUUID(),
    user_id: userId,
    property_id: propertyId,
    client_id: owner.clientId,
    ownership_share: owner.ownershipShare,
    is_primary: owner.isPrimary,
    updated_at: new Date().toISOString(),
  }))

export const propertyOwnerShareError = (owners: PropertyOwnerAssignment[]) => {
  const invalid = owners.find(owner => owner.ownershipShare != null && (owner.ownershipShare < 0 || owner.ownershipShare > 100))
  if (invalid) return 'Доля каждого собственника должна быть от 0 до 100%.'
  const total = owners.reduce((sum, owner) => sum + (owner.ownershipShare ?? 0), 0)
  return total > 100 ? 'Сумма долей собственников не может превышать 100%.' : ''
}
