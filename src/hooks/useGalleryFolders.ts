import { useQuery } from '@tanstack/react-query'
import { fetchGalleryFolders } from '../lib/gallery'
import { crmQueryKeys } from '../lib/queryClient'

export const useGalleryFolders = (userId?: string) => useQuery({
  queryKey: crmQueryKeys.gallery(userId || 'anonymous'),
  queryFn: () => fetchGalleryFolders(userId!),
  enabled: Boolean(userId),
  staleTime: 2 * 60_000,
})
