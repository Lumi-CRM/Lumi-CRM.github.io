import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface NotificationJob {
  id: string
  user_id: string
  preference_key: 'taskReminders' | 'callReminders' | 'meetingReminders'
  reminder_minutes: 1440 | 60 | 5 | 0
  due_at: string
  title: string
  body: string | null
  link: string
  attempts: number
}

const jsonHeaders = { 'Content-Type': 'application/json' }
const reminderText = (minutes: number) => minutes === 1440
  ? 'за день'
  : minutes === 60
    ? 'за час'
    : minutes === 5
      ? 'за 5 минут'
      : 'сейчас'

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:denzotrail@gmail.com'
  const admin = createClient(supabaseUrl, serviceKey)

  const { data, error: claimError } = await admin.rpc('claim_due_notification_jobs', { p_limit: 100 })
  if (claimError) return new Response(JSON.stringify({ error: claimError.message }), { status: 500, headers: jsonHeaders })
  const jobs = (data ?? []) as NotificationJob[]
  if (!jobs.length) return new Response(JSON.stringify({ claimed: 0, sent: 0 }), { headers: jsonHeaders })

  if (publicKey && privateKey) webpush.setVapidDetails(subject, publicKey, privateKey)
  const userIds = [...new Set(jobs.map(job => job.user_id))]
  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    admin.from('profiles').select('id,notification_preferences').in('id', userIds),
    admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', userIds).eq('enabled', true),
  ])
  const preferences = new Map((profiles ?? []).map(profile => [profile.id, profile.notification_preferences ?? {}]))
  const subscriptionsByUser = new Map<string, typeof subscriptions>()
  for (const subscription of subscriptions ?? []) {
    const current = subscriptionsByUser.get(subscription.user_id) ?? []
    current.push(subscription)
    subscriptionsByUser.set(subscription.user_id, current)
  }

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const job of jobs) {
    try {
      const userPreferences = preferences.get(job.user_id) as Record<string, boolean> | undefined
      if (userPreferences?.enabled === false || userPreferences?.[job.preference_key] === false) {
        await admin.from('notification_jobs').update({ status: 'skipped', sent_at: new Date().toISOString(), locked_at: null }).eq('id', job.id)
        skipped += 1
        continue
      }

      const body = `${job.body ?? 'Запланированное действие'} · напоминание ${reminderText(job.reminder_minutes)}`
      const { data: notification, error: notificationError } = await admin.from('notifications').upsert({
        user_id: job.user_id,
        type: 'reminder',
        title: job.title,
        body,
        link: job.link,
        reminder_job_id: job.id,
        data: { due_at: job.due_at, reminder_minutes: job.reminder_minutes },
      }, { onConflict: 'reminder_job_id' }).select('id').single()
      if (notificationError) throw notificationError

      const targets = subscriptionsByUser.get(job.user_id) ?? []
      if (targets.length && publicKey && privateKey) {
        const payload = JSON.stringify({
          title: job.title,
          body,
          link: job.link,
          notificationId: notification.id,
          tag: `lumicrm-${job.id}`,
          timestamp: new Date(job.due_at).getTime(),
          requireInteraction: job.reminder_minutes === 0,
        })
        const results = await Promise.allSettled(targets.map(subscription => webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, payload)))
        const expiredIds = results.flatMap((result, index) => result.status === 'rejected' && [404, 410].includes(Number((result.reason as { statusCode?: number })?.statusCode)) ? [targets[index].id] : [])
        if (expiredIds.length) await admin.from('push_subscriptions').update({ enabled: false }).in('id', expiredIds)
      }

      await admin.from('notification_jobs').update({ status: 'sent', sent_at: new Date().toISOString(), locked_at: null, last_error: null }).eq('id', job.id)
      sent += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await admin.from('notification_jobs').update({
        status: job.attempts >= 5 ? 'failed' : 'pending',
        locked_at: null,
        last_error: message.slice(0, 500),
      }).eq('id', job.id)
      failed += 1
    }
  }

  return new Response(JSON.stringify({ claimed: jobs.length, sent, skipped, failed }), { headers: jsonHeaders })
})

