import { supabase } from './supabase'

const USER_TABLES = [
  'clients',
  'properties',
  'tasks',
  'events',
  'deals',
  'deal_participants',
  'crm_activities',
  'crm_files',
  'property_details',
  'client_requirements',
  'monthly_plans',
  'property_shares',
  'notifications',
  'notification_jobs',
  'push_subscriptions',
  'crm_imports',
  'crm_import_rows',
  'documents',
] as const

type BackupRow = Record<string, unknown>

export type WorkspaceBackup = {
  format: 'lumicrm-workspace-backup'
  version: 1
  exportedAt: string
  sourceUserId: string
  profile: BackupRow | null
  tables: Record<string, BackupRow[]>
  fileUrls: Record<string, string>
  warnings: string[]
}

const loadUserTable = async (table: typeof USER_TABLES[number], userId: string) => {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).limit(10_000)
  return { rows: (data ?? []) as BackupRow[], error: error?.message }
}

const buildFileUrls = async (rows: BackupRow[], warnings: string[]) => {
  const result: Record<string, string> = {}
  const byBucket = new Map<string, Array<{ id: string; path: string }>>()

  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id : ''
    const bucket = typeof row.bucket === 'string' ? row.bucket : ''
    const path = typeof row.storage_path === 'string' ? row.storage_path : ''
    if (!id || !bucket || !path) continue
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), { id, path }])
  }

  for (const [bucket, files] of byBucket) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(files.map(file => file.path), 24 * 60 * 60)
    if (error) {
      warnings.push(`Не удалось подготовить ссылки на файлы из ${bucket}: ${error.message}`)
      continue
    }
    data?.forEach((item, index) => {
      if (item.signedUrl) result[files[index].id] = item.signedUrl
    })
  }

  return result
}

export const createWorkspaceBackup = async (userId: string): Promise<WorkspaceBackup> => {
  const warnings: string[] = []
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (profileError) warnings.push(`Профиль: ${profileError.message}`)

  const tableResults = await Promise.all(USER_TABLES.map(async table => ({ table, ...(await loadUserTable(table, userId)) })))
  const tables: Record<string, BackupRow[]> = {}
  for (const result of tableResults) {
    tables[result.table] = result.rows
    if (result.error) warnings.push(`${result.table}: ${result.error}`)
  }

  const fileUrls = await buildFileUrls(tables.crm_files ?? [], warnings)
  return {
    format: 'lumicrm-workspace-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceUserId: userId,
    profile: (profile as BackupRow | null) ?? null,
    tables,
    fileUrls,
    warnings,
  }
}

export const downloadWorkspaceBackup = async (userId: string) => {
  const backup = await createWorkspaceBackup(userId)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `LumiCRM-backup-${date}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return backup
}
