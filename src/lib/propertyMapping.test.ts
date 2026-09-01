import assert from 'node:assert/strict'
import test from 'node:test'
import { mapClientRow, mapPropertyRow } from './propertyMapping.ts'

test('maps cloud property fields into the application model', () => {
  const property = mapPropertyRow({
    id: 'property-1',
    user_id: 'user-1',
    address: 'Курск',
    price: '9200000',
    status: 'reserved',
    listing_type: 'sale',
    work_stream: 'cold',
    total_floors: 10,
    is_favorite: true,
  })

  assert.equal(property.price, 9_200_000)
  assert.equal(property.workStream, 'cold')
  assert.equal(property.totalFloors, 10)
  assert.equal(property.isFavorite, true)
})

test('maps a client with safe defaults for the property form', () => {
  const client = mapClientRow({ id: 'client-1', user_id: 'user-1', type: 'seller', roles: ['seller', 'landlord'] })

  assert.equal(client.type, 'seller')
  assert.deepEqual(client.roles, ['seller', 'landlord'])
  assert.deepEqual(client.tags, [])
})
