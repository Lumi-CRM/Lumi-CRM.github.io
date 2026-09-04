import type { Property } from '../types'

export const dealPropertyOptions = (properties: Property[], currentPropertyId?: string) =>
  properties.filter(property => property.status !== 'archived' || property.id === currentPropertyId)
