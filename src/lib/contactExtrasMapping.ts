export type ContactPointKind = 'phone' | 'email'

export type ContactPoint = {
  id: string
  clientId: string
  kind: ContactPointKind
  label: string
  value: string
  createdAt: string
}

export type ContactRelationship = {
  id: string
  sourceClientId: string
  targetClientId: string
  relationship: string
  createdAt: string
}

type CloudRow = Record<string, unknown>
const stringValue = (value: unknown) => typeof value === 'string' ? value : ''

export const mapContactPointRow = (row: CloudRow): ContactPoint => ({
  id: String(row.id),
  clientId: stringValue(row.client_id),
  kind: row.kind === 'email' ? 'email' : 'phone',
  label: stringValue(row.label),
  value: stringValue(row.value),
  createdAt: stringValue(row.created_at),
})

export const mapContactRelationshipRow = (row: CloudRow): ContactRelationship => ({
  id: String(row.id),
  sourceClientId: stringValue(row.source_client_id),
  targetClientId: stringValue(row.target_client_id),
  relationship: stringValue(row.relationship),
  createdAt: stringValue(row.created_at),
})
