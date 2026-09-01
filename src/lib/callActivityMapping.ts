export type CallType = 'cold' | 'warm' | 'inbound' | 'selection'

export interface CallMetadata {
  call_type: CallType
  status: string
  contact_method: string
  contact_name: string
  phone: string
  address: string
  property_type: string
  demand: string
  unsuitable: string
  property_url: string
  area: string
  floor: string
  price: string
  contacted_at: string
  next_contact_at: string
  meeting_at: string
  second_touch_at: string
  second_comment: string
}

export interface WorkCall {
  id: string
  title: string
  occurred_at: string | null
  source: string | null
  outcome: string | null
  notes: string | null
  metadata: Partial<CallMetadata> | null
}

export type CallActivityInput = Omit<WorkCall, 'id'> & { dueAt?: string | null }

type CloudCallRow = Record<string, unknown>

export const mapCallActivityRow = (row: CloudCallRow): WorkCall => ({
  id: String(row.id),
  title: typeof row.title === 'string' ? row.title : '',
  occurred_at: typeof row.occurred_at === 'string' ? row.occurred_at : null,
  source: typeof row.source === 'string' ? row.source : null,
  outcome: typeof row.outcome === 'string' ? row.outcome : null,
  notes: typeof row.notes === 'string' ? row.notes : null,
  metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata as Partial<CallMetadata> : null,
})

export const callFromInput = (id: string, input: CallActivityInput): WorkCall => ({
  id,
  title: input.title,
  occurred_at: input.occurred_at,
  source: input.source,
  outcome: input.outcome,
  notes: input.notes,
  metadata: input.metadata,
})
