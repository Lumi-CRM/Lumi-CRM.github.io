import { createClient } from '@supabase/supabase-js'
import { configureOfflineSync, createOfflineFetch } from './offlineTransport'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: createOfflineFetch(supabaseUrl) },
})

export const checkCloudConnection = async () => {
  if (!navigator.onLine) return false
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 4_000)
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      cache: 'no-store',
      headers: { apikey: supabaseAnonKey },
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

export const checkCloudSession = async (expectedUserId: string) => {
  if (!navigator.onLine) return { valid: false, message: 'Нет подключения к интернету' }
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user || data.user.id !== expectedUserId) {
      return { valid: false, message: 'Сессия не связана с текущей базой. Сначала сохраните резервную копию, затем войдите в аккаунт заново.' }
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', expectedUserId)
      .maybeSingle()
    if (profileError || !profile) {
      return { valid: false, message: 'Профиль не найден в текущей базе. Сначала сохраните резервную копию, затем войдите в аккаунт заново.' }
    }
    return { valid: true, message: '' }
  } catch {
    return { valid: false, message: 'Не удалось проверить сессию в текущей базе.' }
  }
}

configureOfflineSync(async () => {
  const { data } = await supabase.auth.getSession()
  return {
    accessToken: data.session?.access_token ?? null,
    userId: data.session?.user.id ?? null,
  }
})

const WORKSPACE_TABLES = [
  'clients',
  'properties',
  'tasks',
  'events',
  'deals',
  'deal_participants',
  'property_owners',
  'property_history',
  'client_contact_points',
  'client_relationships',
  'crm_activities',
  'crm_files',
  'property_details',
  'client_requirements',
  'monthly_plans',
  'property_shares',
  'notifications',
  'push_subscriptions',
  'crm_imports',
  'crm_import_rows',
] as const

const CORE_WORKSPACE_TABLES = ['clients', 'properties', 'tasks', 'events', 'deals', 'notifications'] as const
const BACKGROUND_WORKSPACE_TABLES = WORKSPACE_TABLES.filter(table => !CORE_WORKSPACE_TABLES.includes(table as typeof CORE_WORKSPACE_TABLES[number]))
const warmPromises = new Map<string, Promise<void>>()

const warmTables = async (userId: string, tables: readonly string[], limit: number) => {
  for (let index = 0; index < tables.length; index += 2) {
    const batch = tables.slice(index, index + 2)
    await Promise.allSettled(batch.map(table => supabase.from(table).select('*').eq('user_id', userId).limit(limit)))
  }
}

export const warmOfflineWorkspace = async (userId: string, force = false) => {
  if (!navigator.onLine) return
  const marker = `lumicrm-offline-warmed:${userId}`
  const lastWarm = Number(localStorage.getItem(marker) ?? 0)
  if (!force && Date.now() - lastWarm < 15 * 60_000) return

  const active = warmPromises.get(userId)
  if (active) return active

  const warming = (async () => {
    await Promise.allSettled([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      ...CORE_WORKSPACE_TABLES.map(table => supabase.from(table).select('*').eq('user_id', userId).limit(750)),
    ])
    localStorage.setItem(marker, String(Date.now()))

    const backgroundMarker = `${marker}:background`
    const lastBackgroundWarm = Number(localStorage.getItem(backgroundMarker) ?? 0)
    if (!force && Date.now() - lastBackgroundWarm < 60 * 60_000) return
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    const delay = connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType ?? '') ? 30_000 : 6_000
    window.setTimeout(() => {
      if (!navigator.onLine) return
      void warmTables(userId, BACKGROUND_WORKSPACE_TABLES, 1500).then(() => {
        localStorage.setItem(backgroundMarker, String(Date.now()))
      })
    }, delay)
  })().finally(() => warmPromises.delete(userId))
  warmPromises.set(userId, warming)
  return warming
}
