import assert from 'node:assert/strict'
import test from 'node:test'
import { filterRowsForUrl, prepareOfflinePayload } from './offlineTransport.ts'

test('offline cache applies PostgREST filters, sorting and limits', () => {
  const rows = [
    { id: '1', user_id: 'u1', status: 'active', created_at: '2026-08-01' },
    { id: '2', user_id: 'u1', status: 'archived', created_at: '2026-08-03' },
    { id: '3', user_id: 'u1', status: 'active', created_at: '2026-08-02' },
    { id: '4', user_id: 'u2', status: 'active', created_at: '2026-08-04' },
  ]
  const result = filterRowsForUrl(rows, 'https://example.test/rest/v1/properties?user_id=eq.u1&status=eq.active&order=created_at.desc&limit=1')
  assert.deepEqual(result.map(row => row.id), ['3'])
})

test('offline cache excludes archived rows and supports JSON contains filters', () => {
  const rows = [
    { id: '1', status: 'available', metadata: { kind: 'property_showing' } },
    { id: '2', status: 'archived', metadata: { kind: 'property_showing' } },
    { id: '3', status: 'available', metadata: { kind: 'call' } },
  ]
  const result = filterRowsForUrl(rows, 'https://example.test/rest/v1/properties?status=neq.archived&metadata=cs.%7B%22kind%22%3A%22property_showing%22%7D')
  assert.deepEqual(result.map(row => row.id), ['1'])
})

test('offline inserts receive durable client identifiers', () => {
  const prepared = prepareOfflinePayload('properties', { user_id: 'u1', address: 'Курск' }) as Record<string, unknown>
  assert.match(String(prepared.id), /^[0-9a-f-]{36}$/)
  assert.equal(prepared.address, 'Курск')
})

test('offline property shares receive both id and public slug', () => {
  const prepared = prepareOfflinePayload('property_shares', { user_id: 'u1' }) as Record<string, unknown>
  assert.match(String(prepared.id), /^[0-9a-f-]{36}$/)
  assert.match(String(prepared.slug), /^[0-9a-f-]{36}$/)
})
