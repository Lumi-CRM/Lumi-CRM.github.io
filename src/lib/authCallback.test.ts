import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAuthCallbackCredentials } from './authCallback.ts'

test('reads an implicit Supabase session from the callback hash', () => {
  assert.deepEqual(
    parseAuthCallbackCredentials('#access_token=access-123&refresh_token=refresh-456&type=signup'),
    { accessToken: 'access-123', refreshToken: 'refresh-456' },
  )
})

test('ignores incomplete callback hashes', () => {
  assert.equal(parseAuthCallbackCredentials('#access_token=access-123'), null)
  assert.equal(parseAuthCallbackCredentials(''), null)
})
