import assert from 'node:assert/strict'
import test from 'node:test'
import { isExistingEmailSignUp } from './authGuards.ts'

test('detects Supabase response for an already registered email', () => {
  assert.equal(isExistingEmailSignUp({ identities: [] }), true)
})

test('accepts a genuinely new identity', () => {
  assert.equal(isExistingEmailSignUp({ identities: [{ id: 'identity-1' }] }), false)
})

test('does not classify an absent user as an existing account', () => {
  assert.equal(isExistingEmailSignUp(null), false)
})

