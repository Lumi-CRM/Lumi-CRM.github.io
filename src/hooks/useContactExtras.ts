import { useMutation, useQuery } from '@tanstack/react-query'
import { deleteContactPoint, deleteContactRelationship, fetchContactExtras, saveContactPoint, saveContactRelationship } from '../lib/contactExtras'
import type { ContactPointKind } from '../lib/contactExtrasMapping'
import { crmQueryKeys, queryClient } from '../lib/queryClient'

export const useContactExtras = (userId?: string, clientId?: string) => {
  const queryKey = crmQueryKeys.contactExtras(userId || 'anonymous', clientId || 'unknown')
  const query = useQuery({ queryKey, queryFn: () => fetchContactExtras(userId!, clientId!), enabled: Boolean(userId && clientId), staleTime: 60_000 })
  const refresh = () => queryClient.invalidateQueries({ queryKey })
  const pointMutation = useMutation({ mutationFn: ({ kind, value, label }: { kind: ContactPointKind; value: string; label: string }) => saveContactPoint(userId!, clientId!, kind, value, label), onSettled: refresh })
  const removePointMutation = useMutation({ mutationFn: (id: string) => deleteContactPoint(userId!, id), onSettled: refresh })
  const relationMutation = useMutation({ mutationFn: ({ targetClientId, relationship }: { targetClientId: string; relationship: string }) => saveContactRelationship(userId!, clientId!, targetClientId, relationship), onSettled: refresh })
  const removeRelationMutation = useMutation({ mutationFn: (id: string) => deleteContactRelationship(userId!, id), onSettled: refresh })
  return {
    ...query,
    addPoint: pointMutation.mutateAsync,
    removePoint: removePointMutation.mutateAsync,
    addRelationship: relationMutation.mutateAsync,
    removeRelationship: removeRelationMutation.mutateAsync,
    mutationPending: pointMutation.isPending || removePointMutation.isPending || relationMutation.isPending || removeRelationMutation.isPending,
  }
}
