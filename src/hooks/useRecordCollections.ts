import { useMutation, useQuery } from '@tanstack/react-query'
import { clearTrashItems, fetchArchiveRecords, fetchFavoriteRecords, fetchTrashItems, removeFavoriteRecord, removeTrashItem, restoreArchivedRecord, restoreTrashItem, trashArchivedRecord, type ArchiveRecordKind, type FavoriteRecords } from '../lib/recordCollections'
import type { ArchiveRecords, TrashItem } from '../lib/recordCollectionMapping'
import { crmQueryKeys, queryClient } from '../lib/queryClient'

const refreshWorkspace = () => queryClient.invalidateQueries({ queryKey: crmQueryKeys.root, refetchType: 'active' })

const removeArchiveEntry = (records: ArchiveRecords, kind: ArchiveRecordKind, id: string): ArchiveRecords => kind === 'property'
  ? { ...records, properties: records.properties.filter(item => item.id !== id) }
  : { ...records, clients: records.clients.filter(item => item.id !== id) }

const removeFavoriteEntry = (records: FavoriteRecords, kind: ArchiveRecordKind, id: string): FavoriteRecords => kind === 'property'
  ? { ...records, properties: records.properties.filter(item => item.id !== id) }
  : { ...records, clients: records.clients.filter(item => item.id !== id) }

export const useArchiveRecords = (userId?: string) => {
  const queryKey = crmQueryKeys.archive(userId || 'anonymous')
  const query = useQuery<ArchiveRecords>({
    queryKey,
    queryFn: () => fetchArchiveRecords(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
  const mutate = useMutation({
    mutationFn: ({ action, kind, id }: { action: 'restore' | 'trash'; kind: ArchiveRecordKind; id: string }) => action === 'restore'
      ? restoreArchivedRecord(userId!, kind, id)
      : trashArchivedRecord(userId!, kind, id),
    onMutate: async ({ kind, id }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ArchiveRecords>(queryKey)
      if (previous) queryClient.setQueryData(queryKey, removeArchiveEntry(previous, kind, id))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: refreshWorkspace,
  })
  return {
    ...query,
    restoreRecord: (kind: ArchiveRecordKind, id: string) => mutate.mutateAsync({ action: 'restore', kind, id }),
    trashRecord: (kind: ArchiveRecordKind, id: string) => mutate.mutateAsync({ action: 'trash', kind, id }),
    mutationPending: mutate.isPending,
  }
}

export const useFavoriteRecords = (userId?: string) => {
  const queryKey = crmQueryKeys.favorites(userId || 'anonymous')
  const query = useQuery<FavoriteRecords>({
    queryKey,
    queryFn: () => fetchFavoriteRecords(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
  const removeMutation = useMutation({
    mutationFn: ({ kind, id }: { kind: ArchiveRecordKind; id: string }) => removeFavoriteRecord(userId!, kind, id),
    onMutate: async ({ kind, id }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<FavoriteRecords>(queryKey)
      if (previous) queryClient.setQueryData(queryKey, removeFavoriteEntry(previous, kind, id))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: refreshWorkspace,
  })
  return {
    ...query,
    removeFavorite: (kind: ArchiveRecordKind, id: string) => removeMutation.mutateAsync({ kind, id }),
    mutationPending: removeMutation.isPending,
  }
}

export const useTrashRecords = (userId?: string) => {
  const queryKey = crmQueryKeys.trash(userId || 'anonymous')
  const query = useQuery<TrashItem[]>({
    queryKey,
    queryFn: () => fetchTrashItems(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
  const mutate = useMutation({
    mutationFn: ({ action, item }: { action: 'restore' | 'remove'; item: TrashItem }) => action === 'restore'
      ? restoreTrashItem(userId!, item.table, item.id)
      : removeTrashItem(userId!, item.table, item.id),
    onMutate: async ({ item }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TrashItem[]>(queryKey)
      queryClient.setQueryData<TrashItem[]>(queryKey, current => (current || []).filter(entry => entry.id !== item.id || entry.table !== item.table))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: refreshWorkspace,
  })
  const clearMutation = useMutation({
    mutationFn: () => clearTrashItems(userId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TrashItem[]>(queryKey)
      queryClient.setQueryData<TrashItem[]>(queryKey, [])
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: refreshWorkspace,
  })
  return {
    ...query,
    restoreItem: (item: TrashItem) => mutate.mutateAsync({ action: 'restore', item }),
    removeItem: (item: TrashItem) => mutate.mutateAsync({ action: 'remove', item }),
    clearTrash: clearMutation.mutateAsync,
    mutationPending: mutate.isPending || clearMutation.isPending,
  }
}
