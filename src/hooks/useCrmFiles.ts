import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createSignedFileUrls,
  deleteCrmFile,
  listCrmFiles,
  mapWithConcurrency,
  optimizeImageForUpload,
  setPrimaryPropertyImage,
  uploadCrmFile,
  type CrmBucket,
  type CrmFileRecord,
} from '../lib/files'
import { crmQueryKeys, queryClient } from '../lib/queryClient'

type FileScope = {
  userId?: string
  bucket: CrmBucket
  clientId?: string
  propertyId?: string
  withUrls?: boolean
}

export type CrmFileView = CrmFileRecord & { signedUrl?: string }
type FileContext = { previous?: CrmFileView[] }

const sortFiles = (files: CrmFileView[]) => [...files].sort((left, right) => {
  if (left.is_primary !== right.is_primary) return left.is_primary ? -1 : 1
  return right.created_at.localeCompare(left.created_at)
})

const addUrls = async (files: CrmFileRecord[], withUrls: boolean): Promise<CrmFileView[]> => {
  if (!withUrls) return files
  const urls = await createSignedFileUrls(files)
  return files.map(file => ({ ...file, signedUrl: urls.get(file.storage_path) }))
}

export const useCrmFiles = ({ userId, bucket, clientId, propertyId, withUrls = false }: FileScope) => {
  const queryKey = crmQueryKeys.files(userId || 'anonymous', bucket, clientId || '', propertyId || '', withUrls)
  const query = useQuery<CrmFileView[]>({
    queryKey,
    queryFn: async () => addUrls(await listCrmFiles({ userId: userId!, bucket, clientId, propertyId }), withUrls),
    enabled: Boolean(userId),
    staleTime: 2 * 60_000,
  })

  const beginOptimisticUpdate = async (updater: (files: CrmFileView[]) => CrmFileView[]): Promise<FileContext> => {
    await queryClient.cancelQueries({ queryKey })
    const previous = queryClient.getQueryData<CrmFileView[]>(queryKey)
    queryClient.setQueryData<CrmFileView[]>(queryKey, current => sortFiles(updater(current || [])))
    return { previous }
  }
  const restore = (context?: FileContext) => {
    if (!context) return
    if (context.previous) queryClient.setQueryData(queryKey, context.previous)
    else queryClient.removeQueries({ queryKey, exact: true })
  }
  const refreshRelated = async () => {
    if (!userId) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['crm', userId, 'files'] }),
      queryClient.invalidateQueries({ queryKey: crmQueryKeys.gallery(userId) }),
      bucket === 'crm-images' ? queryClient.invalidateQueries({ queryKey: crmQueryKeys.properties(userId) }) : Promise.resolve(),
    ])
  }

  const uploadMutation = useMutation({
    mutationFn: async ({ selected, category, optimizeImages }: { selected: File[]; category: string; optimizeImages: boolean }) => {
      const uploaded = await mapWithConcurrency(selected, 3, async original => {
        const file = optimizeImages ? await optimizeImageForUpload(original) : original
        return uploadCrmFile({ userId: userId!, bucket, clientId, propertyId, category, file })
      })
      return addUrls(uploaded, withUrls)
    },
    onSuccess: uploaded => queryClient.setQueryData<CrmFileView[]>(queryKey, current => {
      const merged = new Map((current || []).map(file => [file.id, file]))
      uploaded.forEach(file => merged.set(file.id, file))
      return sortFiles(Array.from(merged.values()))
    }),
    onSettled: refreshRelated,
  })

  const primaryMutation = useMutation({
    mutationFn: setPrimaryPropertyImage,
    onMutate: file => beginOptimisticUpdate(files => files.map(item => ({ ...item, is_primary: item.id === file.id }))),
    onError: (_error, _variables, context) => restore(context),
    onSettled: refreshRelated,
  })

  const removeMutation = useMutation({
    mutationFn: deleteCrmFile,
    onMutate: file => beginOptimisticUpdate(files => files.filter(item => item.id !== file.id)),
    onError: (_error, _variables, context) => restore(context),
    onSettled: refreshRelated,
  })

  return {
    ...query,
    uploadFiles: (selected: File[], category: string, optimizeImages = false) => uploadMutation.mutateAsync({ selected, category, optimizeImages }),
    setPrimary: primaryMutation.mutateAsync,
    removeFile: removeMutation.mutateAsync,
    uploading: uploadMutation.isPending,
    mutationPending: uploadMutation.isPending || primaryMutation.isPending || removeMutation.isPending,
  }
}
