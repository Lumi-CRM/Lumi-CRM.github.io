import assert from 'node:assert/strict'
import test from 'node:test'
import { mapTaskRow, taskFromInput } from './taskMapping.ts'

test('maps task fields from the cloud model', () => {
  const task = mapTaskRow({
    id: 'task-1',
    user_id: 'user-1',
    title: 'Позвонить',
    status: 'inprogress',
    priority: 'high',
    due_date: '2026-09-02',
    eisenhower_quadrant: 'do',
  })
  assert.equal(task.userId, 'user-1')
  assert.equal(task.dueDate, '2026-09-02')
  assert.equal(task.eisenhowerQuadrant, 'do')
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
