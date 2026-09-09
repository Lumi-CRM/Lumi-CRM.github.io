import assert from 'node:assert/strict'
import test from 'node:test'
import { IDBFactory } from 'fake-indexeddb'

const jwtFor = (userId: string) => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode({ sub: userId })}.signature`
}

test('a queued call remains visible after a reload and is replayed once', async () => {
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })

  const userId = '00000000-0000-4000-8000-000000000001'
  const rows: Record<string, unknown>[] = []
  let postCount = 0
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    if (request.method === 'GET') {
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (request.method === 'POST') {
      postCount += 1
      const body = JSON.parse(await request.text()) as Record<string, unknown>
      const incoming = Array.isArray(body) ? body : [body]
      for (const row of incoming) {
        const index = rows.findIndex(existing => existing.id === row.id)
        if (index >= 0) rows[index] = { ...rows[index], ...row }
        else rows.push(row)
      }
      return new Response(JSON.stringify(incoming), { status: 201, headers: { 'content-type': 'application/json' } })
    }
    return new Response(null, { status: 204 })
  }) as typeof fetch

  const { createOfflineFetch, configureOfflineSync, flushOfflineQueue, getOfflineQueueCount, setOfflineSession } = await import(`./offlineTransport.ts?integration=${Date.now()}`)
  setOfflineSession(userId)
  const offlineFetch = createOfflineFetch('https://gateway.example', 'https://direct.example')
  const headers = { authorization: `Bearer ${jwtFor(userId)}`, apikey: 'public-key', 'content-type': 'application/json' }
  const listUrl = `https://gateway.example/rest/v1/crm_activities?user_id=eq.${userId}&type=eq.call&select=*`

  assert.deepEqual(await (await offlineFetch(listUrl, { headers })).json(), [])
  Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: false })

  const callId = '00000000-0000-4000-8000-000000000002'
  const queued = await offlineFetch('https://gateway.example/rest/v1/crm_activities', {
    method: 'POST', headers: { ...headers, prefer: 'return=representation' },
    body: JSON.stringify({ id: callId, user_id: userId, type: 'call', status: 'completed', title: 'Проверочный звонок' }),
  })
  assert.equal(queued.headers.get('x-lumicrm-offline'), 'queued')
  assert.equal(await getOfflineQueueCount(userId), 1)

  const afterReload = await offlineFetch(listUrl, { headers })
  assert.deepEqual((await afterReload.json() as Array<{ id: string }>).map(row => row.id), [callId])

  Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: true })
  configureOfflineSync(async () => ({ userId, accessToken: jwtFor(userId) }))
  assert.equal(await flushOfflineQueue(), 1)
  assert.equal(await getOfflineQueueCount(userId), 0)
  assert.equal(postCount, 1)
  assert.equal(rows[0]?.id, callId)
})

test('a failed gateway write is queued without repeating it through the direct fallback', async () => {
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })

  const userId = '00000000-0000-4000-8000-000000000011'
  let gatewayPosts = 0
  let fallbackPosts = 0
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    if (request.method === 'POST') {
      if (new URL(request.url).origin === 'https://gateway.example') gatewayPosts += 1
      else fallbackPosts += 1
    }
    return new Response(JSON.stringify({ error: 'temporary' }), { status: 503, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const { createOfflineFetch, getOfflineQueueCount, setOfflineSession } = await import(`./offlineTransport.ts?fallback=${Date.now()}`)
  setOfflineSession(userId)
  const offlineFetch = createOfflineFetch('https://gateway.example', 'https://direct.example')
  const response = await offlineFetch('https://gateway.example/rest/v1/crm_activities', {
    method: 'POST',
    headers: { authorization: `Bearer ${jwtFor(userId)}`, apikey: 'public-key', 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({ user_id: userId, type: 'call', status: 'completed', title: 'Звонок' }),
  })

  assert.equal(response.headers.get('x-lumicrm-offline'), 'queued')
  assert.equal(gatewayPosts, 1)
  assert.equal(fallbackPosts, 0)
  assert.equal(await getOfflineQueueCount(userId), 1)
})

test('authentication retries through the fallback gateway without queueing', async () => {
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })

  let primaryPosts = 0
  let fallbackPosts = 0
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    if (new URL(request.url).origin === 'https://primary.example') {
      primaryPosts += 1
      return new Response(JSON.stringify({ message: 'temporary' }), { status: 503, headers: { 'content-type': 'application/json' } })
    }
    fallbackPosts += 1
    return new Response(JSON.stringify({ access_token: 'token' }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const { createOfflineFetch } = await import(`./offlineTransport.ts?auth-fallback=${Date.now()}`)
  const offlineFetch = createOfflineFetch('https://primary.example', 'https://fallback.example')
  const response = await offlineFetch('https://primary.example/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: 'public-key', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'agent@example.com', password: 'secret' }),
  })

  assert.equal(response.status, 200)
  assert.equal(primaryPosts, 1)
  assert.equal(fallbackPosts, 1)
})
