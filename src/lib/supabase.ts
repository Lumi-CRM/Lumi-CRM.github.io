import { createClient } from '@supabase/supabase-js'
import { configureOfflineSync, createOfflineFetch } from './offlineTransport'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: createOfflineFetch(supabaseUrl) },
})

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

export const warmOfflineWorkspace = async (userId: string, force = false) => {
  if (!navigator.onLine) return
  const marker = `lumicrm-offline-warmed:${userId}`
  const lastWarm = Number(localStorage.getItem(marker) ?? 0)
  if (!force && Date.now() - lastWarm < 15 * 60_000) return

  await Promise.allSettled([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    ...WORKSPACE_TABLES.map(table => supabase.from(table).select('*').eq('user_id', userId).limit(1500)),
  ])
  localStorage.setItem(marker, String(Date.now()))
}
