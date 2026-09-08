import assert from 'node:assert/strict'
import test from 'node:test'
import { readAllPages } from './pagination.ts'

test('loads a 25000-row workspace without silent truncation when the server caps pages', async () => {
  const source = Array.from({ length: 25_000 }, (_, id) => ({ id }))
  let calls = 0
  const result = await readAllPages((from, to) => {
    calls += 1
    const serverCap = 137
    return Promise.resolve({ data: source.slice(from, Math.min(to + 1, from + serverCap)), error: null, count: source.length })
  }, { pageSize: 500, key: row => row.id })
  assert.equal(result.data.length, source.length)
  assert.equal(result.data.at(-1)?.id, 24_999)
  assert.ok(calls > 100)
})

test('stops instead of silently merging duplicate pages', async () => {
  await assert.rejects(() => readAllPages(() => Promise.resolve({ data: [{ id: 1 }], error: null }), {
    pageSize: 1,
    maxRows: 10,
    key: row => row.id,
  }), /изменился во время загрузки/)
})
