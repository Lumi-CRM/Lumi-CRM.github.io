type SessionSnapshot = {
  accessToken: string | null
  userId: string | null
}

type CachedResponse = {
  key: string
  userId: string
  userTable: string
  table: string
  url: string
  body: string
  status: number
  headers: Record<string, string>
  updatedAt: number
}

type QueuedRequest = {
  id: string
  userId: string
  table: string
  url: string
  method: string
  headers: Record<string, string>
  body: string
  createdAt: number
  attempts: number
  lastError?: string
}

export type OfflineStatus = {
  online: boolean
  pending: number
  syncing: boolean
  error?: string
}

const DB_NAME = 'lumicrm-offline-v1'
const DB_VERSION = 1
const RESPONSE_STORE = 'responses'
const QUEUE_STORE = 'queue'
const UUID_TABLES = new Set([
  'clients',
  'properties',
  'tasks',
  'events',
  'deals',
  'crm_activities',
  'crm_files',
  'client_requirements',
  'monthly_plans',
  'property_shares',
  'notifications',
  'push_subscriptions',
])
const SAFE_HEADERS = new Set(['accept', 'content-type', 'content-profile', 'prefer', 'range', 'range-unit'])
const nativeFetch = globalThis.fetch.bind(globalThis)
const READ_TIMEOUT_MS = 5_000

let sessionProvider: (() => Promise<SessionSnapshot>) | null = null
let syncPromise: Promise<number> | null = null
let syncTimer: number | null = null

const hasIndexedDb = () => typeof indexedDB !== 'undefined'
const isOnline = () => typeof navigator === 'undefined' || navigator.onLine

const emitStatus = (detail: OfflineStatus) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lumicrm:offline-status', { detail }))
}

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!hasIndexedDb()) {
    reject(new Error('IndexedDB is unavailable'))
    return
  }
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(RESPONSE_STORE)) {
      const responses = database.createObjectStore(RESPONSE_STORE, { keyPath: 'key' })
      responses.createIndex('userId', 'userId')
      responses.createIndex('userTable', 'userTable')
    }
    if (!database.objectStoreNames.contains(QUEUE_STORE)) {
      const queue = database.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
      queue.createIndex('userId', 'userId')
      queue.createIndex('createdAt', 'createdAt')
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
})

const runStore = async <T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) => {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = operation(transaction.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB operation failed'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
  })
}

const getAllByIndex = async <T>(storeName: string, indexName: string, value: IDBValidKey) => {
  const database = await openDatabase()
  return new Promise<T[]>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const request = transaction.objectStore(storeName).index(indexName).getAll(value)
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error ?? new Error('IndexedDB query failed'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
  })
}

const cacheKey = (userId: string, request: Request) => `${userId}:${request.url}:${request.headers.get('accept') ?? ''}`

const decodeUserId = (request: Request) => {
  const authorization = request.headers.get('authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return String(JSON.parse(atob(payload)).sub ?? '') || null
  } catch {
    return null
  }
}

const getTable = (url: URL) => {
  const marker = '/rest/v1/'
  const position = url.pathname.indexOf(marker)
  return position < 0 ? null : decodeURIComponent(url.pathname.slice(position + marker.length).split('/')[0])
}

const safeHeaders = (headers: Headers) => {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    if (SAFE_HEADERS.has(key.toLowerCase())) result[key] = value
  })
  return result
}

const cloneResponseHeaders = (headers: Headers) => {
  const result: Record<string, string> = {}
  for (const key of ['content-type', 'content-range', 'preference-applied']) {
    const value = headers.get(key)
    if (value) result[key] = value
  }
  return result
}

const parseFilterValue = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const valuesEqual = (left: unknown, right: string) => {
  if (left === null) return right === 'null'
  if (typeof left === 'boolean') return String(left) === right
  return String(left ?? '') === right
}

export const filterRowsForUrl = (rows: Record<string, unknown>[], urlValue: string) => {
  const url = new URL(urlValue, 'https://offline.local')
  let result = [...rows]
  const reserved = new Set(['select', 'order', 'limit', 'offset', 'on_conflict'])

  url.searchParams.forEach((expression, field) => {
    if (reserved.has(field)) return
    const decoded = parseFilterValue(expression)
    if (decoded.startsWith('eq.')) {
      const expected = decoded.slice(3)
      result = result.filter(row => valuesEqual(row[field], expected))
    } else if (decoded.startsWith('neq.')) {
      const expected = decoded.slice(4)
      result = result.filter(row => !valuesEqual(row[field], expected))
    } else if (decoded.startsWith('is.')) {
      const expected = decoded.slice(3)
      result = result.filter(row => valuesEqual(row[field], expected))
    } else if (decoded.startsWith('in.(') && decoded.endsWith(')')) {
      const expected = decoded.slice(4, -1).split(',').map(value => value.replace(/^"|"$/g, ''))
      result = result.filter(row => expected.some(value => valuesEqual(row[field], value)))
    } else if (decoded.startsWith('cs.')) {
      try {
        const expected = JSON.parse(decoded.slice(3)) as Record<string, unknown>
        result = result.filter(row => {
          const actual = row[field]
          return actual && typeof actual === 'object'
            && Object.entries(expected).every(([key, value]) => JSON.stringify((actual as Record<string, unknown>)[key]) === JSON.stringify(value))
        })
      } catch {
        // An unsupported contains expression is left to the exact cache entry.
      }
    }
  })

  const order = url.searchParams.get('order')
  if (order) {
    const clauses = order.split(',').map(clause => clause.split('.'))
    result.sort((left, right) => {
      for (const [field, direction] of clauses) {
        const a = String(left[field] ?? '')
        const b = String(right[field] ?? '')
        const comparison = a.localeCompare(b)
        if (comparison) return (direction === 'desc' ? -1 : 1) * comparison
      }
      return 0
    })
  }
  const offset = Number(url.searchParams.get('offset') ?? 0)
  const limitValue = url.searchParams.get('limit')
  return result.slice(offset, limitValue ? offset + Number(limitValue) : undefined)
}

export const prepareOfflinePayload = (table: string, body: unknown) => {
  const source = Array.isArray(body) ? body : [body]
  const prepared = source.map(value => {
    if (!value || typeof value !== 'object') return value
    const row = { ...(value as Record<string, unknown>) }
    if (UUID_TABLES.has(table) && !row.id) row.id = crypto.randomUUID()
    if (table === 'property_shares' && !row.slug) row.slug = crypto.randomUUID()
    return row
  })
  return Array.isArray(body) ? prepared : prepared[0]
}

const cacheResponse = async (request: Request, response: Response, userId: string, table: string) => {
  if (!hasIndexedDb() || !response.ok) return
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('json')) return
  const record: CachedResponse = {
    key: cacheKey(userId, request),
    userId,
    userTable: `${userId}:${table}`,
    table,
    url: request.url,
    body: await response.clone().text(),
    status: response.status,
    headers: cloneResponseHeaders(response.headers),
    updatedAt: Date.now(),
  }
  await runStore(RESPONSE_STORE, 'readwrite', store => store.put(record)).catch(() => undefined)
}

const responseFromCache = (cached: CachedResponse) => new Response(cached.body, {
  status: 200,
  headers: { 'content-type': 'application/json', ...cached.headers, 'x-lumicrm-offline': 'cache' },
})

const findCachedResponse = async (request: Request, userId: string, table: string) => {
  if (!hasIndexedDb()) return null
  const exact = await runStore<CachedResponse | undefined>(RESPONSE_STORE, 'readonly', store => store.get(cacheKey(userId, request))).catch(() => undefined)
  if (exact) return responseFromCache(exact)

  const candidates = await getAllByIndex<CachedResponse>(RESPONSE_STORE, 'userTable', `${userId}:${table}`).catch(() => [])
  for (const candidate of candidates.sort((a, b) => b.updatedAt - a.updatedAt)) {
    try {
      const parsed = JSON.parse(candidate.body)
      if (!Array.isArray(parsed)) continue
      const rows = filterRowsForUrl(parsed, request.url)
      const wantsObject = request.headers.get('accept')?.includes('application/vnd.pgrst.object')
      return new Response(JSON.stringify(wantsObject ? rows[0] ?? null : rows), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-lumicrm-offline': 'derived-cache' },
      })
    } catch {
      // Try the next usable table snapshot.
    }
  }
  return null
}

const matchesMutation = (row: Record<string, unknown>, url: string) => filterRowsForUrl([row], url).length === 1

const updateCachedTable = async (userId: string, table: string, method: string, url: string, payload: unknown) => {
  if (!hasIndexedDb()) return
  const records = await getAllByIndex<CachedResponse>(RESPONSE_STORE, 'userTable', `${userId}:${table}`).catch(() => [])
  const incoming = (Array.isArray(payload) ? payload : [payload]).filter(Boolean) as Record<string, unknown>[]
  await Promise.all(records.map(async record => {
    try {
      const parsed = JSON.parse(record.body)
      if (!Array.isArray(parsed)) return
      let rows = parsed as Record<string, unknown>[]
      if (method === 'POST') {
        for (const row of incoming) {
          const existing = row.id ? rows.findIndex(item => item.id === row.id) : -1
          if (existing >= 0) rows[existing] = { ...rows[existing], ...row }
          else if (matchesMutation(row, record.url)) rows.push(row)
        }
      } else if (method === 'PATCH') {
        rows = rows.map(row => matchesMutation(row, url) ? { ...row, ...incoming[0] } : row)
      } else if (method === 'DELETE') {
        rows = rows.filter(row => !matchesMutation(row, url))
      }
      record.body = JSON.stringify(filterRowsForUrl(rows, record.url))
      record.updatedAt = Date.now()
      await runStore(RESPONSE_STORE, 'readwrite', store => store.put(record))
    } catch {
      // A malformed old cache entry must not block an offline write.
    }
  }))
}

const syntheticMutationResponse = (request: Request, method: string, payload: unknown) => {
  const prefersRepresentation = request.headers.get('prefer')?.includes('return=representation')
  if (!prefersRepresentation || method === 'DELETE') return new Response(null, { status: method === 'POST' ? 201 : 204 })
  const acceptsObject = request.headers.get('accept')?.includes('application/vnd.pgrst.object')
  const url = new URL(request.url)
  const source = (Array.isArray(payload) ? payload : [payload]).map(value => {
    if (!value || typeof value !== 'object') return value
    const row = { ...(value as Record<string, unknown>) }
    url.searchParams.forEach((expression, field) => {
      const decoded = parseFilterValue(expression)
      if (row[field] === undefined && decoded.startsWith('eq.')) row[field] = decoded.slice(3)
    })
    return row
  })
  return new Response(JSON.stringify(acceptsObject ? source[0] ?? null : source), {
    status: method === 'POST' ? 201 : 200,
    headers: { 'content-type': 'application/json', 'x-lumicrm-offline': 'queued' },
  })
}

const enqueueMutation = async (request: Request, userId: string, table: string) => {
  const method = request.method.toUpperCase()
  const originalBody = request.body ? await request.clone().text() : ''
  let parsed: unknown = originalBody ? JSON.parse(originalBody) : {}
  if (method === 'POST') parsed = prepareOfflinePayload(table, parsed)

  const queueItem: QueuedRequest = {
    id: crypto.randomUUID(),
    userId,
    table,
    url: request.url,
    method,
    headers: safeHeaders(request.headers),
    body: method === 'DELETE' ? '' : JSON.stringify(parsed),
    createdAt: Date.now(),
    attempts: 0,
  }
  await runStore(QUEUE_STORE, 'readwrite', store => store.put(queueItem))
  await updateCachedTable(userId, table, method, request.url, parsed)
  const pending = await getOfflineQueueCount(userId)
  emitStatus({ online: isOnline(), pending, syncing: false })
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lumicrm:offline-queued', { detail: { table, pending } }))
  return syntheticMutationResponse(request, method, parsed)
}

export const createOfflineFetch = (supabaseUrl: string) => async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = new Request(input, init)
  const url = new URL(request.url)
  const table = url.origin === new URL(supabaseUrl).origin ? getTable(url) : null
  if (!table) return nativeFetch(request)

  const userId = decodeUserId(request)
  if (!userId) return nativeFetch(request)
  const method = request.method.toUpperCase()

  if (method === 'GET' || method === 'HEAD') {
    if (isOnline()) {
      const cached = await findCachedResponse(request, userId, table)
      const networkRequest = nativeFetch(request.clone())
      void networkRequest.then(response => {
        if (response.ok) return cacheResponse(request, response, userId, table)
      }).catch(() => undefined)
      try {
        const response = cached
          ? await Promise.race([
            networkRequest,
            new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Slow connection')), READ_TIMEOUT_MS)),
          ])
          : await networkRequest
        if (response.status < 500) return response
      } catch {
        // Fall through to the device-local snapshot.
      }
      if (cached) return cached
    }
    return await findCachedResponse(request, userId, table)
      ?? new Response(JSON.stringify({ message: 'Данные ещё не сохранены на этом устройстве' }), {
        status: 503,
        headers: { 'content-type': 'application/json', 'x-lumicrm-offline': 'miss' },
      })
  }

  if (isOnline()) {
    try {
      const response = await nativeFetch(request.clone())
      if (response.status < 500) return response
    } catch {
      // A temporary connection failure is handled as an offline write.
    }
  }
  return enqueueMutation(request, userId, table)
}

export const getOfflineQueueCount = async (userId: string) => {
  if (!hasIndexedDb()) return 0
  const entries = await getAllByIndex<QueuedRequest>(QUEUE_STORE, 'userId', userId).catch(() => [])
  return entries.length
}

const conflictFields: Record<string, string> = {
  property_details: 'property_id',
  client_requirements: 'client_id,purpose',
  property_shares: 'user_id,property_id',
  push_subscriptions: 'user_id,endpoint',
}

const replayUrl = (entry: QueuedRequest) => {
  if (entry.method !== 'POST') return entry.url
  const url = new URL(entry.url)
  if (!url.searchParams.has('on_conflict')) url.searchParams.set('on_conflict', conflictFields[entry.table] ?? 'id')
  return url.toString()
}

export const flushOfflineQueue = async () => {
  if (syncPromise) return syncPromise
  syncPromise = (async () => {
    if (!sessionProvider || !isOnline()) return 0
    const session = await sessionProvider()
    if (!session.userId || !session.accessToken) return 0
    const entries = (await getAllByIndex<QueuedRequest>(QUEUE_STORE, 'userId', session.userId).catch(() => []))
      .sort((a, b) => a.createdAt - b.createdAt)
    emitStatus({ online: true, pending: entries.length, syncing: entries.length > 0 })
    let synced = 0

    for (const entry of entries) {
      try {
        const headers = new Headers(entry.headers)
        headers.set('authorization', `Bearer ${session.accessToken}`)
        headers.set('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY)
        if (entry.method === 'POST') {
          const prefer = headers.get('prefer') ?? ''
          if (!prefer.includes('resolution=')) headers.set('prefer', [prefer, 'resolution=merge-duplicates'].filter(Boolean).join(','))
        }
        const response = await nativeFetch(replayUrl(entry), {
          method: entry.method,
          headers,
          body: entry.body || undefined,
        })
        if (response.ok) {
          await runStore(QUEUE_STORE, 'readwrite', store => store.delete(entry.id))
          synced += 1
          continue
        }
        if (response.status === 401 || response.status === 403 || response.status >= 500) break
        entry.attempts += 1
        entry.lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`
        await runStore(QUEUE_STORE, 'readwrite', store => store.put(entry))
      } catch (error) {
        entry.attempts += 1
        entry.lastError = error instanceof Error ? error.message : String(error)
        await runStore(QUEUE_STORE, 'readwrite', store => store.put(entry)).catch(() => undefined)
        break
      }
    }

    const pending = await getOfflineQueueCount(session.userId)
    emitStatus({ online: isOnline(), pending, syncing: false, error: pending > 0 && synced === 0 ? 'Синхронизация будет повторена' : undefined })
    if (synced > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lumicrm:data-synced', { detail: { synced, pending } }))
    }
    return synced
  })().finally(() => {
    syncPromise = null
  })
  return syncPromise
}

export const configureOfflineSync = (provider: () => Promise<SessionSnapshot>) => {
  sessionProvider = provider
  if (typeof window === 'undefined') return
  const startSync = () => void flushOfflineQueue()
  window.addEventListener('online', startSync)
  window.addEventListener('focus', startSync)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') startSync()
  })
  if (syncTimer === null) syncTimer = window.setInterval(startSync, 30_000)
}
