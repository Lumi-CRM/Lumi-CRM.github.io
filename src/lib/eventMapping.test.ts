import assert from 'node:assert/strict'
import test from 'node:test'
import { eventFromInput, mapEventRow } from './eventMapping.ts'

test('maps calendar fields from the cloud model', () => {
  const event = mapEventRow({
    id: 'event-1',
    user_id: 'user-1',
    type: 'meeting',
    title: 'Показ квартиры',
    event_date: '2026-09-03',
    event_time: '14:30:00',
    related_client_type: 'buyer',
  })
  assert.equal(event.eventDate, '2026-09-03')
  assert.equal(event.eventTime, '14:30:00')
  assert.equal(event.relatedClientType, 'buyer')
})

test('removes meeting-only fields when a call is saved', () => {
  const event = eventFromInput('user-1', 'event-local', {
    type: 'call',
    title: 'Позвонить',
    eventDate: '2026-09-03',
    location: 'Офис',
    relatedPropertyId: 'property-1',
  })
  assert.equal(event.location, undefined)
  assert.equal(event.relatedPropertyId, undefined)
})
