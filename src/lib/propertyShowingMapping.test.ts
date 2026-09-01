import assert from 'node:assert/strict'
import test from 'node:test'
import { mapPropertyShowingRow, propertyShowingFromInput, type PropertyShowingInput } from './propertyShowingMapping.ts'

const input: PropertyShowingInput = {
  visitorName: 'Анна',
  phone: '79000000000',
  source: 'Авито',
  date: '2026-09-01',
  time: '12:30',
  outcome: 'Показ состоялся',
  reaction: 'Понравилась кухня',
  interest: 'Думает',
  priceFeedback: 'Высоковата',
  objections: 'Нет парковки',
  nextStep: 'Позвонить завтра',
  nextContactAt: '2026-09-02T10:00',
  comments: 'Пришла с супругом',
}

test('creates an optimistic showing with a durable id and metadata', () => {
  const showing = propertyShowingFromInput('showing-1', 'property-1', input)
  assert.equal(showing.id, 'showing-1')
  assert.equal(showing.propertyId, 'property-1')
  assert.equal(showing.metadata.kind, 'property_showing')
  assert.equal(showing.metadata.visitor_name, 'Анна')
  assert.match(showing.occurredAt, /^2026-09-01T/)
})

test('maps a cloud showing with safe empty values', () => {
  const showing = mapPropertyShowingRow({
    id: 'showing-2',
    property_id: 'property-2',
    occurred_at: '2026-09-01T09:00:00Z',
    metadata: { kind: 'property_showing', visitor_name: 'Иван' },
  })
  assert.equal(showing.metadata.visitor_name, 'Иван')
  assert.equal(showing.metadata.phone, '')
  assert.equal(showing.outcome, '')
})
