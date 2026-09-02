import assert from 'node:assert/strict'
import test from 'node:test'
import { mapContactPointRow, mapContactRelationshipRow } from './contactExtrasMapping.ts'

test('maps additional contact point', () => {
  const point = mapContactPointRow({ id: 'point-1', client_id: 'client-1', kind: 'email', label: 'Рабочая', value: 'agent@example.com' })
  assert.equal(point.kind, 'email')
  assert.equal(point.value, 'agent@example.com')
})

test('maps relationship between two clients', () => {
  const relation = mapContactRelationshipRow({ id: 'relation-1', source_client_id: 'client-1', target_client_id: 'client-2', relationship: 'Супруг' })
  assert.equal(relation.targetClientId, 'client-2')
  assert.equal(relation.relationship, 'Супруг')
})
