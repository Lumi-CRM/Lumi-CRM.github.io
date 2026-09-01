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

test('maps a complete client record with safe defaults', () => {
  const client = mapClientRow({
    id: 'client-1',
    user_id: 'user-1',
    type: 'seller',
    roles: ['seller', 'landlord'],
    budget: '7300000',
    rooms: '2',
    source: 'Рекомендация',
    birth_date: '1990-04-10',
    birthday_reminder: true,
    lead_temperature: 'warm',
  })

  assert.equal(client.type, 'seller')
  assert.deepEqual(client.roles, ['seller', 'landlord'])
  assert.equal(client.budget, 7_300_000)
  assert.equal(client.rooms, 2)
  assert.equal(client.source, 'Рекомендация')
  assert.equal(client.birthDate, '1990-04-10')
  assert.equal(client.birthdayReminder, true)
  assert.equal(client.leadTemperature, 'warm')
  assert.deepEqual(client.tags, [])
})

test('keeps explicit contact roles distinct and falls back to the legacy type', () => {
  const tenant = mapClientRow({ id: 'tenant-1', user_id: 'user-1', type: 'buyer', roles: ['tenant'] })
  const legacyBuyer = mapClientRow({ id: 'buyer-1', user_id: 'user-1', type: 'buyer' })

  assert.deepEqual(tenant.roles, ['tenant'])
  assert.deepEqual(legacyBuyer.roles, ['buyer'])
})
