import assert from 'node:assert/strict'
import test from 'node:test'
import { safeExternalUrl } from './safeExternalUrl.ts'

test('allows regular public web links', () => {
  assert.equal(safeExternalUrl('https://example.com/listing?id=1'), 'https://example.com/listing?id=1')
})

test('rejects credentials, scripts and local network links', () => {
  for (const value of ['javascript:alert(1)', 'https://user:pass@example.com', 'http://127.0.0.1/admin', 'http://192.168.1.1', 'http://[::1]/']) {
    assert.equal(safeExternalUrl(value), null)
  }
})
