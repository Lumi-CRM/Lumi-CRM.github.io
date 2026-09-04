import assert from 'node:assert/strict'
import test from 'node:test'
import { mapTaskRow, nextRecurringDate, taskFromInput, withoutMissingTaskColumn } from './taskMapping.ts'

test('maps task fields from the cloud model', () => {
  const task = mapTaskRow({
    id: 'task-1',
    user_id: 'user-1',
    title: 'Позвонить',
    status: 'inprogress',
    priority: 'high',
    due_date: '2026-09-02',
    eisenhower_quadrant: 'do',
    recurrence_rule: 'weekly',
    subtasks: [{ id: 's1', title: 'Подготовить документы', completed: true }],
  })
  assert.equal(task.userId, 'user-1')
  assert.equal(task.dueDate, '2026-09-02')
  assert.equal(task.eisenhowerQuadrant, 'do')
  assert.equal(task.recurrenceRule, 'weekly')
  assert.equal(task.subtasks?.[0].completed, true)
})

test('calculates the next recurring task date', () => {
  assert.equal(nextRecurringDate('2026-09-02', 'daily'), '2026-09-03')
  assert.equal(nextRecurringDate('2026-09-02', 'weekly'), '2026-09-09')
  assert.equal(nextRecurringDate('2026-09-02', 'monthly'), '2026-10-02')
  assert.equal(nextRecurringDate('2026-09-02', 'none'), undefined)
})

test('creates an optimistic completed task with the durable id', () => {
  const task = taskFromInput('user-1', 'task-local', {
    title: 'Закрыть сделку',
    description: '',
    status: 'done',
    priority: 'medium',
    smartCriteria: {},
    eisenhowerQuadrant: 'plan',
  })
  assert.equal(task.id, 'task-local')
  assert.equal(task.isCompleted, true)
  assert.ok(task.completedAt)
})

test('removes unsupported task columns for an older Supabase schema', () => {
  const payload = { title: 'Позвонить', parent_task_id: null, subtasks: [] }
  assert.deepEqual(withoutMissingTaskColumn(payload, {
    code: 'PGRST204',
    message: "Could not find the 'parent_task_id' column of 'tasks' in the schema cache",
  }), { title: 'Позвонить', subtasks: [] })
  assert.equal(withoutMissingTaskColumn(payload, { code: '42501', message: 'RLS' }), null)
})
