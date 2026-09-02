import { useQuery } from '@tanstack/react-query'
import { fetchPropertyHistory } from '../lib/propertyHistory'
import { crmQueryKeys } from '../lib/queryClient'

export const usePropertyHistory = (userId?: string, propertyId?: string) => useQuery({
  queryKey: crmQueryKeys.propertyHistory(userId || 'anonymous', propertyId || 'unknown'),
  queryFn: () => fetchPropertyHistory(userId!, propertyId!),
  enabled: Boolean(userId && propertyId),
  staleTime: 60_000,
})
