import { useQuery } from '@tanstack/react-query'
import { crmQueryKeys } from '../lib/queryClient'
import { normalizeSearchTerm, searchWorkspace } from '../lib/workspaceSearch'

export const useWorkspaceSearch = (userId?: string, rawTerm = '') => {
  const term = normalizeSearchTerm(rawTerm)
  return useQuery({
    queryKey: crmQueryKeys.search(userId || 'anonymous', term),
    queryFn: () => searchWorkspace(userId!, term),
    enabled: Boolean(userId && term.length >= 2),
    staleTime: 60_000,
  })
}
