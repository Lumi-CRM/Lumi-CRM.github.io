import { useQuery } from '@tanstack/react-query'
import type { Property } from '../types'
import { fetchPropertyMatches } from '../lib/propertyMatches'
import { crmQueryKeys } from '../lib/queryClient'

export const usePropertyMatches = (userId?: string, property?: Property) => useQuery({
  queryKey: crmQueryKeys.propertyMatches(userId || 'anonymous', property?.id || 'unknown'),
  queryFn: () => fetchPropertyMatches(userId!, property!),
  enabled: Boolean(userId && property),
  staleTime: 60_000,
})
