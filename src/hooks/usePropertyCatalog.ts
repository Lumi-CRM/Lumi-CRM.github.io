import { useQuery } from '@tanstack/react-query'
import type { Property } from '../types'
import { fetchPropertyCatalog, type PropertyCatalog } from '../lib/propertyCatalog'
import { crmQueryKeys, queryClient } from '../lib/queryClient'

export const usePropertyCatalog = (userId?: string) => {
  const queryKey = crmQueryKeys.properties(userId || 'anonymous')
  const query = useQuery<PropertyCatalog>({
    queryKey,
    queryFn: () => fetchPropertyCatalog(userId!),
    enabled: Boolean(userId),
    staleTime: 2 * 60_000,
  })

  const updateProperties = (updater: (properties: Property[]) => Property[]) => {
    if (!userId) return
    queryClient.setQueryData<PropertyCatalog>(queryKey, current => current ? { ...current, properties: updater(current.properties) } : current)
  }

  const invalidate = () => userId
    ? queryClient.invalidateQueries({ queryKey })
    : Promise.resolve()

  return { ...query, updateProperties, invalidate }
}
