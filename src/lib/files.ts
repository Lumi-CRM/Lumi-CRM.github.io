import { supabase } from './supabase'

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
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)
  if (propertyId) query = query.eq('property_id', propertyId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as CrmFileRecord[]
}

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

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined })
  if (uploadError) throw uploadError

  const { data, error: databaseError } = await supabase
    .from('crm_files')
    .insert({
      user_id: userId,
      client_id: clientId || null,
      property_id: propertyId || null,
      bucket,
      storage_path: storagePath,
      name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      category,
      description: description?.trim() || null,
    })
    .select('*')
    .single()

  if (databaseError) {
    await supabase.storage.from(bucket).remove([storagePath])
    throw databaseError
  }

  return data as CrmFileRecord
}

export const createSignedFileUrl = async (file: CrmFileRecord, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.storage_path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export const deleteCrmFile = async (file: CrmFileRecord) => {
  const { error: storageError } = await supabase.storage
    .from(file.bucket)
    .remove([file.storage_path])
  if (storageError && !/not found/i.test(storageError.message)) throw storageError

  const { error: databaseError } = await supabase.from('crm_files').delete().eq('id', file.id)
  if (databaseError) throw databaseError
}

export const formatFileSize = (size: number | null) => {
  if (!size) return '—'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} КБ`
  return `${(size / 1024 / 1024).toFixed(1)} МБ`
}
