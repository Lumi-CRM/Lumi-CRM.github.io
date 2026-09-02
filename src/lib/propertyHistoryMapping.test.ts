import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPropertyHistoryChange, mapPropertyHistoryRow, propertyStatusLabel } from './propertyHistoryMapping.ts'

test('creates a baseline event for a new property', () => {
  assert.deepEqual(buildPropertyHistoryChange(undefined, { price: 8_300_000, status: 'available' }), {
    kind: 'created', oldPrice: null, newPrice: 8_300_000, oldStatus: null, newStatus: 'available',
  })
})

test('records combined price and stage changes and skips unchanged saves', () => {
  assert.deepEqual(buildPropertyHistoryChange(
    { price: 8_300_000, status: 'available' },
    { price: 8_100_000, status: 'reserved' },
  ), {
    kind: 'price_status', oldPrice: 8_300_000, newPrice: 8_100_000, oldStatus: 'available', newStatus: 'reserved',
  })
  assert.equal(buildPropertyHistoryChange(
    { price: 8_100_000, status: 'reserved' },
    { price: 8_100_000, status: 'reserved' },
  ), null)
})

test('maps numeric cloud values and readable status labels', () => {
  const item = mapPropertyHistoryRow({
    id: 'history-1', property_id: 'property-1', change_type: 'price', old_price: '5000000', new_price: '4900000',
    old_status: 'available', new_status: 'available', source: 'form', created_at: '2026-09-02T10:00:00.000Z',
  })
  assert.equal(item.oldPrice, 5_000_000)
  assert.equal(item.newPrice, 4_900_000)
  assert.equal(propertyStatusLabel(item.newStatus), 'В продаже')
})
