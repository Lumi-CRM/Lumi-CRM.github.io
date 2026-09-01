import { supabase } from './supabase'
import { inferContactRoles, type ContactRole } from './contactRoles'

export type { ContactRole } from './contactRoles'

export type ContactSummary = {
  id: string
  firstName: string
  lastName: string
  middleName: string
  phone: string
  email: string
  roles: ContactRole[]
  source?: string
  nextContactDate?: string
  isFavorite: boolean
}

export const fetchContactSummaries = async (userId: string): Promise<ContactSummary[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('id,type,first_name,last_name,middle_name,phone,email,roles,source,next_contact_at,is_favorite')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data || []).map(row => ({
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    middleName: row.middle_name || '',
    phone: row.phone || '',
    email: row.email || '',
    roles: inferContactRoles(row),
    source: row.source || undefined,
    nextContactDate: row.next_contact_at || undefined,
    isFavorite: Boolean(row.is_favorite),
  }))
}
