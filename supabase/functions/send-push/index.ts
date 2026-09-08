import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const isAllowedPushEndpoint = (endpoint: unknown): endpoint is string => {
  if (typeof endpoint !== 'string' || endpoint.length > 4096) return false
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return false
    const host = url.hostname.toLowerCase()
    return host === 'fcm.googleapis.com' || host === 'push.services.mozilla.com'
      || host.endsWith('.push.services.mozilla.com') || host === 'web.push.apple.com'
      || host.endsWith('.notify.windows.com')
  } catch { return false }
}

const validInternalLink = (value: unknown): value is string => typeof value === 'string'
  && value.length <= 512 && /^\/(?!\/)/.test(value) && !/[\\\u0000-\u0020]/.test(value)

const readSmallJson = async (request: Request, maximumBytes = 8192): Promise<Record<string, unknown>> => {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('JSON body required')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('JSON body required')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximumBytes) { await reader.cancel(); throw new Error('Request body too large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const combined = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length }
  const data: unknown = JSON.parse(new TextDecoder().decode(combined))
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('JSON object required')
  return data as Record<string, unknown>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authorization = request.headers.get('Authorization') ?? ''
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    let payload: Record<string, unknown>
    try {
      payload = await readSmallJson(request)
      if (typeof payload.title !== 'string' || !payload.title.trim() || payload.title.length > 160
        || (payload.body != null && (typeof payload.body !== 'string' || payload.body.length > 1500))
        || (payload.link != null && !validInternalLink(payload.link))) throw new Error('Invalid notification')
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid notification payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: allowed, error: limitError } = await admin.rpc('claim_push_send', { p_user_id: user.id })
    if (limitError) throw limitError
    if (!allowed) return new Response(JSON.stringify({ error: 'Too many notifications' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } })
    const { data: notification, error: notificationError } = await admin.from('notifications').insert({
      user_id: user.id,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      type: 'system',
    }).select('id').single()
    if (notificationError) throw notificationError

    const { data: subscriptions, error: subscriptionError } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', user.id).eq('enabled', true).limit(20)
    if (subscriptionError) throw subscriptionError

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@lumicrm.app'
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const message = JSON.stringify({ title: payload.title, body: payload.body, link: payload.link, notificationId: notification.id })
    const targets = (subscriptions ?? []).filter(subscription => isAllowedPushEndpoint(subscription.endpoint))
    const results = await Promise.allSettled(targets.map(subscription => webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, message, { timeout: 5000 })))

    const expiredIds = results.flatMap((result, index) => result.status === 'rejected' && [404, 410].includes(Number((result.reason as { statusCode?: number })?.statusCode)) ? [targets[index].id] : [])
    if (expiredIds.length) await admin.from('push_subscriptions').update({ enabled: false }).in('id', expiredIds)

    return new Response(JSON.stringify({ notificationId: notification.id, delivered: results.filter(result => result.status === 'fulfilled').length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch {
    console.error('Unable to send notification')
    return new Response(JSON.stringify({ error: 'Unable to send notification' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
