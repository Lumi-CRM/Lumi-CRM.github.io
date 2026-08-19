import assert from 'node:assert/strict'
import test from 'node:test'
import { indexDealParticipants, makeDealParticipantRows, participantIdsWithLegacyFallback } from './dealParticipants.ts'

test('indexes several buyers and owners for one deal without duplicates', () => {
  const indexed = indexDealParticipants([
    { deal_id: 'deal-1', client_id: 'buyer-1', role: 'buyer' },
    { deal_id: 'deal-1', client_id: 'buyer-2', role: 'buyer' },
    { deal_id: 'deal-1', client_id: 'buyer-2', role: 'buyer' },
    { deal_id: 'deal-1', client_id: 'owner-1', role: 'owner' },
  ])

  assert.deepEqual(indexed.get('deal-1'), {
    buyerIds: ['buyer-1', 'buyer-2'],
    ownerIds: ['owner-1'],
  })
})

test('preserves the legacy participant when a deal has no join rows yet', () => {
  assert.deepEqual(participantIdsWithLegacyFallback([], 'legacy-client'), ['legacy-client'])
  assert.deepEqual(participantIdsWithLegacyFallback(['saved-client'], 'legacy-client'), ['saved-client'])
})

test('creates normalized participant rows for cloud and offline storage', () => {
  assert.deepEqual(makeDealParticipantRows('user-1', 'deal-1', ['buyer-1', 'buyer-1'], ['owner-1', 'owner-2']), [
    { user_id: 'user-1', deal_id: 'deal-1', client_id: 'buyer-1', role: 'buyer' },
    { user_id: 'user-1', deal_id: 'deal-1', client_id: 'owner-1', role: 'owner' },
    { user_id: 'user-1', deal_id: 'deal-1', client_id: 'owner-2', role: 'owner' },
  ])
})
