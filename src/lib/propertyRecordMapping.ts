import type { Property } from '../types'

export type PropertyUpsertInput = {
  address: string
  listingType: 'sale' | 'rent'
  workStream: 'active' | 'cold'
  propertyType: string
  sourceUrl: string
  price: number | undefined
  rooms: number | undefined
  area: number | undefined
  floor: number | undefined
  totalFloors: number | undefined
  status: Property['status']
  ownerId: string
  tags: string[]
  description: string
  constructionYear: number | undefined
  repair: string
  balcony: boolean
  elevator: boolean
  parking: boolean
  heating: string
  walls: string
}

export const propertyFromInput = (
  userId: string,
  id: string,
  input: PropertyUpsertInput,
  previous?: Property,
): Property => {
  const now = new Date().toISOString()
  return {
    id,
    userId,
    address: input.address.trim(),
    listingType: input.listingType,
    workStream: input.workStream,
    propertyType: input.propertyType || undefined,
    sourceUrl: input.sourceUrl || undefined,
    price: input.price,
    rooms: input.rooms,
    area: input.area,
    floor: input.floor,
    totalFloors: input.totalFloors,
    status: input.status,
    ownerId: input.ownerId || undefined,
    tags: input.tags,
    description: input.description || undefined,
    constructionYear: input.constructionYear,
    repair: input.repair || undefined,
    balcony: input.balcony,
    elevator: input.elevator,
    parking: input.parking,
    heating: input.heating || undefined,
    walls: input.walls || undefined,
    isFavorite: previous?.isFavorite ?? false,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    photos: previous?.photos || [],
    documents: previous?.documents || [],
    notes: previous?.notes || [],
    coverUrl: previous?.coverUrl,
  }
}
