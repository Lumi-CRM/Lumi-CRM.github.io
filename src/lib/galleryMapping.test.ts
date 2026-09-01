import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPropertyFolders } from './galleryMapping.ts'

test('builds gallery folders and counts only linked images', () => {
  const folders = buildPropertyFolders([
    { id: 'property-1', address: 'Ленина, 1', created_at: '2026-08-01T10:00:00Z' },
    { id: 'property-2', address: null, created_at: null },
  ], [
    { property_id: 'property-1' },
    { property_id: 'property-1' },
    { property_id: null },
  ])

  assert.equal(folders[0].imageCount, 2)
  assert.equal(folders[1].imageCount, 0)
  assert.equal(folders[1].address, 'Объект без адреса')
})
