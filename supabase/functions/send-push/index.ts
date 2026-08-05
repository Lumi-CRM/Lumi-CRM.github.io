import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authorization = request.headers.get('Authorization') ?? ''
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const payload = await request.json() as { title?: string; body?: string; link?: string; type?: string }
    if (!payload.title) return new Response(JSON.stringify({ error: 'title is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: notification, error: notificationError } = await admin.from('notifications').insert({
      user_id: user.id,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      type: payload.type ?? 'system',
    }).select('id').single()
    if (notificationError) throw notificationError

    const { data: subscriptions, error: subscriptionError } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', user.id).eq('enabled', true)
    if (subscriptionError) throw subscriptionError

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@lumicrm.app'
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const message = JSON.stringify({ title: payload.title, body: payload.body, link: payload.link, notificationId: notification.id })
    const results = await Promise.allSettled((subscriptions ?? []).map(subscription => webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, message)))

    const expiredIds = results.flatMap((result, index) => result.status === 'rejected' && [404, 410].includes(Number((result.reason as { statusCode?: number })?.statusCode)) ? [subscriptions![index].id] : [])
    if (expiredIds.length) await admin.from('push_subscriptions').update({ enabled: false }).in('id', expiredIds)

    return new Response(JSON.stringify({ notificationId: notification.id, delivered: results.filter(result => result.status === 'fulfilled').length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Unable to send notification' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
