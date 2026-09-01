import type { Priority, Task, TaskStatus } from '../types'

export type TaskQuadrant = NonNullable<Task['eisenhowerQuadrant']>
export type TaskSmartCriteria = NonNullable<Task['smartCriteria']>

export type TaskUpsertInput = {
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  dueDate?: string
  dueTime?: string
  smartCriteria: TaskSmartCriteria
  eisenhowerQuadrant: TaskQuadrant
}

type CloudTaskRow = Record<string, unknown>

export const mapTaskRow = (row: CloudTaskRow): Task => ({
  id: String(row.id),
  userId: typeof row.user_id === 'string' ? row.user_id : undefined,
  title: typeof row.title === 'string' ? row.title : '',
  description: typeof row.description === 'string' ? row.description : undefined,
  status: row.status === 'inprogress' || row.status === 'done' ? row.status : 'todo',
  priority: row.priority === 'low' || row.priority === 'high' ? row.priority : 'medium',
  dueDate: typeof row.due_date === 'string' ? row.due_date : undefined,
  dueTime: typeof row.due_time === 'string' ? row.due_time : undefined,
  isFavorite: Boolean(row.is_favorite),
  isCompleted: Boolean(row.is_completed),
  createdAt: typeof row.created_at === 'string' ? row.created_at : '',
  completedAt: typeof row.completed_at === 'string' ? row.completed_at : undefined,
  smartCriteria: row.smart_criteria && typeof row.smart_criteria === 'object' ? row.smart_criteria as TaskSmartCriteria : {},
  eisenhowerQuadrant: row.eisenhower_quadrant === 'do' || row.eisenhower_quadrant === 'delegate' || row.eisenhower_quadrant === 'eliminate'
    ? row.eisenhower_quadrant
    : 'plan',
  deletedAt: typeof row.deleted_at === 'string' ? row.deleted_at : undefined,
})

export const taskFromInput = (userId: string, id: string, input: TaskUpsertInput, previous?: Task): Task => ({
  ...previous,
  id,
  userId,
  title: input.title,
  description: input.description || undefined,
  status: input.status,
  priority: input.priority,
  dueDate: input.dueDate,
  dueTime: input.dueTime,
  isFavorite: previous?.isFavorite ?? false,
  isCompleted: input.status === 'done',
  createdAt: previous?.createdAt || new Date().toISOString(),
  completedAt: input.status === 'done' ? previous?.completedAt || new Date().toISOString() : undefined,
  smartCriteria: input.smartCriteria,
  eisenhowerQuadrant: input.eisenhowerQuadrant,
})
