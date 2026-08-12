import { supabase } from './supabase'
import type { CrmFileRecord } from './files'

type PendingUpload = {
  id: string
  userId: string
  storagePath: string
  record: CrmFileRecord
  blob: Blob
  createdAt: number
  attempts: number
  lastError?: string
}

type PendingDeletion = {
  id: string
  userId: string
  file: CrmFileRecord
  createdAt: number
  attempts: number
  lastError?: string
}

type CachedBlob = {
  key: string
  userId: string
  storagePath: string
  blob: Blob
  updatedAt: number
}

type FileFilters = {
  userId: string
  bucket: CrmFileRecord['bucket']
  clientId?: string
  propertyId?: string
}

const DB_NAME = 'lumicrm-offline-files-v1'
const DB_VERSION = 1
const UPLOADS = 'uploads'
const DELETIONS = 'deletions'
const BLOBS = 'blobs'
const objectUrls = new Map<string, string>()
let flushPromise: Promise<number> | null = null

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(UPLOADS)) {
      const uploads = database.createObjectStore(UPLOADS, { keyPath: 'id' })
      uploads.createIndex('userId', 'userId')
      uploads.createIndex('storagePath', 'storagePath', { unique: true })
    }
    if (!database.objectStoreNames.contains(DELETIONS)) {
      const deletions = database.createObjectStore(DELETIONS, { keyPath: 'id' })
      deletions.createIndex('userId', 'userId')
    }
    if (!database.objectStoreNames.contains(BLOBS)) {
      const blobs = database.createObjectStore(BLOBS, { keyPath: 'key' })
      blobs.createIndex('userId', 'userId')
      blobs.createIndex('storagePath', 'storagePath')
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('Не удалось открыть локальное хранилище файлов'))
})

const runStore = async <T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) => {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = operation(transaction.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Ошибка локального хранилища файлов'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error ?? new Error('Ошибка транзакции файлов'))
  })
}

const getAllForUser = async <T>(storeName: string, userId: string) => {
  const database = await openDatabase()
  return new Promise<T[]>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const request = transaction.objectStore(storeName).index('userId').getAll(userId)
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error ?? new Error('Ошибка чтения локальных файлов'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error ?? new Error('Ошибка транзакции файлов'))
  })
}

const blobKey = (file: Pick<CrmFileRecord, 'user_id' | 'storage_path'>) => `${file.user_id}:${file.storage_path}`

const emitChange = () => {
  window.dispatchEvent(new CustomEvent('lumicrm:offline-files-changed'))
}

export const queueOfflineFile = async (record: CrmFileRecord, blob: Blob) => {
  const pending: PendingUpload = {
    id: record.id,
    userId: record.user_id,
    storagePath: record.storage_path,
    record,
    blob,
    createdAt: Date.now(),
    attempts: 0,
  }
  await runStore(UPLOADS, 'readwrite', store => store.put(pending))
  await cacheCrmFileBlob(record, blob)
  emitChange()
  return record
}

export const listPendingCrmFiles = async ({ userId, bucket, clientId, propertyId }: FileFilters) => {
  const uploads = await getAllForUser<PendingUpload>(UPLOADS, userId).catch(() => [])
  return uploads
    .map(item => item.record)
    .filter(file => file.bucket === bucket)
    .filter(file => !clientId || file.client_id === clientId)
    .filter(file => !propertyId || file.property_id === propertyId)
}

export const cacheCrmFileBlob = async (file: CrmFileRecord, blob: Blob) => {
  const cached: CachedBlob = {
    key: blobKey(file),
    userId: file.user_id,
    storagePath: file.storage_path,
    blob,
    updatedAt: Date.now(),
  }
  await runStore(BLOBS, 'readwrite', store => store.put(cached)).catch(() => undefined)
}

const getCachedBlob = async (file: CrmFileRecord) => {
  const pending = await runStore<PendingUpload | undefined>(UPLOADS, 'readonly', store => store.get(file.id)).catch(() => undefined)
  if (pending?.blob) return pending.blob
  const cached = await runStore<CachedBlob | undefined>(BLOBS, 'readonly', store => store.get(blobKey(file))).catch(() => undefined)
  return cached?.blob ?? null
}

export const isPendingCrmFile = async (file: CrmFileRecord) =>
  Boolean(await runStore<PendingUpload | undefined>(UPLOADS, 'readonly', store => store.get(file.id)).catch(() => undefined))

export const createLocalCrmFileUrl = async (file: CrmFileRecord) => {
  const key = blobKey(file)
  const existing = objectUrls.get(key)
  if (existing) return existing
  const blob = await getCachedBlob(file)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  objectUrls.set(key, url)
  return url
}

const removeCachedBlob = async (file: CrmFileRecord) => {
  const key = blobKey(file)
  const url = objectUrls.get(key)
  if (url) URL.revokeObjectURL(url)
  objectUrls.delete(key)
  await runStore(BLOBS, 'readwrite', store => store.delete(key)).catch(() => undefined)
}

export const deletePendingCrmFile = async (file: CrmFileRecord) => {
  const pending = await runStore<PendingUpload | undefined>(UPLOADS, 'readonly', store => store.get(file.id)).catch(() => undefined)
  if (!pending) return false
  await runStore(UPLOADS, 'readwrite', store => store.delete(file.id))
  await removeCachedBlob(file)
  emitChange()
  return true
}

export const queueOfflineFileDeletion = async (file: CrmFileRecord) => {
  const deletion: PendingDeletion = {
    id: file.id,
    userId: file.user_id,
    file,
    createdAt: Date.now(),
    attempts: 0,
  }
  await runStore(DELETIONS, 'readwrite', store => store.put(deletion))
  await removeCachedBlob(file)
  emitChange()
}

export const setPendingPrimaryFile = async (file: CrmFileRecord) => {
  const uploads = await getAllForUser<PendingUpload>(UPLOADS, file.user_id).catch(() => [])
  await Promise.all(uploads
    .filter(item => item.record.property_id === file.property_id && item.record.bucket === 'crm-images')
    .map(item => {
      item.record.is_primary = item.id === file.id
      return runStore(UPLOADS, 'readwrite', store => store.put(item))
    }))
}

export const getOfflineFileQueueCount = async (userId: string) => {
  const [uploads, deletions] = await Promise.all([
    getAllForUser<PendingUpload>(UPLOADS, userId).catch(() => []),
    getAllForUser<PendingDeletion>(DELETIONS, userId).catch(() => []),
  ])
  return uploads.length + deletions.length
}

const isAlreadyUploaded = (message: string) => /already exists|duplicate/i.test(message)

export const flushOfflineFiles = async (userId: string) => {
  if (flushPromise) return flushPromise
  flushPromise = (async () => {
    if (!navigator.onLine) return 0
    const uploads = (await getAllForUser<PendingUpload>(UPLOADS, userId).catch(() => [])).sort((a, b) => a.createdAt - b.createdAt)
    const deletions = (await getAllForUser<PendingDeletion>(DELETIONS, userId).catch(() => [])).sort((a, b) => a.createdAt - b.createdAt)
    let synced = 0

    for (const item of uploads) {
      try {
        const { error: uploadError } = await supabase.storage.from(item.record.bucket).upload(item.record.storage_path, item.blob, {
          cacheControl: '86400',
          upsert: false,
          contentType: item.record.mime_type || undefined,
        })
        if (uploadError && !isAlreadyUploaded(uploadError.message)) throw uploadError
        const { error: databaseError } = await supabase.from('crm_files').upsert(item.record, { onConflict: 'id' })
        if (databaseError) throw databaseError
        await cacheCrmFileBlob(item.record, item.blob)
        await runStore(UPLOADS, 'readwrite', store => store.delete(item.id))
        synced += 1
      } catch (error) {
        item.attempts += 1
        item.lastError = error instanceof Error ? error.message : String(error)
        await runStore(UPLOADS, 'readwrite', store => store.put(item)).catch(() => undefined)
        break
      }
    }

    for (const item of deletions) {
      try {
        const { error } = await supabase.storage.from(item.file.bucket).remove([item.file.storage_path])
        if (error && !/not found/i.test(error.message)) throw error
        await runStore(DELETIONS, 'readwrite', store => store.delete(item.id))
        synced += 1
      } catch (error) {
        item.attempts += 1
        item.lastError = error instanceof Error ? error.message : String(error)
        await runStore(DELETIONS, 'readwrite', store => store.put(item)).catch(() => undefined)
        break
      }
    }

    emitChange()
    if (synced > 0) window.dispatchEvent(new CustomEvent('lumicrm:data-synced', { detail: { synced } }))
    return synced
  })().finally(() => {
    flushPromise = null
  })
  return flushPromise
}

const hasCachedBlob = async (file: CrmFileRecord) => Boolean(await getCachedBlob(file))

export const prefetchCrmFiles = async (userId: string) => {
  if (!navigator.onLine) return
  try {
    await navigator.storage?.persist?.()
    const { data, error } = await supabase.from('crm_files').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) return
    const files = (data ?? []) as CrmFileRecord[]
    const missing: CrmFileRecord[] = []
    for (const file of files) {
      if (!(await hasCachedBlob(file))) missing.push(file)
    }

    for (let offset = 0; offset < missing.length; offset += 10) {
      const batch = missing.slice(offset, offset + 10)
      const byBucket = batch.reduce<Map<CrmFileRecord['bucket'], CrmFileRecord[]>>((groups, file) => {
        const group = groups.get(file.bucket) ?? []
        group.push(file)
        groups.set(file.bucket, group)
        return groups
      }, new Map())
      for (const [bucket, bucketFiles] of byBucket) {
        const { data: urls, error: urlError } = await supabase.storage.from(bucket).createSignedUrls(bucketFiles.map(file => file.storage_path), 3600)
        if (urlError) continue
        for (let index = 0; index < bucketFiles.length; index += 1) {
          const signedUrl = urls?.[index]?.signedUrl
          if (!signedUrl) continue
          try {
            const response = await fetch(signedUrl)
            if (response.ok) await cacheCrmFileBlob(bucketFiles[index], await response.blob())
          } catch {
            return
          }
        }
      }
    }
  } catch {
    // File prefetch is best-effort and must never block the CRM.
  }
}
