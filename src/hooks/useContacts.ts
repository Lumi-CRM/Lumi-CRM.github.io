import { useQuery } from '@tanstack/react-query'
import { fetchContactSummaries } from '../lib/contacts'
import { crmQueryKeys, queryClient } from '../lib/queryClient'

export const useContacts = (userId?: string) => {
  const query = useQuery({
    queryKey: crmQueryKeys.contacts(userId || 'anonymous'),
    queryFn: () => fetchContactSummaries(userId!),
    enabled: Boolean(userId),
    staleTime: 2 * 60_000,
  })

  const invalidate = () => userId
    ? queryClient.invalidateQueries({ queryKey: crmQueryKeys.contacts(userId) })
    : Promise.resolve()

  return { ...query, invalidate }
}
