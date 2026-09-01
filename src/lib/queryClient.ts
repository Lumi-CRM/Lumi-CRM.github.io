import { QueryClient } from '@tanstack/react-query'

export const crmQueryKeys = {
  root: ['crm'] as const,
  overview: (userId: string) => ['crm', userId, 'overview'] as const,
  contacts: (userId: string) => ['crm', userId, 'contacts'] as const,
  clientRecords: (userId: string) => ['crm', userId, 'client-records'] as const,
  clientRequirement: (userId: string, clientId: string, purpose: string) => ['crm', userId, 'client-requirement', clientId, purpose] as const,
  properties: (userId: string) => ['crm', userId, 'properties'] as const,
  propertyDetails: (userId: string, propertyId: string) => ['crm', userId, 'property-details', propertyId] as const,
  files: (userId: string, bucket: string, clientId: string, propertyId: string, withUrls: boolean) => ['crm', userId, 'files', bucket, clientId, propertyId, withUrls ? 'with-urls' : 'records'] as const,
  gallery: (userId: string) => ['crm', userId, 'gallery'] as const,
  propertyShowings: (userId: string, propertyId: string) => ['crm', userId, 'property-showings', propertyId] as const,
  search: (userId: string, term: string) => ['crm', userId, 'search', term] as const,
  tasks: (userId: string) => ['crm', userId, 'tasks'] as const,
  events: (userId: string) => ['crm', userId, 'events'] as const,
  calls: (userId: string) => ['crm', userId, 'calls'] as const,
  deals: (userId: string) => ['crm', userId, 'deals'] as const,
  monthlyPlan: (userId: string) => ['crm', userId, 'monthly-plan'] as const,
  planActuals: (userId: string) => ['crm', userId, 'plan-actuals'] as const,
  archive: (userId: string) => ['crm', userId, 'archive'] as const,
  favorites: (userId: string) => ['crm', userId, 'favorites'] as const,
  trash: (userId: string) => ['crm', userId, 'trash'] as const,
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 45_000,
      gcTime: 30 * 60_000,
      networkMode: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount) => navigator.onLine && failureCount < 1,
    },
    mutations: {
      networkMode: 'always',
      retry: false,
    },
  },
})

let bridgeInstalled = false
let invalidationTimer = 0

export const installCrmQueryInvalidationBridge = () => {
  if (bridgeInstalled || typeof window === 'undefined') return
  bridgeInstalled = true

  const invalidate = () => {
    window.clearTimeout(invalidationTimer)
    invalidationTimer = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: crmQueryKeys.root, refetchType: 'active' })
    }, 120)
  }

  window.addEventListener('online', invalidate)
  window.addEventListener('lumicrm:data-synced', invalidate)
  window.addEventListener('lumicrm:remote-data-changed', invalidate)
  window.addEventListener('lumicrm:workspace-refreshed', invalidate)
}
