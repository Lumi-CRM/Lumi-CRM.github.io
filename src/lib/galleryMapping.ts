import type { CrmFileRecord } from './files'

export type GalleryPropertyRow = {
  id: string
  address?: string | null
  created_at?: string | null
}

export type PropertyFolder = {
  id: string
  address: string
  createdAt: string
  imageCount: number
}

export const buildPropertyFolders = (
  properties: GalleryPropertyRow[],
  images: Pick<CrmFileRecord, 'property_id'>[],
): PropertyFolder[] => {
  const counts = images.reduce<Record<string, number>>((result, item) => {
    if (item.property_id) result[item.property_id] = (result[item.property_id] || 0) + 1
    return result
  }, {})
  return properties.map(property => ({
    id: property.id,
    address: property.address || 'Объект без адреса',
    createdAt: property.created_at || '',
    imageCount: counts[property.id] || 0,
  }))
}
