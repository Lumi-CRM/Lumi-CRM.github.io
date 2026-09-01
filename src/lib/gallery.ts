import { listCrmFiles } from './files'
import { buildPropertyFolders, type GalleryPropertyRow } from './galleryMapping'
import { supabase } from './supabase'

export const fetchGalleryFolders = async (userId: string) => {
  const [propertiesResult, images] = await Promise.all([
    supabase
      .from('properties')
      .select('id,address,created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    listCrmFiles({ userId, bucket: 'crm-images' }),
  ])
  if (propertiesResult.error) throw propertiesResult.error
  return buildPropertyFolders((propertiesResult.data || []) as GalleryPropertyRow[], images)
}
