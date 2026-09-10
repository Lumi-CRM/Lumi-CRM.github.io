import assert from 'node:assert/strict'
import test from 'node:test'
import { isExistingEmailSignUp, isTemporarySessionError, loginErrorMessage } from './authGuards.ts'

test('offline session recovery distinguishes network failures from revoked credentials', () => {
  assert.equal(isTemporarySessionError({ name: 'AuthRetryableFetchError' }), true)
  assert.equal(isTemporarySessionError({ status: 503 }), true)
  assert.equal(isTemporarySessionError({ status: 400 }), false)
  assert.equal(isTemporarySessionError({ status: 401 }), false)
  assert.equal(isTemporarySessionError(null), false)
})

test('detects Supabase response for an already registered email', () => {
  assert.equal(isExistingEmailSignUp({ identities: [] }), true)
})

test('accepts a genuinely new identity', () => {
  assert.equal(isExistingEmailSignUp({ identities: [{ id: 'identity-1' }] }), false)
})

test('does not classify an absent user as an existing account', () => {
  assert.equal(isExistingEmailSignUp(null), false)
})

test('shows a credential error only for rejected credentials', () => {
  assert.equal(loginErrorMessage('Invalid login credentials'), 'Неверный логин или пароль')
})

test('does not misreport network failures as a bad password', () => {
  assert.equal(
    loginErrorMessage('Failed to fetch'),
    'Не удалось подключиться к облаку. Проверьте интернет или повторите позже.',
  )
})
