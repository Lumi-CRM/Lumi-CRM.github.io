import assert from 'node:assert/strict'
import test from 'node:test'
import { inferContactRoles } from './contactRoles.ts'

test('contact roles combine cloud roles with the legacy primary type', () => {
  assert.deepEqual(inferContactRoles({ type: 'seller', roles: ['buyer', 'seller'] }), ['buyer', 'seller'])
})

test('contact roles discard unsupported values and duplicates', () => {
  assert.deepEqual(inferContactRoles({ type: 'buyer', roles: ['tenant', 'tenant', 'admin'] }), ['tenant', 'buyer'])
})
