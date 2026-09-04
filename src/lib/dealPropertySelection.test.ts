import test from 'node:test'
import assert from 'node:assert/strict'
import type { Property } from '../types'
import { dealPropertyOptions } from './dealPropertySelection.ts'

const property = (id: string, status: Property['status']): Property => ({
  id,
  userId: 'user-1',
  address: id,
  listingType: 'sale',
  workStream: 'active',
  status,
  tags: [],
  isFavorite: false,
  createdAt: '',
  updatedAt: '',
  photos: [],
  documents: [],
  notes: [],
})

test('keeps an archived property visible for its existing deal only', () => {
  const properties = [property('active', 'available'), property('archived', 'archived')]
  assert.deepEqual(dealPropertyOptions(properties).map(item => item.id), ['active'])
  assert.deepEqual(dealPropertyOptions(properties, 'archived').map(item => item.id), ['active', 'archived'])
})
