import assert from 'node:assert/strict'
import test from 'node:test'
import { validateCrmUpload } from './uploadValidation.ts'

test('accepts expected private documents and property images', () => {
  assert.doesNotThrow(() => validateCrmUpload({ name: 'contract.pdf', size: 1000, type: 'application/pdf' }, 'crm-documents'))
  assert.doesNotThrow(() => validateCrmUpload({ name: 'room.webp', size: 1000, type: 'image/webp' }, 'crm-images'))
})

test('rejects executable web content and misleading images', () => {
  assert.throws(() => validateCrmUpload({ name: 'scan.svg', size: 1000, type: 'image/svg+xml' }, 'crm-images'))
  assert.throws(() => validateCrmUpload({ name: 'photo.jpg', size: 1000, type: 'text/html' }, 'crm-images'))
  assert.throws(() => validateCrmUpload({ name: 'page.html', size: 1000, type: 'text/html' }, 'crm-documents'))
})
