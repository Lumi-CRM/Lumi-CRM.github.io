import assert from 'node:assert/strict'
import test from 'node:test'
import { mapArchiveRecords, mapTrashItems } from './recordCollectionMapping.ts'

test('maps archived properties and clients into page models', () => {
  const archive = mapArchiveRecords([
    { id: 'property-1', address: 'Курск, Ленина, 10', price: '5100000', rooms: 2, area: 54, status: 'archived' },
  ], [
    { id: 'client-1', first_name: 'Иван', last_name: 'Иванов', middle_name: 'Иванович', phone: '+70000000000', type: 'seller' },
  ])

  assert.equal(archive.properties[0].price, 5_100_000)
  assert.equal(archive.clients[0].firstName, 'Иван')
  assert.equal(archive.clients[0].lastName, 'Иванов')
})

test('combines trash tables and sorts newest records first', () => {
  const items = mapTrashItems({
    properties: [{ id: 'property-1', address: 'Объект', status: 'available', deleted_at: '2026-08-01T10:00:00Z' }],
    clients: [],
    tasks: [{ id: 'task-1', title: 'Позвонить', due_date: '2026-09-02', deleted_at: '2026-09-01T10:00:00Z' }],
    events: [],
    deals: [],
    activities: [],
  })

  assert.deepEqual(items.map(item => `${item.table}:${item.id}`), ['tasks:task-1', 'properties:property-1'])
  assert.match(items[0].subtitle, /Задача до/)
})
