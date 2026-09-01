import assert from 'node:assert/strict'
import test from 'node:test'
import { inferContactRoles } from './contactRoles.ts'
import { contactFromInput } from './contactRecordMapping.ts'

test('contact roles combine cloud roles with the legacy primary type', () => {
  assert.deepEqual(inferContactRoles({ type: 'seller', roles: ['buyer', 'seller'] }), ['buyer', 'seller'])
})

test('contact roles discard unsupported values and duplicates', () => {
  assert.deepEqual(inferContactRoles({ type: 'buyer', roles: ['tenant', 'tenant', 'admin'] }), ['tenant', 'buyer'])
})

test('optimistic contact preserves unrelated fields while applying an owner edit', () => {
  const previous = contactFromInput('user-1', 'client-1', {
    type: 'buyer',
    firstName: 'Анна',
    lastName: 'Иванова',
    phone: '+70000000000',
    propertyType: 'Квартира',
    budget: 8_000_000,
    roles: ['buyer'],
    tags: ['важно'],
  })
  const updated = contactFromInput('user-1', 'client-1', {
    type: 'seller',
    firstName: 'Анна',
    lastName: 'Иванова',
    phone: '+70000000000',
    roles: ['buyer', 'seller'],
    tags: ['важно'],
    status: 'active',
  }, previous)

  assert.equal(updated.budget, 8_000_000)
  assert.equal(updated.propertyType, 'Квартира')
  assert.deepEqual(updated.roles, ['buyer', 'seller'])
  assert.equal(updated.status, 'active')
})
