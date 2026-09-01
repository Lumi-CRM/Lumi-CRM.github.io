export type ShowingMetadata = {
  kind: 'property_showing'
  visitor_name: string
  phone: string
  attraction_source: string
  reaction: string
  interest: string
  price_feedback: string
  objections: string
  next_step: string
  next_contact_at: string
}

export type PropertyShowing = {
  id: string
  propertyId: string
  occurredAt: string
  outcome: string
  notes: string
  metadata: ShowingMetadata
}

export type PropertyShowingInput = {
  visitorName: string
  phone: string
  source: string
  date: string
  time: string
  outcome: string
  reaction: string
  interest: string
  priceFeedback: string
  objections: string
  nextStep: string
  nextContactAt: string
  comments: string
}

type CloudRow = Record<string, unknown>

const stringValue = (value: unknown) => typeof value === 'string' ? value : ''

export const mapPropertyShowingRow = (row: CloudRow): PropertyShowing => {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as CloudRow : {}
  return {
    id: String(row.id),
    propertyId: stringValue(row.property_id),
    occurredAt: stringValue(row.occurred_at),
    outcome: stringValue(row.outcome),
    notes: stringValue(row.notes),
    metadata: {
      kind: 'property_showing',
      visitor_name: stringValue(metadata.visitor_name),
      phone: stringValue(metadata.phone),
      attraction_source: stringValue(metadata.attraction_source),
      reaction: stringValue(metadata.reaction),
      interest: stringValue(metadata.interest),
      price_feedback: stringValue(metadata.price_feedback),
      objections: stringValue(metadata.objections),
      next_step: stringValue(metadata.next_step),
      next_contact_at: stringValue(metadata.next_contact_at),
    },
  }
}

export const propertyShowingFromInput = (id: string, propertyId: string, input: PropertyShowingInput): PropertyShowing => ({
  id,
  propertyId,
  occurredAt: new Date(`${input.date}T${input.time || '12:00'}`).toISOString(),
  outcome: input.outcome,
  notes: input.comments,
  metadata: {
    kind: 'property_showing',
    visitor_name: input.visitorName,
    phone: input.phone,
    attraction_source: input.source,
    reaction: input.reaction,
    interest: input.interest,
    price_feedback: input.priceFeedback,
    objections: input.objections,
    next_step: input.nextStep,
    next_contact_at: input.nextContactAt,
  },
})
