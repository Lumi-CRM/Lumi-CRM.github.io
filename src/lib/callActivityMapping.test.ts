import assert from 'node:assert/strict'
import test from 'node:test'
import { callFromInput, mapCallActivityRow } from './callActivityMapping.ts'

test('maps a completed call activity', () => {
  const call = mapCallActivityRow({
    id: 'call-1',
    title: 'Иван',
    occurred_at: '2026-09-01T10:00:00Z',
    metadata: { call_type: 'cold', phone: '+70000000000' },
  })
  assert.equal(call.metadata?.call_type, 'cold')
  assert.equal(call.metadata?.phone, '+70000000000')
})

test('keeps the optimistic call id and details', () => {
  const call = callFromInput('call-local', {
    title: 'Анна',
    occurred_at: null,
    source: 'Авито',
    outcome: null,
    notes: null,
    metadata: { call_type: 'inbound' },
  })
  assert.equal(call.id, 'call-local')
  assert.equal(call.source, 'Авито')
})
