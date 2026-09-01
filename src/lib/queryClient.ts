import { QueryClient } from '@tanstack/react-query'

export const crmQueryKeys = {
  root: ['crm'] as const,
  overview: (userId: string) => ['crm', userId, 'overview'] as const,
  contacts: (userId: string) => ['crm', userId, 'contacts'] as const,
  properties: (userId: string) => ['crm', userId, 'properties'] as const,
  tasks: (userId: string) => ['crm', userId, 'tasks'] as const,
  events: (userId: string) => ['crm', userId, 'events'] as const,
  calls: (userId: string) => ['crm', userId, 'calls'] as const,
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
