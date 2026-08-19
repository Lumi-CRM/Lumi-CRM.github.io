import assert from 'node:assert/strict'
import test from 'node:test'
import { calculatePlanProgress } from './planProgress.ts'

test('marks a zero target as not planned', () => {
  assert.deepEqual(calculatePlanProgress(0, 0), {
    percent: null,
    barPercent: 0,
    label: 'Не запланировано',
  })
})

test('keeps the real percentage while limiting only the progress bar', () => {
  assert.deepEqual(calculatePlanProgress(8_300_000, 200_000), {
    percent: 4150,
    barPercent: 100,
    label: '4150%',
  })
})

test('rounds regular completion to the nearest percentage', () => {
  assert.deepEqual(calculatePlanProgress(1, 120), {
    percent: 1,
    barPercent: 1,
    label: '1%',
  })
})
