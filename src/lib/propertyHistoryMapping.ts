import type { PropertyStatus } from '../types'

export type PropertyHistoryKind = 'created' | 'price' | 'status' | 'price_status'

export type PropertyHistorySnapshot = {
  price?: number | null
  status: PropertyStatus
}

export type PropertyHistoryChange = {
  kind: PropertyHistoryKind
  oldPrice: number | null
  newPrice: number | null
  oldStatus: PropertyStatus | null
  newStatus: PropertyStatus
}

export type PropertyHistoryItem = PropertyHistoryChange & {
  id: string
  propertyId: string
  source: string
  createdAt: string
}

export type PropertyHistoryRow = {
  id: string
  property_id: string
  change_type: string
  old_price: number | string | null
  new_price: number | string | null
  old_status: string | null
  new_status: string
  source: string | null
  created_at: string
}

const priceValue = (value: unknown) => {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const statusValue = (value: unknown): PropertyStatus => value === 'reserved' || value === 'sold' || value === 'archived' ? value : 'available'

export const buildPropertyHistoryChange = (
  previous: PropertyHistorySnapshot | undefined,
  next: PropertyHistorySnapshot,
): PropertyHistoryChange | null => {
  const oldPrice = priceValue(previous?.price)
  const newPrice = priceValue(next.price)
  const newStatus = statusValue(next.status)
  if (!previous) return { kind: 'created', oldPrice: null, newPrice, oldStatus: null, newStatus }

  const oldStatus = statusValue(previous.status)
  const priceChanged = oldPrice !== newPrice
  const statusChanged = oldStatus !== newStatus
  if (!priceChanged && !statusChanged) return null
  return {
    kind: priceChanged && statusChanged ? 'price_status' : priceChanged ? 'price' : 'status',
    oldPrice,
    newPrice,
    oldStatus,
    newStatus,
  }
}

export const mapPropertyHistoryRow = (row: PropertyHistoryRow): PropertyHistoryItem => ({
  id: row.id,
  propertyId: row.property_id,
  kind: row.change_type === 'created' || row.change_type === 'price' || row.change_type === 'price_status' ? row.change_type : 'status',
  oldPrice: priceValue(row.old_price),
  newPrice: priceValue(row.new_price),
  oldStatus: row.old_status ? statusValue(row.old_status) : null,
  newStatus: statusValue(row.new_status),
  source: row.source || 'app',
  createdAt: row.created_at,
})

export const propertyStatusLabel = (status: PropertyStatus | null) => {
  if (status === 'reserved') return 'Забронирован'
  if (status === 'sold') return 'Продан'
  if (status === 'archived') return 'Архив'
  if (status === 'available') return 'В продаже'
  return 'Не указан'
}
