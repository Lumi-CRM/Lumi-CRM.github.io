import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyPlanTargets, mapMonthlyPlanRow, monthlyPlanFromInput } from './monthlyPlanMapping.ts'

test('normalizes missing monthly plan metrics and five weeks', () => {
  const plan = mapMonthlyPlanRow({
    id: 'plan-1',
    user_id: 'user-1',
    title: 'Сентябрь',
    starts_on: '2026-09-01',
    ends_on: '2026-09-30',
    targets: { coldCalls: 120 },
    weekly_targets: [{ coldCalls: 25 }],
  })

  assert.equal(plan.targets.coldCalls, 120)
  assert.equal(plan.targets.meetings, 0)
  assert.equal(plan.weeklyActuals.length, 5)
  assert.equal(plan.weeklyActuals[0].coldCalls, 25)
  assert.equal(plan.weeklyActuals[4].coldCalls, 0)
})

test('creates optimistic plan while preserving zero values', () => {
  const targets = emptyPlanTargets()
  targets.meetings = 10
  const plan = monthlyPlanFromInput('user-1', 'plan-1', {
    title: 'План на месяц',
    startsOn: '2026-09-01',
    endsOn: '2026-09-30',
    targets,
    weeklyActuals: Array.from({ length: 5 }, emptyPlanTargets),
  })

  assert.equal(plan.id, 'plan-1')
  assert.equal(plan.targets.meetings, 10)
  assert.equal(plan.weeklyActuals[2].meetings, 0)
})
