import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { supabase } from './supabase'

type ReminderSource = {
  sourceType: 'task' | 'event'
  sourceId: string
  title: string
  body: string
  route: string
  dueAt: Date
}

const OFFSETS = [1440, 60, 5, 0] as const
const ID_MODULO = 2_000_000_000

const notificationId = (sourceType: string, sourceId: string, minutes: number) => {
  let hash = 2166136261
  const input = `${sourceType}:${sourceId}:${minutes}`
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % ID_MODULO || 1
}

const reminderSuffix = (minutes: number) => minutes === 1440
  ? 'за день'
  : minutes === 60
    ? 'за час'
    : minutes === 5
      ? 'за 5 минут'
      : 'сейчас'

export const requestNativeNotificationPermission = async () => {
  if (!Capacitor.isNativePlatform()) return false
  let permission = await LocalNotifications.checkPermissions()
  if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
    permission = await LocalNotifications.requestPermissions()
  }
  return permission.display === 'granted'
}

export const syncNativeReminders = async (userId: string) => {
  if (!Capacitor.isNativePlatform() || !userId) return
  const granted = await requestNativeNotificationPermission()
  if (!granted) return

  const [tasksResult, eventsResult] = await Promise.all([
    supabase.from('tasks').select('id,title,description,due_date,due_time,status,is_completed').eq('user_id', userId).eq('is_completed', false).neq('status', 'done').not('due_date', 'is', null).not('due_time', 'is', null),
    supabase.from('events').select('id,type,title,event_date,event_time,location,notes,is_completed').eq('user_id', userId).eq('is_completed', false).not('event_time', 'is', null),
  ])
  if (tasksResult.error || eventsResult.error) return

  const sources: ReminderSource[] = [
    ...(tasksResult.data ?? []).map(task => ({
      sourceType: 'task' as const,
      sourceId: task.id,
      title: `Задача: ${task.title}`,
      body: task.description || 'Пришло время выполнить задачу',
      route: '/tasks',
      dueAt: new Date(`${task.due_date}T${String(task.due_time).slice(0, 8)}`),
    })),
    ...(eventsResult.data ?? []).map(event => ({
      sourceType: 'event' as const,
      sourceId: event.id,
      title: `${event.type === 'call' ? 'Звонок' : 'Встреча'}: ${event.title}`,
      body: event.location || event.notes || 'Запланированное событие LumiCRM',
      route: event.type === 'call' ? '/calls' : '/calendar',
      dueAt: new Date(`${event.event_date}T${String(event.event_time).slice(0, 8)}`),
    })),
  ].filter(source => !Number.isNaN(source.dueAt.getTime()))

  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(item => ({ id: item.id })) })
  }

  const now = Date.now()
  const notifications = sources.flatMap(source => OFFSETS.flatMap(minutes => {
    const at = new Date(source.dueAt.getTime() - minutes * 60_000)
    if (at.getTime() <= now + 1_000) return []
    return [{
      id: notificationId(source.sourceType, source.sourceId, minutes),
      title: source.title,
      body: `${source.body} · напоминание ${reminderSuffix(minutes)}`,
      schedule: { at, allowWhileIdle: true },
      extra: { route: source.route, sourceType: source.sourceType, sourceId: source.sourceId },
    }]
  }))

  for (let start = 0; start < notifications.length; start += 48) {
    await LocalNotifications.schedule({ notifications: notifications.slice(start, start + 48) })
  }
}

export const installNativeNotificationHandlers = async () => {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.addListener('localNotificationActionPerformed', action => {
    const route = action.notification.extra?.route
    if (typeof route === 'string' && route.startsWith('/')) window.location.assign(route)
  })
}
