import { supabase } from './supabase'
import {
  cacheCrmFileBlob,
  createLocalCrmFileUrl,
  deletePendingCrmFile,
  isPendingCrmFile,
  listPendingCrmFiles,
  queueOfflineFile,
  queueOfflineFileDeletion,
  setPendingPrimaryFile,
} from './offlineFiles'

export type CrmBucket = 'crm-documents' | 'crm-images'

export interface CrmFileRecord {
  id: string
  user_id: string
  client_id: string | null
  property_id: string | null
  deal_id: string | null
  task_id: string | null
  bucket: CrmBucket
  storage_path: string
  name: string
  mime_type: string | null
  size_bytes: number | null
  category: string | null
  description: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

interface FileFilters {
  userId: string
  bucket: CrmBucket
  clientId?: string
  propertyId?: string
}

interface UploadCrmFileInput extends FileFilters {
  file: File
  category?: string
  description?: string
}

const MAX_FILE_SIZE = 25 * 1024 * 1024
const FILE_NETWORK_TIMEOUT_MS = 8_000

const withFileTimeout = <T,>(request: PromiseLike<T>, timeoutMs = FILE_NETWORK_TIMEOUT_MS) => new Promise<T>((resolve, reject) => {
  const timer = window.setTimeout(() => reject(new Error('FILE_NETWORK_TIMEOUT')), timeoutMs)
  Promise.resolve(request).then(
    value => { window.clearTimeout(timer); resolve(value) },
    error => { window.clearTimeout(timer); reject(error) },
  )
})

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

const transliterate = (value: string) => value
  .normalize('NFKD')
  .toLowerCase()
  .split('')
  .map(character => CYRILLIC_TO_LATIN[character] ?? character)
  .join('')

const toSafeSegment = (value: string) => transliterate(value.trim())
  .replace(/[^a-z0-9._-]+/gi, '-')
  .replace(/^-+|-+$/g, '') || 'other'

const safeFileName = (value: string) => {
  const dotIndex = value.lastIndexOf('.')
  const base = toSafeSegment(dotIndex > 0 ? value.slice(0, dotIndex) : value)
  const extension = dotIndex > 0 ? toSafeSegment(value.slice(dotIndex + 1)) : ''
  return `${base}${extension ? `.${extension}` : ''}`
}

export const listCrmFiles = async ({ userId, bucket, clientId, propertyId }: FileFilters) => {
  let query = supabase
    .from('crm_files')
    .select('*')
    .eq('user_id', userId)
    .eq('bucket', bucket)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)
  if (propertyId) query = query.eq('property_id', propertyId)

  const { data, error } = await query
  if (error) throw error
  const cloudFiles = (data || []) as CrmFileRecord[]
  const pendingFiles = await listPendingCrmFiles({ userId, bucket, clientId, propertyId })
  const merged = new Map(cloudFiles.map(file => [file.id, file]))
  pendingFiles.forEach(file => merged.set(file.id, file))
  return Array.from(merged.values()).sort((left, right) => {
    if (left.is_primary !== right.is_primary) return left.is_primary ? -1 : 1
    return right.created_at.localeCompare(left.created_at)
  })
}

const isConnectivityError = (error: { message?: string; statusCode?: string | number } | null) =>
  !navigator.onLine || Boolean(error && (
    Number(error.statusCode) >= 500
    || /fetch|network|load failed|timeout|connection|offline/i.test(error.message ?? '')
  ))

export const uploadCrmFile = async ({
  userId,
  bucket,
  clientId,
  propertyId,
  category = 'Общее',
  description,
  file,
}: UploadCrmFileInput) => {
  if (file.size > MAX_FILE_SIZE) throw new Error('Файл больше 25 МБ')

  const entityPath = propertyId
    ? `properties/${propertyId}`
    : clientId
      ? `clients/${clientId}`
      : 'general'
  const storagePath = `${userId}/${entityPath}/${toSafeSegment(category)}/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const now = new Date().toISOString()
  const record: CrmFileRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    client_id: clientId || null,
    property_id: propertyId || null,
    deal_id: null,
    task_id: null,
    bucket,
    storage_path: storagePath,
    name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    category,
    description: description?.trim() || null,
    is_primary: false,
    created_at: now,
    updated_at: now,
  }

  if (!navigator.onLine) return queueOfflineFile(record, file)

  let uploadResult: Awaited<ReturnType<ReturnType<typeof supabase.storage.from>['upload']>>
  try {
    uploadResult = await withFileTimeout(supabase.storage
      .from(bucket)
      .upload(storagePath, file, { cacheControl: '86400', upsert: false, contentType: file.type || undefined }))
  } catch {
    return queueOfflineFile(record, file)
  }
  const { error: uploadError } = uploadResult
  if (uploadError) {
    if (isConnectivityError(uploadError)) return queueOfflineFile(record, file)
    throw uploadError
  }

  const { data, error: databaseError } = await supabase
    .from('crm_files')
    .insert(record)
    .select('*')
    .single()

  if (databaseError) {
    if (isConnectivityError(databaseError)) return queueOfflineFile(record, file)
    await supabase.storage.from(bucket).remove([storagePath])
    throw databaseError
  }

  const saved = data as CrmFileRecord
  await cacheCrmFileBlob(saved, file)
  return saved
}

export const createSignedFileUrl = async (file: CrmFileRecord, expiresIn = 3600) => {
  const localUrl = await createLocalCrmFileUrl(file)
  if (localUrl) return localUrl
  if (!navigator.onLine) throw new Error('Этот файл ещё не сохранён на телефоне для офлайн-доступа')
  const { data, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.storage_path, expiresIn)
  if (error) throw error
  void fetch(data.signedUrl).then(async response => {
    if (response.ok) await cacheCrmFileBlob(file, await response.blob())
  }).catch(() => undefined)
  return data.signedUrl
}

export const createSignedFileUrls = async (files: CrmFileRecord[], expiresIn = 6 * 3600) => {
  if (files.length === 0) return new Map<string, string>()
  const bucket = files[0].bucket
  if (files.some(file => file.bucket !== bucket)) throw new Error('Файлы должны относиться к одному хранилищу')
  const result = new Map<string, string>()
  const remoteFiles: CrmFileRecord[] = []
  for (const file of files) {
    if (!navigator.onLine || await isPendingCrmFile(file)) {
      const localUrl = await createLocalCrmFileUrl(file)
      if (localUrl) result.set(file.storage_path, localUrl)
    } else remoteFiles.push(file)
  }
  if (remoteFiles.length === 0 || !navigator.onLine) return result
  let signedResult: Awaited<ReturnType<ReturnType<typeof supabase.storage.from>['createSignedUrls']>>
  try {
    signedResult = await withFileTimeout(supabase.storage
      .from(bucket)
      .createSignedUrls(remoteFiles.map(file => file.storage_path), expiresIn))
  } catch {
    return result
  }
  const { data, error } = signedResult
  if (error) return result
  for (let index = 0; index < remoteFiles.length; index += 1) {
    const item = data?.[index]
    if (!item?.signedUrl || !item.path) continue
    result.set(item.path, item.signedUrl)
    void fetch(item.signedUrl).then(async response => {
      if (response.ok) await cacheCrmFileBlob(remoteFiles[index], await response.blob())
    }).catch(() => undefined)
  }
  return result
}

export const setPrimaryPropertyImage = async (file: CrmFileRecord) => {
  if (!file.property_id || file.bucket !== 'crm-images') throw new Error('Главное фото можно выбрать только для объекта')
  const { error: clearError } = await supabase
    .from('crm_files')
    .update({ is_primary: false })
    .eq('user_id', file.user_id)
    .eq('property_id', file.property_id)
    .eq('bucket', 'crm-images')
  if (clearError) throw clearError

  const { error } = await supabase
    .from('crm_files')
    .update({ is_primary: true })
    .eq('id', file.id)
    .eq('user_id', file.user_id)
  if (error) throw error
  await setPendingPrimaryFile(file)
}

export const optimizeImageForUpload = async (file: File) => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file)
  const maxSide = 2400
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 1.2 * 1024 * 1024) {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.84))
  if (!blob || blob.size >= file.size) return file
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: file.lastModified })
}

export const mapWithConcurrency = async <T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) => {
  const results = new Array<R>(items.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await mapper(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

export const deleteCrmFile = async (file: CrmFileRecord) => {
  if (await deletePendingCrmFile(file)) return
  if (!navigator.onLine) {
    await queueOfflineFileDeletion(file)
    const { error } = await supabase.from('crm_files').delete().eq('id', file.id)
    if (error) throw error
    return
  }
  const { error: storageError } = await supabase.storage
    .from(file.bucket)
    .remove([file.storage_path])
  if (storageError && !/not found/i.test(storageError.message)) {
    if (isConnectivityError(storageError)) await queueOfflineFileDeletion(file)
    else throw storageError
  }

  const { error: databaseError } = await supabase.from('crm_files').delete().eq('id', file.id)
  if (databaseError) throw databaseError
}

export const formatFileSize = (size: number | null) => {
  if (!size) return '—'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} КБ`
  return `${(size / 1024 / 1024).toFixed(1)} МБ`
}
